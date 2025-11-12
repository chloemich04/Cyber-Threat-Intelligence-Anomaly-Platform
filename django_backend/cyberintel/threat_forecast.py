"""
Cyber Threat Forecasting using Azure OpenAI GPT-5
Predicts threat spikes and expected counts for the United States over 4-week horizon
"""
import json
import pandas as pd
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from azure_langchain import get_azure_llm


# Forecast configuration
FORECAST_HORIZON_WEEKS = 4
SPIKE_THRESHOLD_PCT = 0.20  # 20% increase = spike
DEFAULT_TEMPERATURE = 0  # Deterministic for forecasting


def aggregate_weekly_worldwide(df: pd.DataFrame, date_column: str = 'timestamp') -> pd.DataFrame:
    """
    Aggregate threat data to weekly buckets for US analysis.
    Provides richer data by combining all threats globally per week.
    
    Args:
        df: DataFrame with columns: country_code, country_name, ip, cve_id, data (JSON), timestamp
        date_column: Name of the datetime column
    
    Returns:
        Aggregated DataFrame with weekly features
    """
    # Ensure date column is datetime
    df[date_column] = pd.to_datetime(df[date_column])
    
    # Create week_start column
    df['week_start'] = df[date_column].dt.to_period('W').apply(
        lambda r: r.start_time.date().isoformat()
    )
    
    # Helper to safely extract JSON fields
    def safe_json_get(series, field, default=None):
        def extract(x):
            if pd.isnull(x):
                return default
            try:
                return json.loads(x).get(field, default)
            except:
                return default
        return series.apply(extract)

    # Aggregate by week ONLY (US data - no country grouping needed)
    agg = df.groupby('week_start').agg(
        count_last_week=('cve_id', 'count'),
        mean_cvss=('data', lambda s: safe_json_get(s, 'cvss', 0).astype(float).mean()),
        unique_cves=('cve_id', lambda s: s.nunique()),
        unique_countries=('country_code', lambda s: s.nunique()),
        top_countries=('country_code', lambda s: s.value_counts().head(5).to_dict()),
        top_tags=('data', lambda s: [
            tag for x in s if pd.notnull(x) 
            for tag in json.loads(x).get('tags', [])
        ][:5] if len(s) > 0 else []),
        top_cves=('cve_id', lambda s: s.value_counts().head(5).to_dict()),
    ).reset_index()
    
    # Calculate 4-week rolling average
    agg = agg.sort_values('week_start')
    agg['count_4week_avg'] = agg['count_last_week'].rolling(window=4, min_periods=1).mean()
    
    # Calculate week-over-week growth rate
    agg['growth_rate'] = agg['count_last_week'].pct_change()
    
    return agg


def build_forecast_features(agg_df: pd.DataFrame, limit: int = 20) -> List[Dict[str, Any]]:
    """
    Convert aggregated DataFrame to compact feature records for LLM input.
    Uses US-only weekly data for analysis.
    
    Args:
        agg_df: Aggregated weekly data (US only)
        limit: Maximum number of weeks to include (more data = better predictions)
    
    Returns:
        List of feature dictionaries
    """
    records = []
    
    # Get the most recent weeks (use all available weeks up to limit)
    for _, row in agg_df.tail(limit).iterrows():
        # Extract top CVEs with details
        top_cves = []
        if isinstance(row['top_cves'], dict):
            for cve_id, count in list(row['top_cves'].items())[:5]:
                top_cves.append({
                    "id": cve_id,
                    "occurrences": int(count),
                    "cvss": round(row['mean_cvss'], 2)
                })
        
        # Extract top tags
        top_tags = row['top_tags'][:5] if isinstance(row['top_tags'], list) else []
        
        # Extract top countries
        top_countries = []
        if isinstance(row['top_countries'], dict):
            for country_code, count in list(row['top_countries'].items())[:5]:
                top_countries.append({
                    "code": country_code,
                    "threat_count": int(count)
                })
        
        record = {
            "region": "United States",
            "week_start": row['week_start'],
            "count_last_week": int(row['count_last_week']),
            "count_4week_avg": round(row['count_4week_avg'], 1),
            "growth_rate": round(row.get('growth_rate', 0), 3),
            "mean_cvss": round(row['mean_cvss'], 2),
            "unique_cves": int(row['unique_cves']),
            "unique_countries": int(row.get('unique_countries', 0)),
            "top_countries": top_countries,
            "top_tags": top_tags,
            "top_cves": top_cves
        }
        records.append(record)
    
    return records


def create_forecast_prompt(
    feature_records: List[Dict[str, Any]], 
    forecast_weeks: int = FORECAST_HORIZON_WEEKS
) -> str:
    """
    Build the user prompt for United States threat forecasting.
    
    Args:
        feature_records: List of aggregated feature dictionaries (weekly, US only)
        forecast_weeks: Number of weeks to forecast
    
    Returns:
        Formatted prompt string
    """
    prompt = f"""Input: aggregated United States threat intelligence records (weekly) for forecast_horizon_weeks = {forecast_weeks}.
Analyze US threat trends and provide forecasts for the next {forecast_weeks} weeks.

Historical Data (recent weeks - US only):
{json.dumps(feature_records, indent=2)}

Return JSON exactly following the schema with United States predictions for the NEXT {forecast_weeks} weeks."""
    
    return prompt


