"""
Chart-friendly forecast data processor for visualization.
Extracts metrics suitable for time-series charts, bar charts, and heatmaps.
"""
import json
import pandas as pd
from typing import Dict, Any, List
from datetime import datetime


def extract_chart_metrics(forecast_data: Dict[str, Any]) -> Dict[str, pd.DataFrame]:
    """
    Extract chart-friendly DataFrames from forecast JSON.
    
    Args:
        forecast_data: Raw forecast JSON from threat_forecast module
    
    Returns:
        Dictionary of DataFrames:
        - timeseries: expected_count over time by country
        - spike_risk: spike_probability by country and week
        - confidence: model confidence by country
        - top_signals: aggregated signal importance
    """
    predictions = forecast_data.get('predictions', [])
    
    if not predictions:
        return {}
    
    # Convert to DataFrame
    df = pd.DataFrame(predictions)
    
    # 1. Time series data: Expected count over time
    timeseries = df[['country_code', 'country_name', 'week_start', 'expected_count']].copy()
    timeseries['week_start'] = pd.to_datetime(timeseries['week_start'])
    timeseries = timeseries.sort_values(['country_code', 'week_start'])
    
    # Add confidence intervals if available
    if 'expected_count_ci' in df.columns:
        timeseries['ci_lower'] = df['expected_count_ci'].apply(
            lambda x: x[0] if isinstance(x, list) and len(x) >= 2 else None
        )
        timeseries['ci_upper'] = df['expected_count_ci'].apply(
            lambda x: x[1] if isinstance(x, list) and len(x) >= 2 else None
        )
    
    # 2. Spike risk heatmap data
    spike_risk = df[['country_code', 'country_name', 'week_start', 'spike_probability']].copy()
    spike_risk['week_start'] = pd.to_datetime(spike_risk['week_start'])
    spike_risk['risk_level'] = pd.cut(
        spike_risk['spike_probability'],
        bins=[0, 0.3, 0.6, 1.0],
        labels=['Low', 'Medium', 'High']
    )
    
    # 3. Model confidence by country
    confidence = df.groupby(['country_code', 'country_name'])['confidence'].agg([
        'mean', 'min', 'max', 'std'
    ]).reset_index()
    confidence.columns = ['country_code', 'country_name', 'avg_confidence', 
                          'min_confidence', 'max_confidence', 'std_confidence']
    
    # 4. Top signals aggregation
    all_signals = []
    for _, row in df.iterrows():
        country = row['country_code']
        week = row['week_start']
        signals = row.get('top_signals', [])
        
        for signal in signals:
            if isinstance(signal, dict):
                all_signals.append({
                    'country_code': country,
                    'week_start': week,
                    'signal_type': signal.get('signal_type'),
                    'signal_id': signal.get('id'),
                    'score': signal.get('score', 0)
                })
    
    top_signals = pd.DataFrame(all_signals)
    
    if not top_signals.empty:
        # Aggregate signal importance across all predictions
        signal_summary = top_signals.groupby(['signal_type', 'signal_id'])['score'].agg([
            'sum', 'mean', 'count'
        ]).reset_index()
        signal_summary.columns = ['signal_type', 'signal_id', 'total_score', 'avg_score', 'frequency']
        signal_summary = signal_summary.sort_values('total_score', ascending=False)
    else:
        signal_summary = pd.DataFrame()
    
    return {
        'timeseries': timeseries,
        'spike_risk': spike_risk,
        'confidence': confidence,
        'top_signals': top_signals,
        'signal_summary': signal_summary
    }


