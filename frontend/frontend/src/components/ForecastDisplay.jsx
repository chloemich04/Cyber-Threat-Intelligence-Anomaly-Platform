import React, { useState, useEffect } from 'react';
import InfoModal from './InfoModal';

const ForecastDisplay = () => {
  const [forecastData, setForecastData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [showCIInfo, setShowCIInfo] = useState(false);
  const [showSpikeInfo, setShowSpikeInfo] = useState(false);
  const [showConfidenceInfo, setShowConfidenceInfo] = useState(false);

  // Fetch latest forecast data when component mounts
  useEffect(() => {
    fetchLatestForecast();
    
    // Listen for forecast update events
    const handleForecastUpdate = () => {
      console.log('Forecast updated, refreshing display...');
      fetchLatestForecast();
    };
    
    window.addEventListener('forecastUpdated', handleForecastUpdate);
    
    return () => {
      window.removeEventListener('forecastUpdated', handleForecastUpdate);
    };
  }, []);

  const fetchLatestForecast = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('http://localhost:8000/api/forecast/latest/');
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('No forecast data available yet. Please run a forecast first.');
        } else {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        setLoading(false);
        return;
      }
      
      const data = await response.json();
      setForecastData(data);
      setLastUpdate(new Date(data.generated_at));
      setError(null);
    } catch (err) {
      console.error('Error fetching forecast:', err);
      setError('Failed to load forecast data. Make sure the Django server is running.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatDateTime = (date) => {
    return date.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (loading) {
    return (
      <div className="forecast-display">
        <div className="forecast-loading">
          <p>Loading forecast data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="forecast-display">
        <div className="forecast-error">
          <h3>⚠️ No Forecast Data</h3>
          <p>{error}</p>
          <div className="forecast-instructions">
            <h4>To generate forecast data:</h4>
            <ol>
              <li>Open terminal in <code>django_backend</code> directory</li>
              <li>Run: <code>python manage.py run_forecast</code></li>
              <li>Refresh this page</li>
            </ol>
          </div>
          <button className="button primary" onClick={fetchLatestForecast}>
            Check Again
          </button>
        </div>
      </div>
    );
  }

  const predictions = forecastData?.predictions || [];
  const metadata = forecastData?.metadata || {};
  const horizonWeeks = forecastData?.forecast_horizon_weeks || 4;

  // Group predictions by country
  const countryCodes = [...new Set(predictions.map(p => p.country_code))];

  return (
    <div className="forecast-display">
      {/* Header with refresh button */}
      <div className="forecast-header">
        <div>
          <h3>Threat Forecast</h3>
          {lastUpdate && (
            <p className="forecast-timestamp">
              Last updated: {formatDateTime(lastUpdate)}
            </p>
          )}
        </div>
        
      </div>

      <InfoModal open={showCIInfo} onClose={() => setShowCIInfo(false)} title="About the Confidence Interval">
        <p>
          The confidence interval shows the model's uncertainty around its predictions. It represents a range
          where the true value is expected to lie with a given level of confidence (for example, 90% or 95%).
        </p>
        <ul style={{ marginTop: 8 }}>
          <li><strong>What it means:</strong> a wider interval means more uncertainty; a narrow interval means the model is more certain.</li>
          <li><strong>How to use it:</strong> treat spikes that fall outside the upper bound with higher priority for investigation.</li>
          <li><strong>Why it changes:</strong> intervals widen when historical data is sparse or noisy, when recent trends are volatile, or when key signals conflict.</li>
        </ul>
        <p style={{ marginTop: 8 }}>
          Use the confidence interval alongside the point prediction and key signals — it helps you understand how much
          trust to place in the forecast and whether you should prioritize human validation or automated alerts.
        </p>
      </InfoModal>

      <InfoModal open={showSpikeInfo} onClose={() => setShowSpikeInfo(false)} title="About Spike Risk">
        <p>
          Spike Risk is the model's estimate of how likely the expected count for a week will be significantly higher than
          baseline. It helps identify weeks that may require immediate investigation or heightened monitoring.
        </p>
        <ul style={{ marginTop: 8 }}>
          <li><strong>What it means:</strong> a higher percentage indicates a greater chance of a sudden increase relative to typical levels.</li>
          <li><strong>Thresholds:</strong> we surface spike risk as categories (e.g., low/medium/high) based on probability cutoffs — treat high-risk weeks as higher priority.</li>
          <li><strong>How it's used:</strong> combine spike risk with the confidence interval and key signals to decide whether to trigger alerts or assign human review.</li>
        </ul>
        <p style={{ marginTop: 8 }}>
          Spike Risk is a probabilistic signal — it is not a definitive indicator. Use it to prioritize investigations and to tune automated responses conservatively.
        </p>
      </InfoModal>

      <InfoModal open={showConfidenceInfo} onClose={() => setShowConfidenceInfo(false)} title="About Confidence">
        <p>
          The confidence percentage reports how certain the model is about its point prediction for that week. A higher
          percentage indicates the model assigns more weight to the point estimate, while a lower percentage indicates more
          uncertainty and that you should weigh the confidence interval and key signals when deciding on automated actions.
        </p>
        <ul style={{ marginTop: 8 }}>
          <li><strong>What it means:</strong> higher percent = more model certainty about the expected count.</li>
          <li><strong>How to use it:</strong> prefer investigating high-impact weeks with both high spike risk and high confidence.</li>
          <li><strong>Limitations:</strong> confidence is model-derived and depends on data quality; always corroborate with telemetry.</li>
        </ul>
        <p style={{ marginTop: 8 }}>
          Use the confidence value alongside the confidence interval and key signals to prioritize alerts and investigations.
        </p>
      </InfoModal>

    
      {/* Predictions by Country */}
      {countryCodes.map(countryCode => {
        const countryPredictions = predictions.filter(p => p.country_code === countryCode);
        const countryName = countryPredictions[0]?.country_name || countryCode;

        return (
          <div key={countryCode} className="forecast-country-section">
            
            <table className="table forecast-table">
              <thead>
                <tr>
                  <th>Week Starting</th>
                  <th>Expected Threats</th>
                  <th>
                    Confidence Interval
                    <button
                      type="button"
                      title="Confidence interval explanation"
                      style={{
                        marginLeft: 8,
                        fontSize: 12,
                        color: 'var(--muted)',
                        cursor: 'pointer',
                        background: 'transparent',
                        border: 'none',
                        padding: 0,
                      }}
                      aria-label="Confidence interval tooltip"
                      aria-expanded={showCIInfo}
                      onClick={() => setShowCIInfo(true)}
                    >
                      ℹ️
                    </button>
                  </th>
                  <th>
                    Spike Risk
                    <button
                      type="button"
                      title="Spike risk explanation"
                      style={{
                        marginLeft: 8,
                        fontSize: 12,
                        color: 'var(--muted)',
                        cursor: 'pointer',
                        background: 'transparent',
                        border: 'none',
                        padding: 0,
                      }}
                      aria-label="Spike risk tooltip"
                      aria-expanded={showSpikeInfo}
                      onClick={() => setShowSpikeInfo(true)}
                    >
                      ℹ️
                    </button>
                  </th>
                  <th>
                    Confidence
                    <button
                      type="button"
                      title="Confidence explanation"
                      style={{
                        marginLeft: 8,
                        fontSize: 12,
                        color: 'var(--muted)',
                        cursor: 'pointer',
                        background: 'transparent',
                        border: 'none',
                        padding: 0,
                      }}
                      aria-label="Confidence info"
                      aria-expanded={showConfidenceInfo}
                      onClick={() => setShowConfidenceInfo(true)}
                    >
                      ℹ️
                    </button>
                  </th>
                  
                </tr>
              </thead>
              <tbody>
                {countryPredictions.map((pred, idx) => (
                  <tr key={idx}>
                    <td>{formatDate(pred.week_start)}</td>
                    <td><strong>{pred.expected_count}</strong></td>
                    <td>
                      {pred.expected_count_ci ? 
                        `${pred.expected_count_ci[0]} - ${pred.expected_count_ci[1]}` 
                        : 'N/A'}
                    </td>
                    <td>
                      <span className={
                        pred.spike_probability > 0.5 ? 'chip chip-danger' :
                        pred.spike_probability > 0.3 ? 'chip chip-warning' :
                        'chip chip-success'
                      }>
                        {(pred.spike_probability * 100).toFixed(0)}%
                      </span>
                    </td>
                    <td>
                      {pred.confidence != null ? `${(pred.confidence * 100).toFixed(0)}%` : 'N/A'}
                    </td>
                    
                  </tr>
                ))}
              </tbody>
            </table>
            
            {/* Show explanation for first prediction */}
            {countryPredictions[0]?.explanation && (
              <div className="forecast-explanation">
                <strong>Analysis:</strong> {countryPredictions[0].explanation}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ForecastDisplay;