def get_threat_forecast(
    feature_records: List[Dict[str, Any]],
    temperature: float = DEFAULT_TEMPERATURE,
    max_tokens: int = 800
) -> Dict[str, Any]:
    """
    Call Azure OpenAI to get threat forecasts.
    
    Args:
        feature_records: Aggregated weekly features
        temperature: Model temperature (0 for deterministic)
        max_tokens: Maximum response tokens
    
    Returns:
        Parsed JSON forecast with predictions
    """
    # System message defining the task and output format
    system_message = """You are an expert cyber-threat forecaster analyzing United States threat intelligence data. Output MUST be valid JSON following the provided schema. Temperature is 0. Use only the supplied input features; do not invent external facts. 

For each weekly forecast, return:
- expected_count (integer): predicted number of threats in the United States
- expected_count_ci [lower, upper]: 90% confidence interval
- spike_probability (0..1): likelihood of significant threat spike
- top_signals: list of up to 5 signals (CVEs, countries, tags) driving the forecast with importance scores summing <=1
- explanation (2-3 sentences): reasoning based on historical trends, CVE patterns, and US threat landscape
- confidence (0..1): forecast confidence level

Keep output compact and machine-parseable.

Output schema:
{
  "forecast_horizon_weeks": 4,
  "predictions": [
    {
      "region": "United States",
      "week_start": "2025-11-10",
      "expected_count": 1250,
      "expected_count_ci": [1050, 1450],
      "spike_probability": 0.32,
      "spike_threshold_pct": 0.20,
      "top_signals": [
        {"signal_type":"cve","id":"CVE-2009-0796","score":0.34},
        {"signal_type":"tag","id":"cloud","score":0.21}
      ],
      "explanation": "Rising EPSS on older Apache CVEs and multiple recent scans from US infrastructure.",
      "confidence": 0.72
    }
  ],
  "metadata": {
    "model": "gpt-5-2025-01-01-preview",
    "temperature": 0,
    "aggregation_method": "weekly_count_us_only",
    "region_analyzed": "United States"
  }
}"""
    
    # User message with aggregated data
    user_message = create_forecast_prompt(feature_records)
    
    # Get LLM instance
    llm = get_azure_llm(temperature=temperature, max_tokens=max_tokens)
    
    # Create messages for chat
    messages = [
        {"role": "system", "content": system_message},
        {"role": "user", "content": user_message}
    ]
    
    # Invoke LLM
    from langchain_core.messages import HumanMessage, SystemMessage
    
    response = llm.invoke([
        SystemMessage(content=system_message),
        HumanMessage(content=user_message)
    ])
    
    # Extract content
    response_text = response.content if hasattr(response, 'content') else str(response)
    
    # Parse JSON response
    try:
        forecast_data = json.loads(response_text)
        return forecast_data
    except json.JSONDecodeError as e:
        # Try to extract JSON from markdown code blocks
        if "```json" in response_text:
            json_start = response_text.find("```json") + 7
            json_end = response_text.find("```", json_start)
            json_text = response_text[json_start:json_end].strip()
            return json.loads(json_text)
        else:
            raise ValueError(f"Failed to parse JSON response: {e}\nResponse: {response_text[:500]}")


def forecast_threats(
    df: pd.DataFrame,
    date_column: str = 'timestamp',
    weeks_of_history: int = 20,
    forecast_weeks: int = FORECAST_HORIZON_WEEKS
) -> Dict[str, Any]:
    """
    End-to-end United States threat forecasting pipeline.
    
    Args:
        df: Raw threat data DataFrame (US only)
        date_column: Name of timestamp column
        weeks_of_history: Number of historical weeks to include (more data = better predictions)
        forecast_weeks: Forecast horizon in weeks
    
    Returns:
        Complete forecast results with US predictions
    """
    # Step 1: Aggregate data (US only)
    print("Aggregating data by week (United States analysis)...")
    agg_df = aggregate_weekly_worldwide(df, date_column)
    print(f"  → {len(agg_df)} weekly records (US only)")
    
    # Step 2: Build feature records (use more historical weeks)
    print(f"Building feature records (using {weeks_of_history} weeks of history)...")
    feature_records = build_forecast_features(agg_df, limit=weeks_of_history)
    print(f"  → {len(feature_records)} weeks of US data prepared for AI analysis")
    
    # Step 3: Get forecast from LLM
    print("Calling Azure OpenAI GPT-5 for United States forecast...")
    forecast_result = get_threat_forecast(feature_records, max_tokens=1500)
    print(f"  → Received {len(forecast_result.get('predictions', []))} weekly predictions for United States")
    
    return forecast_result


def save_forecast_results(forecast_data: Dict[str, Any], output_path: str):
    """Save forecast results to JSON file."""
    with open(output_path, 'w') as f:
        json.dump(forecast_data, f, indent=2)
    print(f"Results saved to: {output_path}")


if __name__ == "__main__":
    print("Cyber Threat Forecasting Module")
    print("="*50)
    print("Usage:")
    print("  from threat_forecast import forecast_threats")
    print("  results = forecast_threats(df)")
