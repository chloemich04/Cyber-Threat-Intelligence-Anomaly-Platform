import React, { useState } from 'react';
import Navigation from './components/Navigation';
import AboutUs from './components/AboutUs';
import Contact from './components/Contact';
import ThreatIntelligence from './components/ThreatIntelligence';
import DashboardPDFExport from './components/DashboardPDFExport';

export default function App(){
  const [currentPage, setCurrentPage] = useState('dashboard');

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
          This platform shows basic insight on cyber attacks with helpful visuals like maps, charts, and tables.
        </div>

        <div className="toolbar">
          <select className="select" aria-label="Year filter" defaultValue="Year">
            <option>Year</option><option>2023</option><option>2024</option><option>2025</option>
          </select>

          <select className="select" aria-label="Sector filter" defaultValue="Sector">
            <option>Sector</option>
            <option>Finance & Insurance</option>
            <option>Healthcare</option>
            <option>Education</option>
            <option>Retail & E-Commerce</option>
            <option>Manufacturing</option>
            <option>Energy & Utilities</option>
            <option>Technology & SaaS</option>
            <option>Transportation & Logistics</option>
          </select>

          <select className="select" aria-label="Risk level" defaultValue="Risk Level">
            <option>Risk Level</option><option>High</option><option>Medium</option><option>Low</option>
          </select>

          <DashboardPDFExport />
          <button className="button" type="button">Settings</button>
        </div>
      </header>

      <main>
        {/* KPIs */}
        <section className="panel" style={{gridColumn: '1 / 2'}}>
          <h3>Key Metrics</h3>
          <div className="kpis">
            <div className="kpi"><div className="label">Total Cyber Incidents</div><div className="value">—</div></div>
            <div className="kpi"><div className="label">Average Loss / Incident</div><div className="value">—</div></div>
            <div className="kpi"><div className="label">Exposure Score (0–100)</div><div className="value">—</div></div>
            <div className="kpi"><div className="label">KEV / Active Exploits</div><div className="value">—</div></div>
          </div>
        </section>

        {/* Heatmap */}
        <section className="panel" style={{gridColumn: '1 / 2'}}>
          <h3>Threat Activity Heatmap</h3>
          <div className="heatmap" aria-label="Geographic heatmap placeholder">MAP / HEATMAP</div>
          <div className="legend"><span>Low</span><span className="bar" aria-hidden="true"></span><span>High</span></div>
        </section>

        {/* Charts Section - Historical Data (Not AI Predictions) */}
        <section className="panel charts-full-width">
          <h3>Historical Threat Analytics</h3>
          <div className="subtitle" style={{marginBottom: '1rem', color: 'var(--muted)'}}>
            Current and historical threat data (For AI predictions, see Threat Intelligence page)
          </div>
          <div className="charts">
            <div className="chart-box" aria-label="Incident severity distribution" data-dashboard-chart-id="incident-severity">
              <div className="chart-header">
                <h3 className="chart-title">Incident Severity Distribution</h3>
              </div>
              <div className="chart-content">
                <div className="chart-container" style={{height: '280px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)'}}>
                  🍩 Donut Chart Coming Soon
                </div>
              </div>
            </div>
            
            <div className="chart-box" aria-label="Top threat types ranked" data-dashboard-chart-id="top-threats">
              <div className="chart-header">
                <h3 className="chart-title">Top Threat Types</h3>
              </div>
              <div className="chart-content">
                <div className="chart-container" style={{height: '280px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)'}}>
                  📊 Bar Chart Coming Soon
                </div>
              </div>
            </div>
            
            <div className="chart-box" aria-label="Breach type distribution" data-dashboard-chart-id="breach-types">
              <div className="chart-header">
                <h3 className="chart-title">Breach Type Distribution</h3>
              </div>
              <div className="chart-content">
                <div className="chart-container" style={{height: '280px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)'}}>
                  🥧 Pie Chart Coming Soon
                </div>
              </div>
            </div>
            
            <div className="chart-box" aria-label="Top vulnerable technologies" data-dashboard-chart-id="vulnerable-tech">
              <div className="chart-header">
                <h3 className="chart-title">Top Vulnerable Technologies</h3>
              </div>
              <div className="chart-content">
                <div className="chart-container" style={{height: '280px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)'}}>
                  📊 Bar Chart Coming Soon
                </div>
              </div>
            </div>
            
            <div className="chart-box" aria-label="Attack vector trends" data-dashboard-chart-id="attack-vectors">
              <div className="chart-header">
                <h3 className="chart-title">Attack Vector Trends</h3>
              </div>
              <div className="chart-content">
                <div className="chart-container" style={{height: '280px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)'}}>
                  📈 Line Chart Coming Soon
                </div>
              </div>
            </div>
            
            <div className="chart-box" aria-label="Response time metrics" data-dashboard-chart-id="response-times">
              <div className="chart-header">
                <h3 className="chart-title">Incident Response Times</h3>
              </div>
              <div className="chart-content">
                <div className="chart-container" style={{height: '280px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)'}}>
                  ⏱️ Metrics Coming Soon
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Threat summary table */}
        <section className="panel" style={{gridColumn: '1 / 2'}}>
          <h3>Threat Summary</h3>
          <table className="table" aria-label="Threat summary table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Incidents</th>
                <th>% Change</th>
                <th>Avg Loss</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Phishing</td>
                <td>1,245</td>
                <td>+12%</td>
                <td>$8,400</td>
                <td>Rising</td>
              </tr>
              <tr>
                <td>Ransomware</td>
                <td>530</td>
                <td>+4%</td>
                <td>$58,000</td>
                <td>Stable</td>
              </tr>
              <tr>
                <td>Malware</td>
                <td>890</td>
                <td>-6%</td>
                <td>$11,200</td>
                <td>Falling</td>
              </tr>
              <tr>
                <td>DDoS</td>
                <td>210</td>
                <td>+1%</td>
                <td>$5,600</td>
                <td>Stable</td>
              </tr>
              <tr>
                <td>Credential Stuffing</td>
                <td>430</td>
                <td>+9%</td>
                <td>$3,700</td>
                <td>Rising</td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* Insights sidebar */}
        <aside className="panel" style={{gridColumn: '2 / 3', gridRow: '1', alignSelf: 'start'}}>
          <h3>Insights</h3>
          <div className="list">
            <p><strong>Highest Rate:</strong> <span className="chip">State A</span></p>
            <p><strong>Lowest Rate:</strong> <span className="chip">State B</span></p>
            <p><strong>Top Threat Types:</strong> Ransomware, Phishing, DDoS</p>
            <p><strong>Notes:</strong> Use this panel for anomaly alerts (e.g., KEV matches, spikes).</p>
          </div>
        </aside>
      </main>

            <footer>© 2025 CTI Dashboard — Skeleton</footer>
          </>
        );
    }
  };

  return (
    <>
      <Navigation onNavigate={setCurrentPage} currentPage={currentPage} />
      {renderPage()}
    </>
  );
}

