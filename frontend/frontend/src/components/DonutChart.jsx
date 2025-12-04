import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Reusable donut chart component
// Props:
// - data: [{ name: string, value: number }]
// - colors: { [name]: '#hex' } OR array of colors
// - height: number
// - innerRadius / outerRadius: numbers
export default function DonutChart({ data = [], colors = {}, height = 280, innerRadius = 70, outerRadius = 110, onPieEnter, onPieLeave }) {
  // Normalize data values to ensure non-zero chart
  const safeData = Array.isArray(data) ? data : [];

  // If colors is an object mapping names to colors, use it, otherwise use array fallback
  const colorArray = Array.isArray(colors) ? colors : null;

  return (
    <div style={{ width: '100%', height: height, display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
        <PieChart width={200} height={height} margin={{ top: 0, right: 10, bottom: 0, left: 10 }}>
          <Pie
            data={safeData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="45%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            // Disable built-in slice labels to avoid overlapping and clipping
            label={false}
            onMouseEnter={onPieEnter}
            onMouseLeave={onPieLeave}
            stroke="#1f2937"
            strokeWidth={1}
          >
            {safeData.map((entry, index) => {
              const fill = colorArray ? (colorArray[index % colorArray.length]) : (colors[entry.name] || '#8884d8');
              return <Cell key={`cell-${index}`} fill={fill} />;
            })}
          </Pie>
          {/* Styled tooltip matching RankingBarChart's CustomTooltip */}
          <Tooltip content={<DonutCustomTooltip />} />
          <Legend
            verticalAlign="bottom"
            align="center"
            layout="horizontal"
            iconType="circle"
            height={45}
            wrapperStyle={{ 
              fontSize: '9px', 
              paddingTop: '0px',
              width: '100%',
              lineHeight: '14px'
            }}
            formatter={(value) => <span style={{ color: '#e5e7eb' }}>{value}</span>}
          />
        </PieChart>
    </div>
  );
}

  function DonutCustomTooltip({ active, payload, label }) {
    if (!active || !payload || !payload.length) return null;
    const p = payload[0];
    const obj = p.payload || {};
    const name = obj.name || label || '';
    const value = obj.value != null ? obj.value : (p.value != null ? p.value : null);
    const formatted = typeof value === 'number' ? (Number.isInteger(value) ? value : Math.round(value * 100) / 100) : value;

    const style = {
      background: '#111827',
      color: '#e5e7eb',
      padding: '8px 10px',
      borderRadius: 8,
      border: '1px solid #1f2937',
    };

    return (
      <div style={style}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#e5e7eb' }}>{name}</div>
        <div style={{ fontSize: 12, color: '#e5e7eb', marginTop: 6 }}>{String(formatted)}</div>
      </div>
    );
  }
