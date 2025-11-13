import React, { useState, useEffect, Suspense } from 'react';
import ForecastDisplay from './ForecastDisplay';
import LossBySectorBarChart from './LossBySectorBarChart';
import TopThreatTypesChart from './TopThreatTypesChart';
import PDFExport from './PDFExport';
const PredictedTypesDonut = React.lazy(() => import('./PredictedTypesDonut'));

function PredictedTypesDonutWrapper({ predictedTypes }) {
  return (
    <Suspense fallback={<div style={{height: 240, display:'flex', alignItems:'center', justifyContent:'center'}}>Loading chart...</div>}>
      <PredictedTypesDonut predictedTypes={predictedTypes} />
    </Suspense>
  );
}

// ==========================================
// AUTO-FORECAST CONFIGURATION
// ==========================================
// Set to true to enable automatic weekly forecasts every Monday at 9 AM
// Set to false to disable automatic forecasts (manual only)
const AUTO_FORECAST_ENABLED = false;
// ==========================================

export default function ThreatIntelligence() {
  const [nextScheduledRun, setNextScheduledRun] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [forecastData, setForecastData] = useState(null);

  // Calculate next Monday at 9:00 AM
  const getNextMonday = () => {
    const now = new Date();
    const nextMonday = new Date(now);
    const currentDay = now.getDay();
    const daysUntilMonday = currentDay === 0 ? 1 : (8 - currentDay) % 7;
    
    nextMonday.setDate(now.getDate() + daysUntilMonday);
    nextMonday.setHours(9, 0, 0, 0); // 9:00 AM
    
    // If it's already Monday and past 9 AM, schedule for next Monday
    if (daysUntilMonday === 0 && now.getHours() >= 9) {
      nextMonday.setDate(nextMonday.getDate() + 7);
    }
    
    return nextMonday;
  };

  // Check if it's time to run forecast
  const shouldRunForecast = () => {
    const lastRun = localStorage.getItem('lastForecastRun');
    const now = new Date();
    
    if (!lastRun) return true; // Never run before
    
    const lastRunDate = new Date(lastRun);
    const daysSinceLastRun = (now - lastRunDate) / (1000 * 60 * 60 * 24);
    
    // Run if it's Monday and it's been at least 6 days since last run
    return now.getDay() === 1 && now.getHours() >= 9 && daysSinceLastRun >= 6;
  };

  // Generate forecast
  const generateForecast = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('http://localhost:8000/api/forecast/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          weeks: 4,
          lookback_days: 90
        })
      });

      if (response.ok) {
        localStorage.setItem('lastForecastRun', new Date().toISOString());
        console.log('Weekly forecast generated successfully');
        // Trigger re-fetch in ForecastDisplay component
        window.dispatchEvent(new Event('forecastUpdated'));
      } else {
        console.error('Forecast generation failed');
      }
    } catch (error) {
      console.error('Error generating forecast:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Fetch forecast data for PDF export
  const fetchForecastData = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/forecast/latest/');
      if (response.ok) {
        const data = await response.json();
        setForecastData(data);
      }
    } catch (error) {
      console.error('Error fetching forecast data:', error);
    }
  };

  // Auto-forecast scheduler
  useEffect(() => {
    // Fetch forecast data on mount
    fetchForecastData();

    // Listen for forecast updates
    const handleForecastUpdate = () => {
      fetchForecastData();
    };
    window.addEventListener('forecastUpdated', handleForecastUpdate);

    if (!AUTO_FORECAST_ENABLED) {
      console.log('Auto-forecast disabled by configuration');
      return () => window.removeEventListener('forecastUpdated', handleForecastUpdate);
    }

    // Calculate next Monday
    const nextMonday = getNextMonday();
    setNextScheduledRun(nextMonday);

    // Check every hour if it's time to run
    const checkInterval = setInterval(() => {
      if (shouldRunForecast()) {
        console.log('Running scheduled Monday forecast...');
        generateForecast();
      }
    }, 60 * 60 * 1000); // Check every hour

    // DO NOT check on mount to avoid unnecessary Azure API calls
    // Only the interval timer will trigger forecasts

    return () => {
      clearInterval(checkInterval);
      window.removeEventListener('forecastUpdated', handleForecastUpdate);
    };
  }, []);

  // Manual trigger
  const handleManualGenerate = () => {
    generateForecast();
  };

  return (
    <>
      <header>
        <div className="title">AI-Powered Threat Intelligence</div>
        <div className="subtitle">
          Advanced predictions and insights powered by OpenAI GPT-5 analyzing vulnerability data.
        </div>

        <div className="toolbar">
          <div className="select" style={{display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'default'}}>
            <span style={{fontSize: '0.85rem', color: 'var(--muted)'}}>Forecast Horizon:</span>
            <span style={{fontWeight: '600'}}>4 Weeks</span>
          </div>
          
          <div className="select" style={{display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'default'}}>
            <span style={{fontSize: '0.85rem', color: 'var(--muted)'}}>Analysis Scope:</span>
            <span style={{fontWeight: '600'}}>United States</span>
          </div>
          
          <div className="select" style={{display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'default'}}>
            <span style={{fontSize: '0.85rem', color: 'var(--muted)'}}>Historical Window:</span>
            <span style={{fontWeight: '600'}}>20 Weeks</span>
          </div>
          
          <div className="select" style={{display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'default'}}>
            <span style={{fontSize: '0.85rem', color: 'var(--muted)'}}>CVE Lookback:</span>
            <span style={{fontWeight: '600'}}>90 Days</span>
          </div>
          
          <PDFExport forecastData={forecastData} />
        </div>
        
        {/* Auto-forecast status */}
        {AUTO_FORECAST_ENABLED && nextScheduledRun && (
          <div style={{
            marginTop: '1rem',
            padding: '0.75rem',
            backgroundColor: 'var(--primary)',
            color: 'white',
            borderRadius: '4px',
            fontSize: '0.9rem',
            textAlign: 'center'
          }}>
            Next automatic forecast: {nextScheduledRun.toLocaleString('en-US', {
              weekday: 'long',
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit'
            })}
          </div>
        )}
      </header>

      <main>

        {/* Forecast Accuracy Metrics */}
        <section className="panel" style={{gridColumn: '1 / -1'}}>
          <h3>Forecast Accuracy & Performance</h3>
          <div className="kpis">
            <div className="kpi">
              <div className="label">Average Confidence</div>
              <div className="value">
                {forecastData?.predictions && forecastData.predictions.length > 0
                  ? `${Math.round(
                      (forecastData.predictions.reduce((sum, p) => sum + (p.confidence || 0), 0) / 
                       forecastData.predictions.length) * 100
                    )}%`
                  : '—'}
              </div>
            </div>
            <div className="kpi">
              <div className="label">Average Spike Probability</div>
              <div className="value">
                {forecastData?.predictions && forecastData.predictions.length > 0
                  ? `${Math.round(
                      (forecastData.predictions.reduce((sum, p) => sum + (p.spike_probability || 0), 0) / 
                       forecastData.predictions.length) * 100
                    )}%`
                  : '—'}
              </div>
            </div>
            <div className="kpi">
              <div className="label">CVEs Analyzed</div>
              <div className="value">
                {forecastData?.total_threats || '100'}
              </div>
            </div>
            <div className="kpi">
              <div className="label">Monthly Predicted Attacks</div>
              <div className="value">
                {typeof forecastData?.monthly_predicted_attacks === 'number'
                  ? forecastData.monthly_predicted_attacks.toLocaleString()
                  : '—'}
              </div>
            </div>
          </div>
        </section>

        {/* Key Signals chips and predicted types summary */}
        <section className="panel" style={{gridColumn: '1 / -1'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <h3 style={{margin: 0}}>Key Signals & Predicted Types</h3>
            <div style={{fontSize: '0.9rem', color: 'var(--muted)'}}>
              These are model-predicted signals and predicted threat-type distribution.
            </div>
          </div>

          <div style={{marginTop: '0.75rem'}}>
            {/* Key signals chips */}
            <div style={{display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem'}}>
              {forecastData?.key_signals_user_friendly && forecastData.key_signals_user_friendly.length > 0 ? (
                forecastData.key_signals_user_friendly.map((s, i) => (
                  <div key={`ks-${i}`} className="chip" title={`${s.type} — score: ${Math.round((s.score || 0) * 100)}%`}>
                    <span style={{fontWeight: 600}}>{s.label}</span>
                    <span style={{marginLeft: '0.5rem', color: 'var(--muted)', fontSize: '0.85rem'}}> {Math.round((s.score || 0) * 100)}%</span>
                  </div>
                ))
              ) : (
                <div style={{color: 'var(--muted)'}}>No key signals available yet.</div>
              )}
            </div>

            {/* Predicted threat types list */}
            <div style={{display: 'flex', gap: '1rem', alignItems: 'flex-start'}}>
              <div style={{flex: 1, display: 'flex', gap: '1rem'}}>
                <div style={{flex: 1}}>
                  {forecastData?.predicted_threat_types && forecastData.predicted_threat_types.length > 0 ? (
                    <ul style={{listStyle: 'none', padding: 0, margin: 0}}>
                      {forecastData.predicted_threat_types.map((pt, idx) => (
                        <li key={`pt-${idx}`} style={{display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px dashed rgba(255,255,255,0.03)'}}>
                          <div style={{fontWeight: 600}}>{pt.threat_type}</div>
                          <div style={{color: 'var(--muted)'}}>{Math.round((pt.probability || 0) * 100)}%</div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div style={{color: 'var(--muted)'}}>No model-predicted threat types available yet.</div>
                  )}
                </div>

                {/* Donut chart moved to charts section below */}
              </div>
            </div>
          </div>
        </section>

        
        {/* AI Forecast Section - Full Width */}
        <section className="panel" style={{gridColumn: '1 / -1'}}>
          <ForecastDisplay />
        </section>

        {/* Charts Section */}
        <section className="panel charts-full-width">
          <h3>AI-Powered Analytics & Insights</h3>
          <div className="charts">
           
            {/* Removed: Threat Trend Predictions and Geographic Threat Forecast as requested */}

            <div className="chart-box" aria-label="Predicted threat types donut" data-chart-id="predicted-donut">
              <div className="chart-header">
                <h3 className="chart-title">Predicted Threat Types</h3>
              </div>
              <div className="chart-content">
                <div className="chart-container" style={{height: '280px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                  <div style={{width: 260}}>
                    <PredictedTypesDonutWrapper predictedTypes={forecastData?.predicted_threat_types} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

      </main>

      <footer>© 2025 CTI Dashboard</footer>
    </>
  );
}
