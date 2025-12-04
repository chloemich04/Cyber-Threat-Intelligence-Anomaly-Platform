import React, { useState, useEffect } from 'react';
import StateEpssChart from './StateEpssChart';
import InternetProviderChart from './InternetProviderChart';
import RankingBarChart from './RankingBarChart';
import InfoModal from './InfoModal';
import InfoIcon from './InfoIcon';
import './TabbedGraphs.css';
import { useSelectedState } from '../context/SelectedStateContext';

export default function TabbedGraphs() {
  const [activeTab, setActiveTab] = useState('epss');
  const [showEpssInfo, setShowEpssInfo] = useState(false);
  const [showISPInfo, setShowISPInfo] = useState(false);
  const [showRankingsInfo, setShowRankingsInfo] = useState(false);
  const { selectedState, setSelectedState } = useSelectedState();
  const [forceRenderAll, setForceRenderAll] = useState(false);

  useEffect(() => {
    const handleRenderRequest = () => {
      // Render all charts offscreen for PDF capture, then notify when ready
      setForceRenderAll(true);
      // Allow a tick for React to render the offscreen charts; keep them rendered briefly so exporter can capture
      setTimeout(() => {
        setTimeout(() => setForceRenderAll(false), 1200);
      }, 50);
    };

    window.addEventListener('dashboardPDF:renderCharts', handleRenderRequest);
    return () => window.removeEventListener('dashboardPDF:renderCharts', handleRenderRequest);
  }, []);

  const tabs = [
    { id: 'epss', label: 'EPSS', fullLabel: 'Exploit Probability Score (EPSS)' },
    { id: 'isp', label: 'ISP', fullLabel: 'Internet Provider Rankings' },
    { id: 'rankings', label: 'CVE', fullLabel: 'CVE Rankings' }
  ];

  const handleInfoClick = () => {
    switch(activeTab) {
      case 'epss':
        setShowEpssInfo(true);
        break;
      case 'isp':
        setShowISPInfo(true);
        break;
      case 'rankings':
        setShowRankingsInfo(true);
        break;
      default:
        break;
    }
  };

  const getCurrentTitle = () => {
    const tab = tabs.find(t => t.id === activeTab);
    return tab ? tab.fullLabel : '';
  };

  return (
    <div className="tabbed-graphs-container">
      {/* Tab Headers */}
      <div className="tab-headers">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            aria-label={tab.fullLabel}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Graph Content */}
      <div className="tab-content">
        <div className="graph-header">
          <h3 className="graph-title">{getCurrentTitle()}</h3>
          <button
            type="button"
            title="More information"
            className="info-button"
            aria-label={`${getCurrentTitle()} info`}
            onClick={handleInfoClick}
          >
            <InfoIcon size={14} />
          </button>
        </div>

        <div className="graph-wrapper">
          {(activeTab === 'epss' || forceRenderAll) && (
            <div
              className="graph-container epss-graph"
              data-dashboard-chart-id="incident-severity"
              style={activeTab === 'epss' ? undefined : { position: 'fixed', left: 0, top: 0, width: 900, height: 500, opacity: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 9999 }}
            >
              <StateEpssChart injectedData={typeof window !== 'undefined' ? (window.__dashboardPDF_injectedData && window.__dashboardPDF_injectedData['incident-severity']) : null} exportMode={forceRenderAll} />
            </div>
          )}

          {(activeTab === 'isp' || forceRenderAll) && (
            <div
              className="graph-container isp-graph"
              data-dashboard-chart-id="internet-provider"
              style={activeTab === 'isp' ? undefined : { position: 'fixed', left: 0, top: 0, width: 900, height: 500, opacity: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 9999 }}
            >
              <InternetProviderChart injectedData={typeof window !== 'undefined' ? (window.__dashboardPDF_injectedData && window.__dashboardPDF_injectedData['internet-provider']) : null} exportMode={forceRenderAll} />
            </div>
          )}

          {(activeTab === 'rankings' || forceRenderAll) && (
            <div
              className="graph-container rankings-graph"
              data-dashboard-chart-id="vulnerable-tech"
              style={activeTab === 'rankings' ? undefined : { position: 'fixed', left: 0, top: 0, width: 900, height: 500, opacity: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 9999 }}
            >
              <RankingBarChart injectedData={typeof window !== 'undefined' ? (window.__dashboardPDF_injectedData && window.__dashboardPDF_injectedData['vulnerable-tech']) : null} exportMode={forceRenderAll} />
            </div>
          )}
        </div>

        <div className="filter-info">
          <span className="filter-label">Filter (US or particular state)</span>
          {selectedState && (selectedState.name || selectedState.code) ? (
            <div className="selected-state-pill" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginLeft: 12 }}>
              <span style={{ background: '#0b1220', border: '1px solid #1f2937', padding: '6px 10px', borderRadius: 16, color: '#e5e7eb', fontWeight: 700 }}>{selectedState.name || selectedState.code}</span>
            </div>
          ) : (
            <div className="selected-state-pill" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginLeft: 12 }}>
              <span style={{ background: '#0b1220', border: '1px solid #1f2937', padding: '6px 10px', borderRadius: 16, color: '#e5e7eb', fontWeight: 700 }}> US </span>
            </div>
          )}
        </div>
      </div>

      {/* Info Modals */}
      <InfoModal open={showEpssInfo} onClose={() => setShowEpssInfo(false)} title="Exploit Prediction Scoring System (EPSS)">
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

      <InfoModal open={showISPInfo} onClose={() => setShowISPInfo(false)} title="Internet Provider Rankings">
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

      <InfoModal open={showRankingsInfo} onClose={() => setShowRankingsInfo(false)} title="CVE Rankings">
        <p>
          The Rankings chart shows the top CVEs ordered by frequency and impact metrics.
          Use it to quickly see which vulnerabilities are most prominent in the dataset and track changes over time.
        </p>
        <ul style={{ marginTop: 8 }}>
          <li><strong>What it shows:</strong> relative ranking by incident count and estimated impact.</li>
          <li><strong>How to use:</strong> click an item to drill into details where supported.</li>
          <li><strong>Limitations:</strong> rankings aggregate upstream data sources and may be biased by reporting differences; use alongside the heatmap for context.</li>
        </ul>
        <p style={{ marginTop: 8 }}>
          Tip: combine the Rankings view with state filter (heatmap) to produce targeted leaderboards for your operational priorities.
        </p>
      </InfoModal>
    </div>
  );
}
