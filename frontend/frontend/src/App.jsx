import React from 'react';
import LossBySectorBarChart from './components/LossBySectorBarChart';
import Navigation from './components/Navigation';
import AboutUs from './components/AboutUs';
import Contact from './components/Contact';
import USHeatmap from './components/USHeatmap';
import { useNavigation, useFilters, useMetrics, useThreatData, useInsights } from './context/AppContext';

export default function App(){
  const { currentPage } = useNavigation();
  const { filters, setFilter } = useFilters();
  const { metrics } = useMetrics();
  const { threatData } = useThreatData();
  const { insights } = useInsights();

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
            aria-label="Sector filter" 
            value={filters.sector || 'Sector'}
            onChange={(e) => setFilter('sector', e.target.value === 'Sector' ? null : e.target.value)}
          >
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

          <select 
            className="select" 
            aria-label="Risk level" 
            value={filters.riskLevel || 'Risk Level'}
            onChange={(e) => setFilter('riskLevel', e.target.value === 'Risk Level' ? null : e.target.value)}
          >
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
            <div className="kpi">
              <div className="label">Total Cyber Incidents</div>
              <div className="value">{metrics.totalIncidents ?? '—'}</div>
            </div>
            <div className="kpi">
              <div className="label">Average Loss / Incident</div>
              <div className="value">{metrics.averageLoss ? `$${metrics.averageLoss.toLocaleString()}` : '—'}</div>
            </div>
            <div className="kpi">
              <div className="label">Exposure Score (0–100)</div>
              <div className="value">{metrics.exposureScore ?? '—'}</div>
            </div>
            <div className="kpi">
              <div className="label">KEV / Active Exploits</div>
              <div className="value">{metrics.kevActiveExploits ?? '—'}</div>
            </div>
          </div>
        </section>

        {/* Heatmap */}
        <section className="panel" style={{gridColumn: '1 / 2'}}>
          <h3>Threat Activity Heatmap</h3>
          <div className="heatmap" aria-label="Geographic heatmap">
            <USHeatmap />
          </div>
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
                <div className="chart-container" style={{height: '280px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)'}}>
                  🍩 Donut Chart Coming Soon
                </div>
              </div>
            </div>
            
            <div className="chart-box" aria-label="Top threat types ranked">
              <div className="chart-header">
                <h3 className="chart-title">Top Threat Types</h3>
              </div>
              <div className="chart-content">
                <div className="chart-container" style={{height: '280px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)'}}>
                  📊 Bar Chart Coming Soon
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
              {threatData.threatSummary.map((threat, index) => (
                <tr key={index}>
                  <td>{threat.category}</td>
                  <td>{threat.incidents.toLocaleString()}</td>
                  <td>{threat.change > 0 ? '+' : ''}{threat.change}%</td>
                  <td>${threat.avgLoss.toLocaleString()}</td>
                  <td>{threat.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Insights sidebar */}
        <aside className="panel" style={{gridColumn: '2 / 3', gridRow: '1', alignSelf: 'start'}}>
          <h3>Insights</h3>
          <div className="list">
            <p><strong>Highest Rate:</strong> <span className="chip">{insights.highestRate}</span></p>
            <p><strong>Lowest Rate:</strong> <span className="chip">{insights.lowestRate}</span></p>
            <p><strong>Top Threat Types:</strong> {insights.topThreatTypes.join(', ')}</p>
            <p><strong>Notes:</strong> {insights.notes}</p>
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
      <Navigation />
      {renderPage()}
    </>
  );
}

