import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

export default function SeverityDonutChart({ threats }) {
  // Step 1: Count threats by severity
  const severityCounts = threats.reduce((acc, threat) => {
    const level = threat.severity || "Unknown";
    acc[level] = (acc[level] || 0) + 1;
    return acc;
  }, {});

  // Step 2: Format data for Recharts
  const data = Object.entries(severityCounts).map(([name, value]) => ({
    name,
    value,
  }));

  // Step 3: Choose colors for each severity level
  const COLORS = {
    Low: "#4CAF50",
    Medium: "#FFB300",
    High: "#F44336",
    Critical: "#9C27B0",
    Unknown: "#9E9E9E",
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <PieChart width="100%" height={300}>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={80}
          outerRadius={120}
          label
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[entry.name] || "#ccc"} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </div>
  );
}
