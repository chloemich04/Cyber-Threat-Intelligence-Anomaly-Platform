import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

export default function TopStatesDonutChart() {
  const [data, setData] = useState([]);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/internet_chart/")
      .then(res => res.json())
      .then(raw => {
        if (!Array.isArray(raw)) {
          console.error("Unexpected API response:", raw);
          return;
        }

        // Step 1: Sort states by total_count descending
        const sorted = raw.sort((a, b) => b.total_count - a.total_count);

        // Step 2: Take top 10 states
        const top10 = sorted.slice(0, 10);

        // Step 3: Map to Recharts format
        const chartData = top10.map(state => ({
          name: state.region_code,
          value: state.total_count
        }));

        setData(chartData);
      })
      .catch(err => console.error("Error fetching chart data:", err));
  }, []);

  const COLORS = [
    "#0088FE", "#00C49F", "#FFBB28", "#FF8042",
    "#A28CFE", "#FF6699", "#33CC33", "#FF9933",
    "#3399FF", "#CC33FF"
  ];

  if (data.length === 0) return <p>Loading chart...</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <h3>Top 10 States by Total Count</h3>
      <PieChart width={400} height={400}>
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
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </div>
  );
}
