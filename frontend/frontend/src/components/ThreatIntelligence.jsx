import React, { useState, useEffect, Suspense } from 'react';
import ForecastDisplay from './ForecastDisplay';
import { getLatestForecast } from '../utils/forecastCache'; // Ensure forecast cache module is available
import ForecastTimeline from './ForecastTimeline';
import PDFExport from './PDFExport';
import KeySignalsBarChart from './KeySignalsBarChart';
import ForecastRiskMatrix from './ForecastRiskMatrix';
import InfoModal from './InfoModal';
const PredictedTypesDonut = React.lazy(() => import('./PredictedTypesDonut'));

function PredictedTypesDonutWrapper({ predictedTypes }) {
  return (
    <Suspense fallback={<div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading chart...</div>}>
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
  const [showPredictedTypesInfo, setShowPredictedTypesInfo] = useState(false);
  const [showKeySignalsInfo, setShowKeySignalsInfo] = useState(false);
  const [showRiskMatrixInfo, setShowRiskMatrixInfo] = useState(false);

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
          lookback_days: 90,
        }),
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

  // Fetch forecast data for PDF export and charts
  const fetchForecastData = async () => {
    try {
      const data = await getLatestForecast();
      setForecastData(data);
    } catch (error) {
      // keep non-fatal: component is fine without forecast data
      console.error('Error fetching forecast data:', error);
    }
  };

  // Auto-forecast scheduler
  useEffect(() => {
    // Fetch forecast data on mount
    fetchForecastData();

    // Listen for forecast updates (force refresh)
    const handleForecastUpdate = () => {
      fetchForecastData();
      // also invalidate and force-get latest from cache on other listeners
      getLatestForecast({ force: true }).then(d => setForecastData(d)).catch(() => {});
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

    return () => {
      clearInterval(checkInterval);
      window.removeEventListener('forecastUpdated', handleForecastUpdate);
    };
  }, []);

  return (
    <>
      <header>
        <div className="title">AI-Powered Threat Predicted Analytics</div>
        <div className="subtitle">Advanced predictions and insights powered by OpenAI GPT-5 analyzing vulnerability data.</div>

        <div className="toolbar">
          <div className="select" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'default' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Forecast Horizon:</span>
            <span style={{ fontWeight: '600' }}>4 Weeks</span>
          </div>

          <div className="select" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'default' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Analysis Scope:</span>
            <span style={{ fontWeight: '600' }}>United States</span>
          </div>

          <div className="select" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'default' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Historical Window:</span>
            <span style={{ fontWeight: '600' }}>20 Weeks</span>
          </div>

          <div className="select" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'default' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>CVE Lookback:</span>
            <span style={{ fontWeight: '600' }}>90 Days</span>
          </div>

          <PDFExport forecastData={forecastData} />
        </div>

        {/* Auto-forecast status */}
        {AUTO_FORECAST_ENABLED && nextScheduledRun && (
          <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: 'var(--primary)', color: 'white', borderRadius: '4px', fontSize: '0.9rem', textAlign: 'center' }}>
            Next automatic forecast: {nextScheduledRun.toLocaleString('en-US', { weekday: 'long', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
          </div>
        )}
      </header>

      <main>
        {/* Forecast Accuracy Metrics */}
        <section className="panel" style={{ gridColumn: '1 / -1' }}>
          <h3>Forecast Accuracy & Performance</h3>
          <div className="kpis">
            <div className="kpi">
              <div className="label">Average Confidence</div>
              <div className="value">
                {forecastData?.predictions && forecastData.predictions.length > 0
                  ? `${Math.round((forecastData.predictions.reduce((sum, p) => sum + (p.confidence || 0), 0) / forecastData.predictions.length) * 100)}%`
                  : '—'}
              </div>
            </div>

            <div className="kpi">
              <div className="label">Average Spike Probability</div>
              <div className="value">
                {forecastData?.predictions && forecastData.predictions.length > 0
                  ? `${Math.round((forecastData.predictions.reduce((sum, p) => sum + (p.spike_probability || 0), 0) / forecastData.predictions.length) * 100)}%`
                  : '—'}
              </div>
            </div>

            <div className="kpi">
              <div className="label">CVEs Analyzed</div>
              <div className="value">{forecastData?.total_threats || '—'}</div>
            </div>

            <div className="kpi">
              <div className="label">Monthly Predicted Attacks</div>
              <div className="value">
                {typeof forecastData?.monthly_predicted_attacks === 'number' ? forecastData.monthly_predicted_attacks.toLocaleString() : '—'}
              </div>
            </div>
          </div>
        </section>
        {/* Info modals for charts */}
        <InfoModal open={showPredictedTypesInfo} onClose={() => setShowPredictedTypesInfo(false)} title="Predicted Threat Types">
          <p>
            This chart shows the model's breakdown of predicted threat types for the forecast horizon. It summarizes the
            most likely categories (for example, ransomware, phishing, exploitation) based on the signals in the input feed.
          </p>
          <ul style={{ marginTop: 8 }}>
            <li><strong>What it shows:</strong> relative distribution of threat type likelihoods across the forecast window.</li>
            <li><strong>How to use:</strong> use the top categories to prioritize monitoring and rule-tuning for likely threat vectors.</li>
            <li><strong>Limitations:</strong> categories are model-derived and depend on the quality of input signals; validate with telemetry and incident data.</li>
          </ul>
          <p style={{ marginTop: 8 }}>
            Combine this view with key signals and the risk matrix to focus investigations on high-impact, high-confidence threat types.
          </p>
        </InfoModal>

        <InfoModal open={showKeySignalsInfo} onClose={() => setShowKeySignalsInfo(false)} title="Key Signals">
          <p>
            Key Signals are summarized, human-readable indicators (e.g., recent spikes in exploit attempts, notable CVEs, or trending malware families)
            that the model used to inform its forecasts.
          </p>
          <ul style={{ marginTop: 8 }}>
            <li><strong>What it shows:</strong> ranked signals ordered by their contribution to the forecast.</li>
            <li><strong>How to use:</strong> review the top signals to understand why the model expects changes and to collect supporting evidence.</li>
            <li><strong>Why it matters:</strong> signals help bridge model outputs to operational actions—use them when validating alerts or triaging incidents.</li>
          </ul>
          <p style={{ marginTop: 8 }}>
            Signals are suggestions, not confirmations. Cross-check with logs, IDS/EDR alerts, and threat intel before enacting automated responses.
          </p>
        </InfoModal>

        <InfoModal open={showRiskMatrixInfo} onClose={() => setShowRiskMatrixInfo(false)} title="Risk Matrix — Confidence vs Impact">
          <p>
            The risk matrix plots each forecasted week by expected impact (x-axis) and model confidence (y-axis). Points in the top-right
            quadrant represent high-impact, high-confidence items that are strong candidates for prioritization.
          </p>
          <ul style={{ marginTop: 8 }}>
            <li><strong>Quadrants:</strong> top-right = high impact & high confidence; top-left = low impact high confidence; bottom-right = high impact low confidence; bottom-left = low/low.</li>
            <li><strong>How to use:</strong> prioritize investigations in the top-right quadrant; use the confidence interval and signals to decide on automated actions.</li>
            <li><strong>Visualization tip:</strong> hover or click points to see details and drill into associated signals and CVEs.</li>
          </ul>
          <p style={{ marginTop: 8 }}>
            The risk matrix is a triage aid — combine it with business context to set appropriate response levels.
          </p>
        </InfoModal>

        

        {/* AI Forecast Section */}
        <section className="panel" style={{ gridColumn: '1 / -1' }}>
          <ForecastDisplay />
        </section>

        
        {/* Charts Section */}
        <section className="panel charts-full-width">
          <h3>AI-Powered Analytics & Insights</h3>
          <div className="charts">
            <div className="chart-box" aria-label="Predicted threat types donut" data-chart-id="predicted-donut">
              <div className="chart-header">
                <div style={{ display: 'flex', alignItems: 'center'}}>
                  <h3 className="chart-title" style={{ margin: 0, lineHeight: 1 }}>Predicted Threat Types</h3>
                  <button
                    type="button"
                    title="What predicted threat types means"
                    style={{
                      marginLeft: 8,
                      fontSize: 12,
                      color: 'var(--muted)',
                      cursor: 'pointer',
                      background: 'transparent',
                      border: 'none',
                      padding: 0,
                      alignItems: 'center',
                    }}
                    aria-label="Predicted threat types info"
                    onClick={() => setShowPredictedTypesInfo(true)}
                  >
                    ℹ️
                  </button>
                </div>
              </div>
              <div className="chart-content">
                <div className="chart-container" style={{ height: '280px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: 320 }}>
                    <PredictedTypesDonutWrapper predictedTypes={forecastData?.predicted_threat_types} />
                  </div>
                </div>
              </div>
            </div>

            <div className="chart-box" aria-label="key signals bar chart" data-chart-id="key-signals-bar-chart">
              <div className="chart-header">
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <h3 className="chart-title" style={{ margin: 0, lineHeight: 1 }}>Key Signals</h3>
                  <button
                    type="button"
                    title="What key signals means"
                    style={{
                      marginLeft: 8,
                      fontSize: 12,
                      color: 'var(--muted)',
                      cursor: 'pointer',
                      background: 'transparent',
                      border: 'none',
                      padding: 0,
                    }}
                    aria-label="Key signals info"
                    onClick={() => setShowKeySignalsInfo(true)}
                  >
                    ℹ️
                  </button>
                </div>
              </div>
              <div className="chart-content">
                <div className="chart-container" style={{ height: '280px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: '100%', maxWidth: 720 }}>
                    <KeySignalsBarChart signals={forecastData?.key_signals_user_friendly} predictions={forecastData?.predictions} />
                  </div>
                </div>
              </div>
            </div>

            <div className="chart-box" aria-label="risk-matrix" data-chart-id="risk-matrix">
              <div className="chart-header">
                <div style={{ display: 'flex', alignItems: 'center'}}>
                  <h3 className="chart-title" style={{ margin: 0, lineHeight: 1 }}>Risk Matrix — Confidence vs Impact</h3>
                  <button
                    type="button"
                    title="What the risk matrix means"
                    style={{
                      marginLeft: 8,
                      fontSize: 12,
                      color: 'var(--muted)',
                      cursor: 'pointer',
                      background: 'transparent',
                      border: 'none',
                      padding: 0,
                    }}
                    aria-label="Risk matrix info"
                    onClick={() => setShowRiskMatrixInfo(true)}
                  >
                    ℹ️
                  </button>
                </div>
              </div>
              <div className="chart-content">
                <div className="chart-container" style={{ height: '280px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: '100%', maxWidth: 720 }}>
                    <ForecastRiskMatrix predictions={forecastData?.predictions || []} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer>© 2025 Cyber Threat Intelligence</footer>
    </>
  );
}
