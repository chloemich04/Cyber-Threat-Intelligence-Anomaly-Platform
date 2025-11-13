import React from 'react';
import DonutChart from './DonutChart';

export default function SeverityDonutChart({ threats }) {
  // Step 1: Count threats by severity
  const severityCounts = (threats || []).reduce((acc, threat) => {
    const level = threat.severity || 'Unknown';
    acc[level] = (acc[level] || 0) + 1;
    return acc;
  }, {});

  // Step 2: Format data for DonutChart
  const data = Object.entries(severityCounts).map(([name, value]) => ({ name, value }));

  // Step 3: Choose colors for each severity level
  const COLORS = {
    Low: '#4CAF50',
    Medium: '#FFB300',
    High: '#F44336',
    Critical: '#9C27B0',
    Unknown: '#9E9E9E',
  };

  return (
    <div style={{ width: '100%', height: 300 }}>
      <DonutChart data={data} colors={COLORS} innerRadius={70} outerRadius={110} height={300} />
    </div>
  );
}
