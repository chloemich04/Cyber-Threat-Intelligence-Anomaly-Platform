"""
Cyber Threat Forecasting using Azure OpenAI GPT-5
Predicts threat spikes and expected counts for the United States over 4-week horizon
"""
import json
import os
import pandas as pd
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from azure_langchain import get_azure_llm

# Optional exact tokenizer (tiktoken) to compute precise token counts. Falls back
# to a heuristic (1 token ~= 4 chars) when unavailable.
try:
    import tiktoken

    def count_tokens(text: str, model: str = None) -> int:
        try:
            if model:
                enc = tiktoken.encoding_for_model(model)
            else:
                enc = tiktoken.get_encoding('cl100k_base')
        except Exception:
            enc = tiktoken.get_encoding('cl100k_base')
        return len(enc.encode(text))
except Exception:
    def count_tokens(text: str, model: str = None) -> int:
        # Fallback heuristic
        return max(1, int(len(text) / 4))


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
    forecast_weeks: int = FORECAST_HORIZON_WEEKS,
    compact: bool = False,
) -> str:
    """
    Build the user prompt for United States threat forecasting.
    
    Args:
        feature_records: List of aggregated feature dictionaries (weekly, US only)
        forecast_weeks: Number of weeks to forecast
    
    Returns:
        Formatted prompt string
    """
    # Use compact JSON when trying to meet tight token budgets
    if compact:
        data_json = json.dumps(feature_records, separators=(',', ':'), ensure_ascii=False)
    else:
        data_json = json.dumps(feature_records, indent=2, ensure_ascii=False)

    prompt = (
        f"Input: aggregated United States threat intelligence records (weekly) for forecast_horizon_weeks = {forecast_weeks}.\n"
        f"Analyze US threat trends and provide forecasts for the next {forecast_weeks} weeks.\n\n"
        f"Historical Data (recent weeks - US only):\n"
        f"{data_json}\n\n"
        f"Return JSON exactly following the schema with United States predictions for the NEXT {forecast_weeks} weeks."
    )
    
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
    try:
        from django.conf import settings
        include_explanation = getattr(settings, 'LLM_INCLUDE_EXPLANATION', False)
    except Exception:
        include_explanation = False

    # Base instruction
    system_message = (
        "You are an expert cyber-threat forecaster analyzing United States threat intelligence data. "
        "Output MUST be valid JSON following the provided schema. Temperature is 0. Use only the supplied input features; do not invent external facts.\n\n"
    )

    system_message += (
        "For each weekly forecast, return:\n"
        "- expected_count (integer): predicted number of threats in the United States\n"
        "- expected_count_ci [lower, upper]: 90% confidence interval\n"
        "- spike_probability (0..1): likelihood of significant threat spike\n"
        "- top_signals: list of up to 5 signals (CVEs, countries, tags) driving the forecast with importance scores summing <=1\n"
    )

    if include_explanation:
        system_message += "- explanation (brief): 1-2 short sentences max (optional)\n"

    system_message += "- confidence (0..1): forecast confidence level\n\n"

    # Additional strict rules to reduce output size and avoid extra fields
    system_message += (
        "Strict rules:\n"
        "- Do NOT include any 'revision', 'notes', or free-form commentary fields.\n"
        "- Do NOT include a 'region' field in the prediction objects; assume the analyzed region is United States.\n"
        "- Do NOT include the 'explanation' field unless explicitly requested (LLM_INCLUDE_EXPLANATION=True).\n"
        "- Return only the JSON described (no preface, no markdown, no surrounding text).\n\n"
    )

    system_message += (
        "Additionally, include the following top-level summary fields in the returned JSON:\n"
        "- predicted_threat_types: list of objects describing the model's predicted threat-type distribution for the forecast horizon. Each object should be {\"threat_type\":\"<name>\", \"probability\":0.0} where probabilities sum to <= 1.\n"
        "- monthly_predicted_attacks: integer — a friendly single-number estimate for the expected number of attacks across the next 4 weeks (rounded integer).\n"
        "- key_signals_user_friendly: list of up to 8 human-friendly signal descriptors (label, type, score) that the UI can display as chips. Example: {\"label\":\"CVE-2024-1234 (Remote Code Execution)\", \"type\":\"cve\", \"score\":0.34}.\n\n"
    )

    system_message += "Keep output compact and machine-parseable.\n\n"
    # Instruct the model to anchor forecasts to upcoming weeks (from today) to avoid using historical dates
    system_message += (
        "When assigning 'week_start' values in the predictions, use upcoming calendar week start dates beginning from today's UTC date. "
        "Do NOT base the output week_start values on historical input timestamps.\n\n"
    )

    # Example output schema (compact). Omit 'explanation' from the example when not requested.
    example_prediction = (
        '{\n'
        '  "forecast_horizon_weeks": 4,\n'
        '  "predictions": [\n'
        '    {\n'
        '      "week_start": "2025-11-10",\n'
        '      "expected_count": 1250,\n'
        '      "expected_count_ci": [1050, 1450],\n'
        '      "spike_probability": 0.32,\n'
        '      "spike_threshold_pct": 0.20,\n'
        '      "top_signals": [\n'
        '        {"signal_type":"cve","id":"CVE-2009-0796","score":0.34},\n'
        '        {"signal_type":"tag","id":"cloud","score":0.21}\n'
        '      ],\n'
    )

    if include_explanation:
        example_prediction += '      "explanation": "Rising EPSS on older Apache CVEs and multiple recent scans.",\n'

    example_prediction += '      "confidence": 0.72\n    }\n  ],\n'
    example_prediction += '  "predicted_threat_types": [ {"threat_type":"Injection","probability":0.32} ],\n'
    example_prediction += '  "monthly_predicted_attacks": 1250,\n'
    example_prediction += '  "key_signals_user_friendly": [ {"label":"CVE-2009-0796 (RCE)", "type":"cve", "score":0.34} ],\n'
    example_prediction += '  "metadata": { "model": "gpt-5-2025-01-01-preview", "temperature": 0, "aggregation_method": "weekly_count_us_only", "region_analyzed": "United States" }\n}'

    system_message += example_prediction

    # User message with aggregated data
    user_message = create_forecast_prompt(feature_records)

    # Get LLM instance
    llm = get_azure_llm(temperature=temperature, max_tokens=max_tokens)

    # Invoke LLM via langchain message wrapper
    from langchain_core.messages import HumanMessage, SystemMessage

    response = llm.invoke([
        SystemMessage(content=system_message),
        HumanMessage(content=user_message)
    ])

    # Extract content
    response_text = response.content if hasattr(response, 'content') else str(response)

    # Parse JSON response (with robust fallbacks to tolerate common formatting issues)
    try:
        # First attempt: strict JSON
        forecast_data = json.loads(response_text)
    except Exception as e:
        # Helper: try to extract a fenced code block first
        def try_fenced(text: str) -> Optional[str]:
            if "```json" in text:
                start = text.find("```json") + 7
                end = text.find("```", start)
                if end != -1:
                    return text[start:end].strip()
            # try any fenced block
            if "```" in text:
                start = text.find("```") + 3
                end = text.find("```", start)
                if end != -1:
                    return text[start:end].strip()
            return None

        json_text = try_fenced(response_text)

        # If no fenced JSON, try to extract the first balanced {...} block ignoring braces inside strings
        def extract_first_braced(s: str) -> Optional[str]:
            start = None
            depth = 0
            in_string = False
            esc = False
            quote_char = None
            for i, ch in enumerate(s):
                if start is None:
                    if ch == '{':
                        start = i
                        depth = 1
                        continue
                else:
                    if esc:
                        esc = False
                        continue
                    if ch == '\\':
                        esc = True
                        continue
                    if in_string:
                        if ch == quote_char:
                            in_string = False
                            quote_char = None
                        continue
                    else:
                        if ch == '"' or ch == "'":
                            in_string = True
                            quote_char = ch
                            continue
                        if ch == '{':
                            depth += 1
                        elif ch == '}':
                            depth -= 1
                            if depth == 0:
                                return s[start:i+1]
            return None

        if not json_text:
            json_text = extract_first_braced(response_text)

        parsed = None
        if json_text:
            # Try strict JSON parse first
            try:
                parsed = json.loads(json_text)
            except Exception:
                # Try Python literal evaluation (accepts single quotes)
                try:
                    import ast
                    parsed = ast.literal_eval(json_text)
                except Exception:
                    # As a next fallback, try to extract the largest balanced {...} substring
                    def find_largest_balanced(s: str) -> Optional[str]:
                        starts = []
                        results = []
                        in_string = False
                        esc = False
                        quote_char = None
                        depth = 0
                        for i, ch in enumerate(s):
                            if esc:
                                esc = False
                                continue
                            if ch == '\\':
                                esc = True
                                continue
                            if in_string:
                                if ch == quote_char:
                                    in_string = False
                                    quote_char = None
                                continue
                            else:
                                if ch == '"' or ch == "'":
                                    in_string = True
                                    quote_char = ch
                                    continue
                                if ch == '{':
                                    if depth == 0:
                                        starts.append(i)
                                    depth += 1
                                elif ch == '}':
                                    depth -= 1
                                    if depth < 0:
                                        depth = 0
                                    if depth == 0 and starts:
                                        start = starts.pop(0)
                                        results.append(s[start:i+1])
                        # Return the longest balanced block if any
                        if results:
                            return max(results, key=len)
                        return None

                    balanced = find_largest_balanced(response_text)
                    if balanced:
                        try:
                            parsed = json.loads(balanced)
                        except Exception:
                            try:
                                import ast
                                parsed = ast.literal_eval(balanced)
                            except Exception:
                                parsed = None
                    else:
                        # As a last resort, attempt relaxed fixes: remove trailing commas and convert single->double quotes
                        import re
                        cleaned = re.sub(r",\s*([}\]])", r"\1", json_text)
                        try:
                            parsed = json.loads(cleaned)
                        except Exception:
                            try:
                                cleaned2 = cleaned.replace("'", '"')
                                parsed = json.loads(cleaned2)
                            except Exception:
                                parsed = None

        if parsed is None:
            # As a last-ditch attempt, try to auto-close truncated JSON by appending
            # missing closing brackets/braces and removing trailing commas.
            def autoclose_and_clean(s: str) -> Optional[str]:
                import re

                # Remove common leading/trailing markdown fences if present
                if s.strip().startswith('```'):
                    # strip fence markers
                    s = re.sub(r"^```[a-zA-Z]*\n", '', s)
                    s = s.rsplit('```', 1)[0]

                # Remove trailing commas before closing brackets/braces
                s = re.sub(r",\s*(\]|\})", r"\1", s)

                # Count bracket and brace depth while ignoring strings
                brace_depth = 0
                bracket_depth = 0
                in_string = False
                esc = False
                quote_char = None
                for ch in s:
                    if esc:
                        esc = False
                        continue
                    if ch == '\\':
                        esc = True
                        continue
                    if in_string:
                        if ch == quote_char:
                            in_string = False
                            quote_char = None
                        continue
                    if ch == '"' or ch == "'":
                        in_string = True
                        quote_char = ch
                        continue
                    if ch == '{':
                        brace_depth += 1
                    elif ch == '}':
                        brace_depth = max(0, brace_depth - 1)
                    elif ch == '[':
                        bracket_depth += 1
                    elif ch == ']':
                        bracket_depth = max(0, bracket_depth - 1)

                # Append missing closers
                closers = ']' * bracket_depth + '}' * brace_depth
                candidate = s + closers if closers else s

                # Try to parse candidate
                try:
                    json.loads(candidate)
                    return candidate
                except Exception:
                    # Try replacing single quotes with double quotes as fallback
                    candidate2 = candidate.replace("'", '"')
                    try:
                        json.loads(candidate2)
                        return candidate2
                    except Exception:
                        return None

            closed = autoclose_and_clean(json_text or response_text)
            if closed:
                try:
                    parsed = json.loads(closed)
                except Exception:
                    try:
                        import ast
                        parsed = ast.literal_eval(closed)
                    except Exception:
                        parsed = None

        if parsed is None:
            # Save raw response to disk for inspection and debugging
            try:
                resp_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'llm_responses')
                os.makedirs(resp_dir, exist_ok=True)
                ts = datetime.utcnow().strftime('%Y%m%dT%H%M%SZ')
                fname = os.path.join(resp_dir, f'response_{ts}.txt')
                with open(fname, 'w', encoding='utf-8') as fh:
                    fh.write(response_text)
                snippet = response_text[:2000]
                raise ValueError(
                    f"Failed to parse JSON response from LLM. Last error: {e}\n"
                    f"Raw response saved to: {fname}\nResponse snippet:\n{snippet}"
                )
            except Exception:
                snippet = response_text[:2000]
                raise ValueError(f"Failed to parse JSON response from LLM and could not save raw response. Last error: {e}\nResponse snippet:\n{snippet}")

        forecast_data = parsed

    # Post-process and ensure new fields exist (fallbacks) so frontend can rely on them
    # 1) monthly_predicted_attacks: if LLM didn't provide, sum expected_count across predictions
    if 'monthly_predicted_attacks' not in forecast_data:
        try:
            preds = forecast_data.get('predictions', [])
            # sum expected_count across available predictions (use int fallback)
            monthly = sum(int(p.get('expected_count', 0)) for p in preds[:4])
        except Exception:
            monthly = 0
        forecast_data['monthly_predicted_attacks'] = monthly

    # 2) predicted_threat_types: if missing, try to infer from top_signals or leave empty list
    if 'predicted_threat_types' not in forecast_data:
        # Aggregate top_signals across predictions into simple threat-type buckets if possible
        agg_types = {}
        for p in forecast_data.get('predictions', []):
            for s in p.get('top_signals', []):
                # signals may be tags or CVEs — use tag id as proxy for type
                s_type = s.get('signal_type')
                s_id = s.get('id')
                key = None
                if s_type == 'tag' and s_id:
                    key = s_id.title()
                elif s_type == 'cve' and s_id:
                    # treat CVEs as 'CVE' for types fallback
                    key = 'CVE'
                elif s_type:
                    key = s_type.title()
                if key:
                    agg_types[key] = agg_types.get(key, 0) + float(s.get('score', 0))
        # Normalize into probabilities
        total = sum(agg_types.values())
        predicted = []
        if total > 0:
            for k, v in sorted(agg_types.items(), key=lambda x: x[1], reverse=True):
                predicted.append({'threat_type': k, 'probability': round(v / total, 3)})
        forecast_data['predicted_threat_types'] = predicted

    # 3) key_signals_user_friendly: concat and dedupe top_signals into readable labels
    if 'key_signals_user_friendly' not in forecast_data:
        signal_map = {}
        for p in forecast_data.get('predictions', []):
            for s in p.get('top_signals', []):
                key = (s.get('signal_type'), s.get('id'))
                score = float(s.get('score', 0))
                if key in signal_map:
                    signal_map[key]['score'] += score
                else:
                    label = s.get('id') or s.get('signal_type')
                    # Make simple labels like 'CVE-xxxx (cve)' or tag
                    if s.get('signal_type') == 'cve' and s.get('id'):
                        label = f"{s.get('id')}"
                    elif s.get('signal_type') == 'tag' and s.get('id'):
                        label = s.get('id').replace('-', ' ').title()
                    signal_map[key] = {'label': label, 'type': s.get('signal_type'), 'score': score}
        # Convert to list sorted by score
        key_signals = sorted(signal_map.values(), key=lambda x: x['score'], reverse=True)[:8]
        # normalize scores to sum <=1
        ssum = sum(x['score'] for x in key_signals) or 1
        for x in key_signals:
            x['score'] = round(x['score'] / ssum, 3)
        forecast_data['key_signals_user_friendly'] = key_signals

    # Force-correct week_start values to be the next N weeks from today (UTC) so UI always shows upcoming weeks
    try:
        today = datetime.utcnow().date()
        preds = forecast_data.get('predictions', [])
        for i, p in enumerate(preds):
            try:
                p['week_start'] = (today + timedelta(weeks=i)).isoformat()
            except Exception:
                # ignore if mutation fails
                pass
        # update metadata with generation timestamp
        meta = forecast_data.get('metadata', {})
        meta['forecast_generated_at_utc'] = datetime.utcnow().isoformat()
        forecast_data['metadata'] = meta
    except Exception:
        # non-fatal: return what we have
        pass

    return forecast_data