def create_visualization_config(chart_data: Dict[str, pd.DataFrame]) -> Dict[str, Any]:
    """
    Generate chart.js / recharts compatible configuration.
    
    Args:
        chart_data: Output from extract_chart_metrics()
    
    Returns:
        Dictionary with chart configurations
    """
    configs = {}
    
    # Line chart: Expected count over time
    if 'timeseries' in chart_data and not chart_data['timeseries'].empty:
        ts_df = chart_data['timeseries']
        
        # Pivot for multi-line chart (one line per country)
        ts_pivot = ts_df.pivot_table(
            index='week_start',
            columns='country_code',
            values='expected_count',
            aggfunc='first'
        )
        
        configs['line_chart'] = {
            'type': 'line',
            'title': 'Expected Threat Count Forecast',
            'data': {
                'labels': ts_pivot.index.strftime('%Y-%m-%d').tolist(),
                'datasets': [
                    {
                        'label': country,
                        'data': ts_pivot[country].tolist()
                    }
                    for country in ts_pivot.columns
                ]
            },
            'options': {
                'xAxisLabel': 'Week',
                'yAxisLabel': 'Expected Threats',
                'showLegend': True
            }
        }
    
    # Bar chart: Spike probability by country (latest week)
    if 'spike_risk' in chart_data and not chart_data['spike_risk'].empty:
        spike_df = chart_data['spike_risk']
        
        # Get latest week per country
        latest_spike = spike_df.sort_values('week_start').groupby('country_code').last().reset_index()
        
        configs['bar_chart'] = {
            'type': 'bar',
            'title': 'Spike Risk by Country (Next Week)',
            'data': {
                'labels': latest_spike['country_name'].tolist(),
                'datasets': [{
                    'label': 'Spike Probability',
                    'data': latest_spike['spike_probability'].tolist()
                }]
            },
            'options': {
                'xAxisLabel': 'Country',
                'yAxisLabel': 'Spike Probability',
                'yAxisMax': 1.0
            }
        }
    
    # Heatmap: Spike risk matrix (country x week)
    if 'spike_risk' in chart_data and not chart_data['spike_risk'].empty:
        spike_df = chart_data['spike_risk']
        
        heatmap_pivot = spike_df.pivot_table(
            index='country_code',
            columns='week_start',
            values='spike_probability',
            aggfunc='first'
        )
        
        configs['heatmap'] = {
            'type': 'heatmap',
            'title': 'Spike Risk Matrix',
            'data': {
                'xLabels': heatmap_pivot.columns.strftime('%Y-%m-%d').tolist(),
                'yLabels': heatmap_pivot.index.tolist(),
                'values': heatmap_pivot.values.tolist()
            },
            'options': {
                'colorScale': 'RdYlGn_r',  # Red = high risk
                'xAxisLabel': 'Week',
                'yAxisLabel': 'Country'
            }
        }
    
    return configs


def export_for_frontend(forecast_data: Dict[str, Any], output_path: str):
    """
    Export forecast data in frontend-friendly format.
    
    Args:
        forecast_data: Raw forecast JSON
        output_path: Path to save frontend JSON
    """
    # Extract chart metrics
    chart_data = extract_chart_metrics(forecast_data)
    
    # Generate chart configs
    chart_configs = create_visualization_config(chart_data)
    
    # Build frontend package
    frontend_data = {
        'metadata': forecast_data.get('metadata', {}),
        'forecast_horizon_weeks': forecast_data.get('forecast_horizon_weeks', 4),
        'generated_at': datetime.now().isoformat(),
        'charts': chart_configs,
        'summary_stats': {
            'total_predictions': len(forecast_data.get('predictions', [])),
            'countries_analyzed': chart_data.get('timeseries', pd.DataFrame()).get('country_code', pd.Series()).nunique()
        },
        'raw_predictions': forecast_data.get('predictions', [])  # Include for detailed views
    }
    
    # Save to file
    with open(output_path, 'w') as f:
        json.dump(frontend_data, f, indent=2)
    
    print(f"Frontend data exported to: {output_path}")
    
    # Print summary
    print("\nChart configurations generated:")
    for chart_type in chart_configs.keys():
        print(f"  - {chart_type}")


if __name__ == "__main__":
    print("Forecast Chart Utilities")
    print("="*50)
    print("Usage:")
    print("  from chart_utils import extract_chart_metrics, export_for_frontend")
    print("  chart_data = extract_chart_metrics(forecast_json)")
    print("  export_for_frontend(forecast_json, 'frontend_data.json')")
