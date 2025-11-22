import React, { useState, useEffect } from 'react';
import { getLatestForecast } from '../utils/forecastCache';
import InfoModal from './InfoModal';

const ForecastDisplay = () => {
  const [forecastData, setForecastData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [showCIInfo, setShowCIInfo] = useState(false);
  const [showSpikeInfo, setShowSpikeInfo] = useState(false);
  const [showConfidenceInfo, setShowConfidenceInfo] = useState(false);
  const [selectedSignal, setSelectedSignal] = useState(null);

  // Fetch latest forecast data when component mounts (cached per session)
  useEffect(() => {
    fetchLatestForecast();

    // Listen for forecast update events (force refresh)
    const handleForecastUpdate = () => {
      console.log('Forecast updated, refreshing display...');
      fetchLatestForecast({ force: true });
    };

    window.addEventListener('forecastUpdated', handleForecastUpdate);

    return () => {
      window.removeEventListener('forecastUpdated', handleForecastUpdate);
    };
  }, []);

  // listen for signalFilter events
  useEffect(() => {
    const handler = (e) => {
      const sig = e?.detail?.signal;
      if (sig) {
        setSelectedSignal(sig);
      }
    };
    window.addEventListener('signalFilter', handler);
    return () => window.removeEventListener('signalFilter', handler);
  }, []);

  const fetchLatestForecast = async ({ force = false } = {}) => {
    setLoading(true);
    setError(null);

    try {
      const data = await getLatestForecast({ force });
      setForecastData(data);
      setLastUpdate(new Date(data.generated_at));
      setError(null);
    } catch (err) {
      console.error('Error fetching forecast:', err);
      if (err && err.status === 404) {
        setError('No forecast data available yet. Please run a forecast first.');
      } else {
        setError('Failed to load forecast data. Make sure the Django server is running.');
      }
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {selectedSignal && (
            <div style={{ background: 'rgba(56,189,248,0.06)', padding: '6px 10px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>Filtering by:</div>
              <div style={{ fontWeight: 700 }}>{selectedSignal.label}</div>
              <button
                className="button small"
                onClick={() => {
                  setSelectedSignal(null);
                  // notify other components to clear their selection
                  window.dispatchEvent(new CustomEvent('signalFilter', { detail: { signal: null } }));
                }}
              >
                Clear
              </button>
            </div>
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
                {countryPredictions.map((pred, idx) => {
                  // determine if this row is highlighted by selectedSignal
                  let rowStyle;
                  if (selectedSignal) {
                    const sigLabel = (selectedSignal.label || '').toString();
                    const cveMatch = (sigLabel.match(/CVE-\d{4}-\d{1,7}/i) || [null])[0];
                    const matches = (pred.top_signals || []).some(ts => {
                      if (cveMatch) return ts.id && ts.id.toString().toUpperCase() === cveMatch.toUpperCase();
                      // otherwise, match by tag or id substring
                      return (ts.id && sigLabel.toLowerCase().includes(ts.id.toString().toLowerCase())) || (ts.signal_type && sigLabel.toLowerCase().includes(ts.signal_type.toLowerCase()));
                    });
                    if (matches) rowStyle = { background: 'rgba(56, 189, 248, 0.06)' };
                  }

                  return (
                    <tr key={idx} style={rowStyle}>
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
                  );
                })}
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
