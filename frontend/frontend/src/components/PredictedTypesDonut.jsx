import React from 'react';
import DonutChart from './DonutChart';

// PredictedTypesDonut expects predictedTypes: [{ threat_type, probability }]
export default function PredictedTypesDonut({ predictedTypes }) {
  const data = (predictedTypes || []).map(pt => ({ name: pt.threat_type, value: Math.max(0, pt.probability || 0) }));

  // Choose a color palette fallback
  const palette = ['#3b82f6', '#f97316', '#ef4444', '#a78bfa', '#10b981', '#f59e0b'];

  return (
    <div style={{ width: '100%', height: 240 }}>
      <DonutChart data={data} colors={palette} innerRadius={60} outerRadius={90} height={240} />
    </div>
  );
}
