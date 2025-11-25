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
import InfoModal from './components/InfoModal';
import { useNavigation, useFilters, useMetrics, useThreatData, useInsights } from './context/AppContext';

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
  const [showEpssInfo, setShowEpssInfo] = useState(false);
  const [showISPInfo, setShowISPInfo] = useState(false);
  const [showRankingsInfo, setShowRankingsInfo] = useState(false);




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
            <header>
        <div className="title">Cyber Threat Intelligence</div>
        <div className="subtitle">
          This platform informs everyday users on cyber attacks across the United States.
        </div>

        <div className="toolbar">
          <select 
            className="select" 
            aria-label="Year filter" 
            value={filters.year || 'Year'}
            onChange={(e) => setFilter('year', e.target.value === 'Year' ? null : e.target.value)}
          >
            <option>Year</option><option>2023</option><option>2024</option><option>2025</option>
          </select>


          <select 
            className="select" 
            aria-label="Risk level" 
            value={filters.riskLevel || 'Risk Level'}
            onChange={(e) => setFilter('riskLevel', e.target.value === 'Risk Level' ? null : e.target.value)}
          >
            <option>Risk Level</option><option>High</option><option>Medium</option><option>Low</option>
          </select>

          <DashboardPDFExport />
          
        </div>
      </header>

      <main>
        {/* KPIs */}
        <section className="panel" style={{gridColumn: '1 / 2'}}>
          <h3>Key Metrics</h3>
          <div className="kpis">
            {metrics && metrics.totalIncidents == null ? (
              <div style={{ fontStyle: 'italic', color: 'var(--muted)' }}>Loading metrics...</div>
            ) : (
              <>
                <div className="kpi"><div className="label">Total Cyber Incidents</div><div className="value">{metrics && metrics.totalIncidents != null ? metrics.totalIncidents.toLocaleString() : '—'}</div></div>
                <div className="kpi"><div className="label">Exposure Score (0–100)
                  <button type="button" onClick={() => setShowExposureInfo(true)} aria-label="Exposure score info" style={{ marginLeft: 8, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}>ℹ️</button>
                </div><div className="value">{metrics && metrics.exposureScore != null ? metrics.exposureScore : '—'}</div></div>
                <div className="kpi">
                  <div className="label">Top-5 State Concentration (%)
                    <button type="button" onClick={() => setShowTop5Info(true)} aria-label="Top5 concentration info" style={{ marginLeft: 8, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}>ℹ️</button>
                  </div>
                  <div className="value">{metrics && metrics.top5ConcentrationPercent != null ? `${metrics.top5ConcentrationPercent}%` : '—'}</div>
                </div>

                <div className="kpi">
                  <div className="label">Active States (%)
                    <button type="button" onClick={() => setShowActiveStatesInfo(true)} aria-label="Active states info" style={{ marginLeft: 8, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}>ℹ️</button>
                  </div>
                  <div className="value">{metrics && metrics.activeStatesPercent != null ? `${metrics.activeStatesPercent}%` : '—'}</div>
                </div>
              </>
            )}
          </div>
          <InfoModal open={showRankingsInfo} onClose={() => setShowRankingsInfo(false)} title="Rankings">
            <p>
              The Rankings chart shows the top items (threat types, actors, or technologies) ordered by the selected metric (frequency, impact or score).
              Use it to quickly see which items are most prominent in the dataset and track changes over time.
            </p>
            <ul style={{ marginTop: 8 }}>
              <li><strong>What it shows:</strong> relative ranking by the chosen metric (e.g. incident count or estimated impact).</li>
              <li><strong>How to use:</strong> click an item to drill into details where supported.</li>
              <li><strong>Limitations:</strong> rankings aggregate upstream data sources and may be biased by reporting differences; use alongside the heatmap for context.</li>
            </ul>
            <p style={{ marginTop: 8 }}>
              Tip: combine the Rankings view with filters (heatmap, year, and risk level) to produce targeted leaderboards for your operational priorities.
            </p>
          </InfoModal>
        </section>

            {/* Heatmap */}
            <section className="panel" style={{ gridColumn: '1 / 2' }}>
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
                  ℹ️
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

        {/* Charts Section - Historical Data (Not AI Predictions) */}
            <section className="panel charts-full-width">
              <h3>Threat Analytics</h3>
              <div className="subtitle" style={{ marginBottom: '1rem', color: 'var(--muted)' }}>
                {/* TO DO: add subtitle that changes based on what filters are on currently */}
              </div>
              <div className="charts">
                <div className="chart-box" aria-label="Incident severity distribution" data-dashboard-chart-id="incident-severity">
                  <div className="chart-header">
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <h3 className="chart-title" style={{ margin: 0 }}>Exploit Probability Score (EPSS)</h3>
                      <button
                        type="button"
                        title="What the EPSS chart shows"
                        style={{
                          marginLeft: 8,
                          fontSize: 12,
                          color: 'var(--muted)',
                          cursor: 'pointer',
                          background: 'transparent',
                          border: 'none',
                          padding: 0,
                        }}
                        aria-label="EPSS info"
                        onClick={() => setShowEpssInfo(true)}
                      >
                        ℹ️
                      </button>
                    </div>
                  </div>
                  <div className="chart-content">
                    <div className="chart-container" style={{ height: '280px', width: '100%' }}>
                      <div style={{ height: '340px', width: '100%' }}>
                        <StateEpssChart />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="chart-box" aria-label="IPS" data-dashboard-chart-id="internet-provider">
                  <div className="chart-header">
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <h3 className="chart-title" style={{ margin: 0 }}>Internet Provider Rankings </h3>
                      <button
                        type="button"
                        title="What the ISP chart shows"
                        style={{
                          marginLeft: 8,
                          fontSize: 12,
                          color: 'var(--muted)',
                          cursor: 'pointer',
                          background: 'transparent',
                          border: 'none',
                          padding: 0,
                        }}
                        aria-label="ISP info"
                        onClick={() => setShowISPInfo(true)}
                      >
                        ℹ️
                      </button>
                    </div>
                  </div>
                  <div className="chart-content">
                    <div className="chart-container" style={{ height: '280px', width: '100%' }}>
                      <InternetProviderChart/>
                    </div>
                  </div>
                </div>

                <div className="chart-box" aria-label="Top cves ranked" data-dashboard-chart-id="vulnerable-tech">
                  <div className="chart-header">
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <h3 className="chart-title" style={{ margin: 0 }}>CVE Rankings</h3>
                      <button
                        type="button"
                        title="What the rankings chart shows"
                        style={{
                          marginLeft: 8,
                          fontSize: 12,
                          color: 'var(--muted)',
                          cursor: 'pointer',
                          background: 'transparent',
                          border: 'none',
                          padding: 0,
                        }}
                        aria-label="Rankings info"
                        onClick={() => setShowRankingsInfo(true)}
                      >
                        ℹ️
                      </button>
                    </div>
                  </div>
                  <div className="chart-content">
                    <div className="chart-container" style={{ height: '360px', width: '100%' }}>
                      <div style={{ height: '100%', width: '100%' }}>
                        <RankingBarChart />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
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
                    <p><strong>Top Threat Types:</strong> {Array.isArray(insights.topThreatTypes) ? (insights.topThreatTypes.length ? insights.topThreatTypes.join(', ') : '—') : '—'}</p>
                    <p><strong>Notes:</strong> {insights.notes || '—'}</p>
                  </>
                )}
              </div>
            </aside>
</main>

            <InfoModal
                    open={showEpssInfo} onClose={() => setShowEpssInfo(false)} title="Exploit Prediction Scoring System (EPSS)">
                      <p>
                        The EPSS chart shows the distribution of Exploit Prediction Scoring System (EPSS) scores for known vulnerabilities in the dataset.
                        EPSS scores estimate the likelihood of exploitation based on historical data and characteristics of the vulnerabilities.
                      </p>
                      <ul style={{ marginTop: 8 }}>
                        <li><strong>What it shows:</strong> distribution of EPSS scores across observed vulnerabilities.</li>
                        <li><strong>How to use:</strong> use the chart to understand the prevalence of high-risk vulnerabilities in the dataset.</li>
                        <li><strong>Limitations:</strong> EPSS is a probabilistic model and should be used alongside other risk assessment methods.</li>
                      </ul>
                      <p style={{ marginTop: 8 }}>
                        Tip: focus on vulnerabilities with high EPSS scores for prioritizing mitigation efforts.
                      </p>
                    
                  </InfoModal>

              <InfoModal
                    open={showISPInfo} onClose={() => setShowISPInfo(false)} title="Internet Provider Rankings">
                      <p>
                        The Internet Provider Rankings chart displays the top states by total cyber incident count, or when a state is selected, shows the top Internet Service Providers (ISPs) within that state.
                      </p>
                      <ul style={{ marginTop: 8 }}>
                        <li><strong>What it shows:</strong> Top 10 states by incident volume (default view), or top ISPs for a selected state with their incident counts.</li>
                        <li><strong>How to use:</strong> Click a state on the heatmap to drill down into ISP-level data. The chart dynamically switches between state-level and ISP-level views.</li>
                        <li><strong>Limitations:</strong> ISP data is based on network attribution and may not reflect the actual victim organization. Some incidents may be attributed to hosting providers or VPN services rather than end-user ISPs.</li>
                      </ul>
                      <p style={{ marginTop: 8 }}>
                        This visualization helps identify geographic concentration of threats and which network infrastructure providers are most affected by cyber incidents.
                      </p>
                    
                  </InfoModal>

            {/* Rankings Info Modal */}

            <InfoModal open={showRankingsInfo} onClose={() => setShowRankingsInfo(false)} title="Rankings">
              <p>
                The Rankings chart shows the top items (threat types, actors, or technologies) ordered by the selected metric (frequency, impact or score).
                Use it to quickly see which items are most prominent in the dataset and track changes over time.
              </p>
              <ul style={{ marginTop: 8 }}>
                <li><strong>What it shows:</strong> relative ranking by the chosen metric (e.g. incident count or estimated impact).</li>
                <li><strong>How to use:</strong> click an item to drill into details where supported.</li>
                <li><strong>Limitations:</strong> rankings aggregate upstream data sources and may be biased by reporting differences; use alongside the heatmap for context.</li>
              </ul>
              <p style={{ marginTop: 8 }}>
                Tip: combine the Rankings view with filters (heatmap, year, and risk level) to produce targeted leaderboards for your operational priorities.
              </p>
            </InfoModal>


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

            <footer>© 2025 Cyber Threat Intelligence</footer>
          
          </>
        );
    }
  };

  return (
    <>
      <Navigation />
      {renderPage()}
    </>
  );
}

