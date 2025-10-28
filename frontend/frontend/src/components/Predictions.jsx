import React, { useState, useEffect } from 'react';

const Predictions = () => {
  const [loading, setLoading] = useState(false);
  const [predictions, setPredictions] = useState(null);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    timeframe: '30 days',
    threatType: 'All Threats',
    confidence: 'High (90%+)'
  });

  const API_BASE_URL = 'http://localhost:8000/api';

  const generatePredictions = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/predictions/generate/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timeframe: filters.timeframe,
          threat_type: filters.threatType === 'All Threats' ? null : filters.threatType,
          confidence_level: filters.confidence
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setPredictions(data.predictions);
      } else {
        // Handle insufficient data case specifically
        if (data.error === 'Insufficient data') {
          setError(`Insufficient Data: ${data.message}`);
          setPredictions(null);
        } else {
          throw new Error(data.error || 'Failed to generate predictions');
        }
      }
    } catch (err) {
      console.error('Error generating predictions:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  // Load predictions on component mount
  useEffect(() => {
    generatePredictions();
  }, []);

  return (
    <>
      <header>
        <div className="title">Predictions And Forecasting</div>
        <div className="subtitle">
          AI-powered threat predictions and risk forecasting based on historical data and emerging patterns.
        </div>

        <div className="toolbar">
          <select 
            className="select" 
            aria-label="Prediction timeframe" 
            value={filters.timeframe}
            onChange={(e) => handleFilterChange('timeframe', e.target.value)}
          >
            <option>Timeframe</option>
            <option>Next 7 days</option>
            <option>Next 30 days</option>
            <option>Next 90 days</option>
            <option>Next 6 months</option>
          </select>

          <select 
            className="select" 
            aria-label="Threat type filter" 
            value={filters.threatType}
            onChange={(e) => handleFilterChange('threatType', e.target.value)}
          >
            <option>Threat Type</option>
            <option>Ransomware</option>
            <option>Phishing</option>
            <option>DDoS</option>
            <option>Malware</option>
            <option>All Threats</option>
          </select>

          <select 
            className="select" 
            aria-label="Confidence level" 
            value={filters.confidence}
            onChange={(e) => handleFilterChange('confidence', e.target.value)}
          >
            <option>Confidence</option>
            <option>High (90%+)</option>
            <option>Medium (70-89%)</option>
            <option>Low (50-69%)</option>
          </select>

          <button 
            className="button primary" 
            type="button" 
            onClick={generatePredictions}
            disabled={loading}
          >
            {loading ? 'Generating...' : 'Generate Report'}
          </button>
          <button className="button" type="button">Export Data</button>
        </div>
      </header>

      <main>
        {/* Prediction KPIs */}
        <section className="panel" style={{gridColumn: '1 / 2'}}>
          <h3>Prediction Metrics</h3>
          {error && (
            <div style={{
              color: error.includes('Insufficient Data') ? '#d97706' : 'red', 
              marginBottom: '1rem', 
              padding: '1rem', 
              backgroundColor: error.includes('Insufficient Data') ? '#fef3c7' : '#ffe6e6', 
              borderRadius: '4px',
              border: error.includes('Insufficient Data') ? '1px solid #f59e0b' : '1px solid #ef4444'
            }}>
              {error.includes('Insufficient Data') ? (
                <div>
                  <strong>⚠️ Insufficient Data for Analysis</strong>
                  <p style={{margin: '0.5rem 0 0 0', fontSize: '0.9em'}}>
                    {error.replace('Insufficient Data: ', '')}
                  </p>
                  <p style={{margin: '0.5rem 0 0 0', fontSize: '0.8em', color: '#92400e'}}>
                    Please add more threat indicators to the database to enable AI predictions.
                  </p>
                </div>
              ) : (
                `Error: ${error}`
              )}
            </div>
          )}
          <div className="kpis">
            <div className="kpi">
              <div className="label">Predicted Incidents (30 days)</div>
              <div className="value">
                {loading ? '...' : predictions?.metrics?.predicted_incidents_30_days || '—'}
              </div>
            </div>
            <div className="kpi">
              <div className="label">Risk Score</div>
              <div className="value">
                {loading ? '...' : predictions?.metrics?.risk_score ? `${predictions.metrics.risk_score}/100` : '—'}
              </div>
            </div>
            <div className="kpi">
              <div className="label">Confidence Level</div>
              <div className="value">
                {loading ? '...' : predictions?.metrics?.confidence_level ? `${Math.round(predictions.metrics.confidence_level)}%` : '—'}
              </div>
            </div>
            <div className="kpi">
              <div className="label">Model Accuracy</div>
              <div className="value">
                {loading ? '...' : predictions?.metrics?.model_accuracy ? `${Math.round(predictions.metrics.model_accuracy)}%` : '—'}
              </div>
            </div>
          </div>
        </section>

        {/* Threat Prediction Map */}
        <section className="panel" style={{gridColumn: '1 / 2'}}>
          <h3>Predicted Threat Activity</h3>
          <div className="heatmap" aria-label="Predicted threat activity heatmap">
            <div style={{padding: '2rem', textAlign: 'center', color: 'var(--muted)'}}>
              🗺️ Interactive Prediction Map Coming Soon
            </div>
          </div>
          <div className="legend">
            <span>Low Risk</span>
            <span className="bar" aria-hidden="true"></span>
            <span>High Risk</span>
          </div>
        </section>

        {/* Prediction Charts */}
        <section className="panel charts-full-width">
          <h3>Prediction Analytics</h3>
          <div className="charts">
            <div className="chart-box" aria-label="Threat trend prediction">
              <div className="chart-header">
                <h3 className="chart-title">Threat Trend Prediction</h3>
              </div>
              <div className="chart-content">
                <div className="chart-container" style={{height: '280px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)'}}>
                  📈 Prediction Line Chart Coming Soon
                </div>
              </div>
            </div>
            
            <div className="chart-box" aria-label="Risk probability distribution">
              <div className="chart-header">
                <h3 className="chart-title">Risk Probability Distribution</h3>
              </div>
              <div className="chart-content">
                <div className="chart-container" style={{height: '280px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)'}}>
                  📊 Probability Chart Coming Soon
                </div>
              </div>
            </div>
            
            <div className="chart-box" aria-label="Sector vulnerability forecast">
              <div className="chart-header">
                <h3 className="chart-title">Sector Vulnerability Forecast</h3>
              </div>
              <div className="chart-content">
                <div className="chart-container" style={{height: '280px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)'}}>
                  🎯 Vulnerability Heatmap Coming Soon
                </div>
              </div>
            </div>
            
            <div className="chart-box" aria-label="Attack vector predictions">
              <div className="chart-header">
                <h3 className="chart-title">Predicted Attack Vectors</h3>
              </div>
              <div className="chart-content">
                <div className="chart-container" style={{height: '280px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)'}}>
                  🎯 Attack Vector Chart Coming Soon
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Prediction Alerts Table */}
        <section className="panel" style={{gridColumn: '1 / 2'}}>
          <h3>Prediction Alerts</h3>
          <table className="table" aria-label="Prediction alerts table">
            <thead>
              <tr>
                <th>Threat Type</th>
                <th>Predicted Date</th>
                <th>Probability</th>
                <th>Impact Score</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" style={{textAlign: 'center', padding: '2rem'}}>
                    Loading predictions...
                  </td>
                </tr>
              ) : error && error.includes('Insufficient Data') ? (
                <tr>
                  <td colSpan="5" style={{textAlign: 'center', padding: '2rem', color: '#d97706'}}>
                    <div>
                      <strong>⚠️ Insufficient Data</strong>
                      <p style={{margin: '0.5rem 0 0 0', fontSize: '0.9em'}}>
                        Cannot generate prediction alerts without sufficient threat data
                      </p>
                    </div>
                  </td>
                </tr>
              ) : predictions?.alerts?.length > 0 ? (
                predictions.alerts.map((alert, index) => (
                  <tr key={index}>
                    <td>{alert.threat_type}</td>
                    <td>{alert.predicted_date}</td>
                    <td>{alert.probability}</td>
                    <td>{alert.impact_score}</td>
                    <td>{alert.status}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" style={{textAlign: 'center', padding: '2rem', color: 'var(--muted)'}}>
                    No prediction alerts available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        {/* AI Insights Sidebar */}
        <aside className="panel" style={{gridColumn: '2 / 3', gridRow: '1', alignSelf: 'start'}}>
          <h3>AI Insights</h3>
          <div className="list">
            <p><strong>Model Status:</strong> <span className="chip">Active</span></p>
            <p><strong>Last Updated:</strong> {loading ? '...' : predictions?.timestamp ? new Date(predictions.timestamp).toLocaleString() : 'Never'}</p>
            <p><strong>Data Points:</strong> {loading ? '...' : predictions?.data_points || '—'}</p>
            <p><strong>Source:</strong> {loading ? '...' : predictions?.source || '—'}</p>
            <p><strong>Analysis:</strong></p>
            <div style={{fontSize: '0.9em', color: 'var(--muted)', marginTop: '0.5rem', maxHeight: '200px', overflowY: 'auto'}}>
              {loading ? 'Loading analysis...' : predictions?.analysis ? (
                <pre style={{whiteSpace: 'pre-wrap', fontFamily: 'inherit'}}>
                  {predictions.analysis.substring(0, 500)}
                  {predictions.analysis.length > 500 ? '...' : ''}
                </pre>
              ) : 'No analysis available'}
            </div>
          </div>
        </aside>
      </main>

      <footer>© 2025 CTI Dashboard — Predictions Module</footer>
    </>
  );
};

export default Predictions;
