import React, { useState, useEffect } from 'react';
import Navigation from './components/Navigation';
import AboutUs from './components/AboutUs';
import Contact from './components/Contact';
import ThreatIntelligence from './components/ThreatIntelligence';
import DashboardPDFExport from './components/DashboardPDFExport';
import RankingBarChart from "./components/RankingBarChart"
import USHeatmap from './components/USHeatmap';
import StateEpssChart from './components/StateEpssChart'
import InternetProviderChart from './components/InternetProviderChart'
import TabbedGraphs from './components/TabbedGraphs';
import InfoModal from './components/InfoModal';
import InfoIcon from './components/InfoIcon';
import { useNavigation, useFilters, useMetrics, useThreatData, useInsights } from './context/AppContext';
import { SelectedStateProvider } from './context/SelectedStateContext';

export default function App(){
  const [showTop5Info, setShowTop5Info] = useState(false);
  const [showActiveStatesInfo, setShowActiveStatesInfo] = useState(false);
  const [showExposureInfo, setShowExposureInfo] = useState(false);
  const { currentPage } = useNavigation();
  const { filters, setFilter } = useFilters();
  const { metrics } = useMetrics();
  const { threatData } = useThreatData();
  const { insights, reloadInsights } = useInsights();
  try {
    console.debug('App render - insights from context:', insights);
  } catch (e) {
    // ignore logging failures in older browsers
  }

  const [threats, setThreats] = useState([]);
  const [showHeatmapInfo, setShowHeatmapInfo] = useState(false);




  const renderPage = () => {
    switch(currentPage) {
      case 'about':
        return <AboutUs />;
      case 'contact':
        return <Contact />;
      case 'threat-intelligence':
        return <ThreatIntelligence />;
      case 'dashboard':
      default:
        return (
          <>
            <header className="about-hero">
              <h1 className="about-title">ThreatLens</h1>
              <p className="about-subtitle">Informs everyday users on cyber attacks across the United States.</p>

              <div className="toolbar">
                <DashboardPDFExport />
              </div>
            </header>

      <main>
        {/* KPIs */}
        <section className="panel" style={{gridColumn: '1 / 2'}}>
          <h3>Key Metrics</h3>
          <div className="kpis" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
            {metrics && metrics.totalIncidents == null ? (
              <div style={{ fontStyle: 'italic', color: 'var(--muted)' }}>Loading metrics...</div>
            ) : (
              <>
                <div className="kpi"><div className="label">Total Cyber Incidents</div><div className="value">{metrics && metrics.totalIncidents != null ? metrics.totalIncidents.toLocaleString() : '—'}</div></div>
                <div className="kpi"><div className="label">Exposure Score (0–100)
                  <button type="button" onClick={() => setShowExposureInfo(true)} aria-label="Exposure score info" style={{ marginLeft: 8, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}>
                    <InfoIcon size={12} />
                  </button>
                </div><div className="value">{metrics && metrics.exposureScore != null ? metrics.exposureScore : '—'}</div></div>
                <div className="kpi">
                  <div className="label">Top-5 State Concentration (%)
                    <button type="button" onClick={() => setShowTop5Info(true)} aria-label="Top5 concentration info" style={{ marginLeft: 8, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}>
                      <InfoIcon size={12} />
                    </button>
                  </div>
                  <div className="value">{metrics && metrics.top5ConcentrationPercent != null ? `${metrics.top5ConcentrationPercent}%` : '—'}</div>
                </div>

                <div className="kpi">
                  <div className="label">Active States (%)
                    <button type="button" onClick={() => setShowActiveStatesInfo(true)} aria-label="Active states info" style={{ marginLeft: 8, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}>
                      <InfoIcon size={12} />
                    </button>
                  </div>
                  <div className="value">{metrics && metrics.activeStatesPercent != null ? `${metrics.activeStatesPercent}%` : '—'}</div>
                </div>
              </>
            )}
          </div>
        </section>

            {/* Heatmap */}
            <section className="panel" style={{ gridColumn: '1 / 2', gridRow: '2' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ margin: 0 }}>Threat Activity Heatmap</h3>
                <button
                  type="button"
                  title="What the heatmap shows"
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
                  aria-label="Threat activity heatmap info"
                  onClick={() => setShowHeatmapInfo(true)}
                >
                  <InfoIcon size={14} />
                </button>
              </div>
              <div className="heatmap" style={{ width: '100%', height: '500px' }} aria-label="Geographic heatmap">
                <USHeatmap />
              </div>
              <div className="legend"><span>Low</span>
                <div className="bar" aria-hidden="true"></div><span>High</span>
              </div>

              <div className="legend-container" style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <div style={{ width: '16px', height: '16px', backgroundColor: '#555', borderRadius: '4px', border: '1px solid #fff' }}></div>
                  <span>No Data</span>
                </div>
              </div>

              <InfoModal open={showHeatmapInfo} onClose={() => setShowHeatmapInfo(false)} title="Threat Activity Heatmap">
                <p>
                  The Threat Activity Heatmap visualizes geographic intensity of observed threat activity across regions. Color
                  intensity indicates relative activity (darker = more activity) over the selected timeframe.
                </p>
                <ul style={{ marginTop: 8 }}>
                  <li><strong>What it shows:</strong> aggregated counts or scores mapped to geography — use it to spot regional hotspots.</li>
                  <li><strong>How to use:</strong> use the legend to interpret intensity and click on a state to see more information.</li>
                  <li><strong>Timeframe:</strong> the map reflects the dataset's configured window (see year filter in the toolbar).</li>
                </ul>
                <p style={{ marginTop: 8 }}>
                  Data sources include CVE activity, exploit telemetry, and aggregated incident reports. Use this map as situational awareness, not a definitive attribution.
                </p>
              </InfoModal>
            </section>

            {/* Tabbed Graphs - Right of Heatmap */}
            <section className="panel" style={{ gridColumn: '2 / 3', gridRow: '2' }}>
              <TabbedGraphs />
            </section>

            {/* Insights sidebar */}
            <aside className="panel" style={{ gridColumn: '2 / 3', gridRow: '1', alignSelf: 'start' }}>
              <h3>Insights</h3>
              <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
              </div>

              <div className="list" style={{ marginTop: 8 }}>
                {(!insights || !(insights.highestRate || (Array.isArray(insights.topThreatTypes) && insights.topThreatTypes.length) || insights.notes)) ? (
                  <p style={{ fontStyle: 'italic', color: 'var(--muted)' }}>Loading insights...</p>
                ) : (
                  <>
                    <p><strong>Highest Rate:</strong> <span className="chip">{insights.highestRate || '—'}</span></p>
                    <p>
                      <strong>Lowest Rate:</strong>
                      {Array.isArray(insights.lowestRates) && insights.lowestRates.length ? (
                        <span style={{ marginLeft: 8 }}>
                          {insights.lowestRates.map((s, idx) => (
                            <span key={idx} className="chip" style={{ marginRight: 8 }}>{s}</span>
                          ))}
                        </span>
                      ) : (
                        <span className="chip" style={{ marginLeft: 8 }}>{insights.lowestRate || '—'}</span>
                      )}
                    </p>
                    <p><strong>Notes:</strong> {insights.notes || 'An issue was discovered in Adobe Acrobat Reader 2018.009.20050 and earlier versions. This vulnerability occurs as a result of computation that reads data that is past the end of the target buffer; the computation is part of the image conversion engine when processing Enhanced Metafile Format (EMF) data that embeds an image in the bitmap (BMP) file format. A successful attack can lead to sensitive data exposure.'}</p>
                  </>
                )}
              </div>
            </aside>
</main>

            {/* KPI Info Modals */}
            <InfoModal open={showTop5Info} onClose={() => setShowTop5Info(false)} title="Top-5 concentration">
              <p><strong>Top-5 State Concentration (%)</strong>: the percent of total incidents that occurred in the five states with the highest incident counts. Higher values indicate concentration in fewer states.</p>
              <p style={{ marginTop: 8 }}><em>Data quality note:</em> derived from the heatmap aggregation; if overall counts are very low the metric may be unreliable.</p>
            </InfoModal>

            <InfoModal open={showActiveStatesInfo} onClose={() => setShowActiveStatesInfo(false)} title="Active states">
              <p><strong>Active States (%)</strong>: percent of states reporting any incidents in the current filtered dataset. Useful to understand geographic spread.</p>
              <p style={{ marginTop: 8 }}><em>Data quality note:</em> this is a simple count-based metric computed from the heatmap mappedData and is robust to sparse telemetry.</p>
            </InfoModal>

            

            <InfoModal open={showExposureInfo} onClose={() => setShowExposureInfo(false)} title="Exposure Score">
              <p><strong>Exposure Score (0–100)</strong>: a composite heuristic that combines severity (CVSS) and incident volume into a single 0–100 score to help prioritize attention.</p>
              <p style={{ marginTop: 8 }}><strong>How it's computed:</strong></p>
              <ul style={{ marginTop: 8 }}>
                <li><strong>CVSS component (0–70):</strong> weighted average CVSS (across states) divided by 10, scaled to 70 points.</li>
                <li><strong>Incident volume component (0–30):</strong> logarithmically scaled incident counts to reduce sensitivity to extreme spikes, capped at 30 points.</li>
                <li>If per-state CVSS is unavailable, the score falls back to an incident-only signal scaled to 0–100.</li>
              </ul>
              <p style={{ marginTop: 8 }}><em>Interpretation:</em> higher values indicate higher combined severity and volume. Use the score as a directional prioritization aid alongside other KPIs and map context; it is heuristic and explainable, not a definitive risk measurement.</p>
            </InfoModal>

            <footer>© 2025 ThreatLens</footer>
          
          </>
        );
    }
  };

  return (
    <SelectedStateProvider>
      <Navigation />
      {renderPage()}
    </SelectedStateProvider>
  );
}

