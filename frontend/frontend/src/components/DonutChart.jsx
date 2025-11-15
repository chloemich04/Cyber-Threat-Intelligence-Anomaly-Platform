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
    <div style={{ width: '100%', height: height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <ResponsiveContainer width="100%" height="100%">
        {/* reserve space below the chart for the legend using margin and a bottom Legend */}
        <PieChart margin={{ top: 20, right: 10, bottom: 56, left: 10 }}>
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
          >
            {safeData.map((entry, index) => {
              const fill = colorArray ? (colorArray[index % colorArray.length]) : (colors[entry.name] || '#8884d8');
              return <Cell key={`cell-${index}`} fill={fill} />;
            })}
          </Pie>
          <Tooltip formatter={(value, name) => [value, name]} />
          <Legend verticalAlign="bottom" align="center" layout="horizontal" iconType="square" height={36} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
