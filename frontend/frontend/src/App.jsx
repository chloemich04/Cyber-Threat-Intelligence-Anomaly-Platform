import React, { useState, useEffect } from 'react';
import LossBySectorBarChart from './components/LossBySectorBarChart';
import Navigation from './components/Navigation';
import AboutUs from './components/AboutUs';
import Contact from './components/Contact';
import ThreatList from "./components/ThreatList"
import SeverityDonutChart from "./components/SeverityDonutChart"
import TopThreatTypesChart from "./components/TopThreatTypesChart"

export default function App(){
  const [currentPage, setCurrentPage] = useState('dashboard');

  const [threats, setThreats] = useState([]);

  useEffect(() => {
    fetch('http://127.0.0.1:8000/api/threat/')
      .then(res => res.json())
      .then(data => setThreats(data))
      .catch(err => console.error('Error fetching threats:', err));
  }, []);


  const renderPage = () => {
    switch(currentPage) {
      case 'about':
        return <AboutUs />;
      case 'contact':
        return <Contact />;
      case 'dashboard':
      default:
        return (
          <>
            <header>
        <div className="title">Cyber Threat Intelligence & Anomaly Detection Platform</div>
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

          <button className="button primary" type="button">Export PDF/CSV</button>
          <button className="button" type="button">Settings</button>
        </div>
      </header>

      <main>
        {/* KPIs */}
        <section className="panel" style={{gridColumn: '1 / 2'}}>
          <h3>Key Metrics</h3>
          <div className="kpis">
            <div className="kpi"><div className="label">Total Cyber Incidents</div><div className="value">{threats.length}</div></div>
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

        {/* Charts */}
        <section className="panel charts-full-width">
          <h3>Forecast & Charts</h3>
          <div className="charts">
            <div className="chart-box" aria-label="Forecast line chart">
              <div className="chart-header">
                <h3 className="chart-title">Forecast (Incidents / Losses)</h3>
              </div>
              <div className="chart-content">
                <div className="chart-container" style={{height: '280px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)'}}>
                  📈 Line Chart Coming Soon
                </div>
              </div>
            </div>

            <div className="chart-box" aria-label="Loss amount by sector bar chart">
              <LossBySectorBarChart />
            </div>

            <div className="chart-box" aria-label="Incident severity distribution">
              <div className="chart-header">
                <h3 className="chart-title">Incident Severity Distribution</h3>
              </div>
              <div className="chart-content">
                <div className="chart-container" style={{height: '450px', width: '100%'}}>
                  <SeverityDonutChart threats={threats} />
                </div>
              </div>
            </div>

            <div className="chart-box" aria-label="Top threat types ranked">
              <div className="chart-header">
                <h3 className="chart-title">Top Threat Types</h3>
              </div>
              <div className="chart-content">
                <div className="chart-container" style={{height: '600px', width: '100%'}}>
                  <div>
                      <TopThreatTypesChart />
                  </div>
                </div>
              </div>
            </div>

            <div className="chart-box" aria-label="Breach type distribution">
              <div className="chart-header">
                <h3 className="chart-title">Breach Type Distribution</h3>
              </div>
              <div className="chart-content">
                <div className="chart-container" style={{height: '280px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)'}}>
                  🥧 Pie Chart Coming Soon
                </div>
              </div>
            </div>

            <div className="chart-box" aria-label="Top vulnerable technologies">
              <div className="chart-header">
                <h3 className="chart-title">Top Vulnerable Technologies</h3>
              </div>
              <div className="chart-content">
                <div className="chart-container" style={{height: '280px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)'}}>
                  📊 Bar Chart Coming Soon
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

