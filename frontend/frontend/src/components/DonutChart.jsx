import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Reusable donut chart component
// Props:
// - data: [{ name: string, value: number }]
// - colors: { [name]: '#hex' } OR array of colors
// - height: number
// - innerRadius / outerRadius: numbers
export default function DonutChart({ data = [], colors = {}, height = 280, innerRadius = 70, outerRadius = 110 }) {
  // Normalize data values to ensure non-zero chart
  const safeData = Array.isArray(data) ? data : [];

  // If colors is an object mapping names to colors, use it, otherwise use array fallback
  const colorArray = Array.isArray(colors) ? colors : null;

  return (
    <div style={{ width: '100%', height: height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={safeData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            label
          >
            {safeData.map((entry, index) => {
              const fill = colorArray ? (colorArray[index % colorArray.length]) : (colors[entry.name] || '#8884d8');
              return <Cell key={`cell-${index}`} fill={fill} />;
            })}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
