import React, { useState, useEffect } from 'react';
import ForecastDisplay from './ForecastDisplay';
import LossBySectorBarChart from './LossBySectorBarChart';
import TopThreatTypesChart from './TopThreatTypesChart';
import PDFExport from './PDFExport';

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
              <div className="label">Threat Types Identified</div>
              <div className="value">
                {forecastData?.threat_types?.length || '—'}
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
            <div className="chart-box" aria-label="Loss amount by sector bar chart" data-chart-id="loss-by-sector">
              <LossBySectorBarChart />
            </div>
            
            <div className="chart-box" aria-label="Top threat types for next 4 weeks" data-chart-id="threat-severity">
              <TopThreatTypesChart />
            </div>
            
            <div className="chart-box" aria-label="Top predicted CVEs" data-chart-id="top-cves">
              <div className="chart-header">
                <h3 className="chart-title">Top Predicted CVE Threats</h3>
              </div>
              <div className="chart-content">
                <div className="chart-container" style={{height: '280px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)'}}>
                  CVE Ranking Coming Soon
                </div>
              </div>
            </div>
            
            <div className="chart-box" aria-label="Threat trend predictions" data-chart-id="threat-trends">
              <div className="chart-header">
                <h3 className="chart-title">Threat Trend Predictions</h3>
              </div>
              <div className="chart-content">
                <div className="chart-container" style={{height: '280px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)'}}>
                  Trend Analysis Coming Soon
                </div>
              </div>
            </div>
            
            <div className="chart-box" aria-label="Geographic threat forecast" data-chart-id="geographic">
              <div className="chart-header">
                <h3 className="chart-title">Geographic Threat Forecast</h3>
              </div>
              <div className="chart-content">
                <div className="chart-container" style={{height: '280px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)'}}>
                  Geographic Predictions Coming Soon
                </div>
              </div>
            </div>
          </div>
        </section>

      </main>

      <footer>© 2025 CTI Dashboard — AI-Powered Threat Intelligence</footer>
    </>
  );
}