def estimate_prompt_and_cost(feature_records: List[Dict[str, Any]], forecast_weeks: int = FORECAST_HORIZON_WEEKS,
                             expected_output_tokens: int = 500, price_per_1k: float = 0.03,
                             compact: bool = False) -> Dict[str, Any]:
    """
    Estimate token usage and cost for a forecast prompt based on feature_records.
    Uses a rough heuristic: 1 token ~= 4 characters.

    Returns a dict with estimated input_tokens, output_tokens, and estimated_cost_usd.
    """
    prompt = create_forecast_prompt(feature_records, forecast_weeks, compact=compact)
    # exact token estimate when tokenizer is available, otherwise heuristic
    try:
        input_tokens = count_tokens(prompt)
    except Exception:
        input_tokens = max(1, int(len(prompt) / 4))
    input_chars = len(prompt)

    output_tokens = int(expected_output_tokens)

    total_tokens = input_tokens + output_tokens
    estimated_cost = (total_tokens / 1000.0) * float(price_per_1k)

    return {
        'input_chars': input_chars,
        'estimated_input_tokens': input_tokens,
        'estimated_output_tokens': output_tokens,
        'estimated_total_tokens': total_tokens,
        'estimated_cost_usd': round(estimated_cost, 6)
    }


def compress_feature_records(feature_records: List[Dict[str, Any]], max_input_tokens: int,
                             forecast_weeks: int = FORECAST_HORIZON_WEEKS,
                             keep_recent_weeks: int = 6) -> List[Dict[str, Any]]:
    """
    Reduce the size of feature_records to fit within max_input_tokens.
    Strategy:
      - Keep the most recent `keep_recent_weeks` records unchanged (they carry the most signal).
      - Combine older records into a single summarized record that aggregates counts and top items.
      - Trim lists (top_cves/top_tags/top_countries) to small sizes.

    This is a best-effort lossy compression to drastically reduce prompt size.
    """
    if not feature_records:
        return feature_records

    # If number of records is already small, just trim per-record lists
    if len(feature_records) <= keep_recent_weeks + 1:
        out = []
        for r in feature_records:
            r2 = dict(r)
            if 'top_cves' in r2 and isinstance(r2['top_cves'], list):
                r2['top_cves'] = r2['top_cves'][:3]
            if 'top_tags' in r2 and isinstance(r2['top_tags'], list):
                r2['top_tags'] = r2['top_tags'][:5]
            if 'top_countries' in r2 and isinstance(r2['top_countries'], list):
                r2['top_countries'] = r2['top_countries'][:3]
            out.append(r2)
        return out

    recent = feature_records[-keep_recent_weeks:]
    older = feature_records[:-keep_recent_weeks]

    # Aggregate numeric fields for older records
    agg_count = sum(r.get('count_last_week', 0) for r in older)
    agg_mean_cvss = float(sum(r.get('mean_cvss', 0.0) for r in older) / max(1, len(older)))
    agg_unique_cves = sum(r.get('unique_cves', 0) for r in older)

    # Collect top CVEs and tags across older records (best-effort)
    cve_scores = {}
    tag_scores = {}
    country_scores = {}
    for r in older:
        for c in r.get('top_cves', []) if isinstance(r.get('top_cves'), list) else []:
            cid = c.get('id')
            if not cid:
                continue
            cve_scores[cid] = cve_scores.get(cid, 0) + float(c.get('occurrences', 1))
        for t in r.get('top_tags', []) if isinstance(r.get('top_tags'), list) else []:
            tag_scores[t] = tag_scores.get(t, 0) + 1
        for cty in r.get('top_countries', []) if isinstance(r.get('top_countries'), list) else []:
            code = cty.get('code') if isinstance(cty, dict) else cty
            country_scores[code] = country_scores.get(code, 0) + (cty.get('threat_count', 1) if isinstance(cty, dict) else 1)

    top_cves = [{'id': k, 'occurrences': int(v), 'cvss': round(agg_mean_cvss, 2)} for k, v in sorted(cve_scores.items(), key=lambda x: x[1], reverse=True)[:5]]
    top_tags = [k for k, _ in sorted(tag_scores.items(), key=lambda x: x[1], reverse=True)[:5]]
    top_countries = [{'code': k, 'threat_count': int(v)} for k, v in sorted(country_scores.items(), key=lambda x: x[1], reverse=True)[:3]]

    summary = {
        'region': 'United States',
        'week_start': f"older_history_summary_up_to_{feature_records[-keep_recent_weeks]['week_start']}",
        'count_last_week': int(agg_count),
        'count_4week_avg': round(agg_count / max(1, len(older)), 1),
        'growth_rate': 0.0,
        'mean_cvss': round(agg_mean_cvss, 2),
        'unique_cves': int(agg_unique_cves),
        'unique_countries': len(country_scores),
        'top_countries': top_countries,
        'top_tags': top_tags,
        'top_cves': top_cves
    }

    compressed = recent + [summary]
    # Ensure per-record lists are small
    for r in compressed:
        if 'top_cves' in r and isinstance(r['top_cves'], list):
            r['top_cves'] = r['top_cves'][:3]
        if 'top_tags' in r and isinstance(r['top_tags'], list):
            r['top_tags'] = r['top_tags'][:5]
        if 'top_countries' in r and isinstance(r['top_countries'], list):
            r['top_countries'] = r['top_countries'][:3]

    return compressed


