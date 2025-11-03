"""
Example: Running cyber threat forecasting
This script demonstrates the complete workflow.
"""
import os
import sys
import django
import pandas as pd
from datetime import datetime, timedelta

# Setup Django environment
sys.path.insert(0, os.path.dirname(__file__))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()


from cyberintel.threat_forecast import forecast_threats
from cyberintel.chart_utils import extract_chart_metrics, export_for_frontend


def main():
    print("="*70)
    print("Cyber Threat Forecasting Example")
    print("="*70)
    
    # Step 1: Load data from database
    print("\nStep 1: Loading threat data...")
    
    lookback_days = 90
    cutoff_date = datetime.now() - timedelta(days=lookback_days)
    
    queryset = ThreatIntelligence.objects.filter(
        timestamp__gte=cutoff_date
    ).values(
        'country_code',
        'country_name',
        'ip',
        'cve_id',
        'data',
        'timestamp'
    )
    
    threat_count = queryset.count()
    print(f"  → Loaded {threat_count} threat records")
    
    if threat_count == 0:
        print("\n⚠️  No data available. Run: python manage.py populate_dummy_data")
        return
    
    # Convert to DataFrame
    df = pd.DataFrame(list(queryset))
    print(f"  → {df['country_code'].nunique()} unique countries")
    print(f"  → Date range: {df['timestamp'].min()} to {df['timestamp'].max()}")
    
    # Step 2: Run forecast
    print("\nStep 2: Running forecast (this calls Azure OpenAI)...")
    
    try:
        forecast_result = forecast_threats(
            df=df,
            date_column='timestamp',
            batch_size=6,  # Process 6 country-weeks per call
            forecast_weeks=4  # Predict next 4 weeks
        )
    except Exception as e:
        print(f"\n❌ Forecast failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return
    
    # Step 3: Display results
    print("\nStep 3: Forecast Results")
    print("-"*70)
    
    predictions = forecast_result.get('predictions', [])
    print(f"\n✓ Generated {len(predictions)} predictions\n")
    
    if predictions:
        print("Sample Predictions:")
        print("-"*70)
        
        for i, pred in enumerate(predictions[:5], 1):
            country = pred.get('country_name', pred.get('country_code'))
            week = pred.get('week_start')
            expected = pred.get('expected_count', 'N/A')
            ci = pred.get('expected_count_ci', [None, None])
            spike_prob = pred.get('spike_probability', 0)
            confidence = pred.get('confidence', 0)
            explanation = pred.get('explanation', 'N/A')
            
            print(f"\n{i}. {country} - Week of {week}")
            print(f"   Expected threats: {expected} (95% CI: {ci[0]}-{ci[1]})")
            print(f"   Spike probability: {spike_prob:.1%}")
            print(f"   Confidence: {confidence:.1%}")
            print(f"   Reasoning: {explanation}")
            
            # Show top signals
            signals = pred.get('top_signals', [])
            if signals:
                print(f"   Key signals:")
                for sig in signals:
                    sig_type = sig.get('signal_type')
                    sig_id = sig.get('id')
                    score = sig.get('score', 0)
                    print(f"     - {sig_type}: {sig_id} (importance: {score:.2f})")
    
    # Step 4: Extract chart metrics
    print("\n" + "="*70)
    print("Step 4: Extracting chart-friendly metrics...")
    
    chart_data = extract_chart_metrics(forecast_result)
    
    print(f"\n✓ Generated {len(chart_data)} chart datasets:")
    for chart_type, df in chart_data.items():
        if isinstance(df, pd.DataFrame) and not df.empty:
            print(f"  - {chart_type}: {len(df)} records")
    
    # Step 5: Export for frontend
    print("\nStep 5: Exporting frontend data...")
    
    output_file = f"forecast_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    export_for_frontend(forecast_result, output_file)
    
    print(f"\n✓ Complete! Output saved to: {output_file}")
    print("\nYou can now:")
    print(f"  1. View results: cat {output_file} | python -m json.tool")
    print(f"  2. Copy to frontend: cp {output_file} ../frontend/frontend/public/")
    print(f"  3. Visualize in your React app")


if __name__ == "__main__":
    # Check if RUN_FORECAST environment variable is set
    if os.environ.get('RUN_FORECAST') != '1':
        print("⚠️  Set RUN_FORECAST=1 to run this example (it calls Azure OpenAI API)")
        print("\nExample:")
        print("  $env:RUN_FORECAST='1'; python example_forecast.py")
        sys.exit(0)
    
    main()
