import React, { useState, useEffect } from 'react';

const ForecastDisplay = () => {
  const [forecastData, setForecastData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

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
                  <th>Confidence Interval</th>
                  <th>Spike Risk</th>
                  <th>Confidence</th>
                  <th>Key Signals</th>
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
                    <td>{(pred.confidence * 100).toFixed(0)}%</td>
                    <td className="forecast-signals">
                      {pred.top_signals?.slice(0, 2).map((sig, i) => (
                        <span key={i} className="chip" title={`Score: ${sig.score?.toFixed(2)}`}>
                          {sig.signal_type}: {sig.id}
                        </span>
                      ))}
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