def forecast_threats(
    df: pd.DataFrame,
    date_column: str = 'timestamp',
    weeks_of_history: int = 20,
    forecast_weeks: int = FORECAST_HORIZON_WEEKS,
    dry_run: bool = False
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
    # Read LLM-related limits from settings (safe defaults provided)
    try:
        from django.conf import settings
        max_input_tokens = getattr(settings, 'LLM_MAX_INPUT_TOKENS', 400)
        expected_output_tokens = getattr(settings, 'LLM_EXPECTED_OUTPUT_TOKENS', 300)
        llm_price_per_1k = getattr(settings, 'LLM_PRICE_PER_1K', 0.03)
        llm_max_response_tokens = getattr(settings, 'LLM_MAX_RESPONSE_TOKENS', 600)
        keep_recent_weeks = getattr(settings, 'LLM_RECENT_WEEKS_KEEP', 6)
    except Exception:
        max_input_tokens = 400
        expected_output_tokens = 300
        llm_price_per_1k = 0.03
        llm_max_response_tokens = 1000
        keep_recent_weeks = 4

    # Estimate tokens and compress feature_records proactively if needed
    estimate = estimate_prompt_and_cost(feature_records, forecast_weeks=forecast_weeks,
                                        expected_output_tokens=expected_output_tokens,
                                        price_per_1k=llm_price_per_1k,
                                        compact=False)
    input_tokens = estimate.get('estimated_input_tokens', 0)

    # Iteratively compress by reducing the number of recent weeks kept until under budget.
    current_keep = keep_recent_weeks
    if input_tokens > max_input_tokens:
        print(f"Input tokens ({input_tokens}) exceed max allowed ({max_input_tokens}). Attempting iterative compression...")
    while input_tokens > max_input_tokens and current_keep > 1:
        print(f"  → compressing with keep_recent_weeks={current_keep}...")
        feature_records = compress_feature_records(feature_records, max_input_tokens, forecast_weeks, current_keep)
        # Re-estimate using compact JSON formatting to save tokens
        estimate = estimate_prompt_and_cost(feature_records, forecast_weeks=forecast_weeks,
                                            expected_output_tokens=expected_output_tokens,
                                            price_per_1k=llm_price_per_1k,
                                            compact=True)
        input_tokens = estimate.get('estimated_input_tokens', 0)
        print(f"     → estimated input tokens after compression: {input_tokens}")
        if input_tokens <= max_input_tokens:
            break
        current_keep = max(1, current_keep - 1)

    # If still too large, do an aggressive per-record trimming and compact prompt
    if input_tokens > max_input_tokens:
        print("  → Still over budget after iterative compression — applying aggressive trimming (shrink lists)...")
        # Aggressive trimming: shrink top lists to 1 element and keep only last 2 weeks + summary
        for r in feature_records:
            if 'top_cves' in r and isinstance(r['top_cves'], list):
                r['top_cves'] = r['top_cves'][:1]
            if 'top_tags' in r and isinstance(r['top_tags'], list):
                r['top_tags'] = r['top_tags'][:2]
            if 'top_countries' in r and isinstance(r['top_countries'], list):
                r['top_countries'] = r['top_countries'][:1]
        # Rebuild a compact estimate
        estimate = estimate_prompt_and_cost(feature_records, forecast_weeks=forecast_weeks,
                                            expected_output_tokens=expected_output_tokens,
                                            price_per_1k=llm_price_per_1k,
                                            compact=True)
        input_tokens = estimate.get('estimated_input_tokens', 0)
        print(f"     → estimated input tokens after aggressive trimming: {input_tokens}")

    # If user requested a dry-run, return the current estimate (after any compression)
    if dry_run:
        return {
            'predictions': [],
            'feature_records_count': len(feature_records),
            'estimated': estimate,
            'metadata': {
                'model': 'dry-run',
                'price_per_1k': llm_price_per_1k,
            }
        }

    # Step 3: Get forecast from LLM
    print("Calling Azure OpenAI for United States forecast (with tightened token limits)...")
    # Ensure LLM response token limit is respected
    forecast_result = get_threat_forecast(feature_records, max_tokens=llm_max_response_tokens)
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
