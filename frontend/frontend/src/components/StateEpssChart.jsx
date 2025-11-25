import React, { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from "recharts";

const StateEpssChart = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    fetch("http://localhost:8000/api/epss_chart/")
      .then((res) => res.json())
      .then((json) => {
        const cleanData = json.map(item => ({
          name: item.name || item.region_code,
          avg_epss: item.avg_epss * 100
        }));
        setData(cleanData);
      });
  }, []);

  return (
    <div style={{ width: "100%", height: 500 }}>
      <h2 className="text-xl font-bold mb-4 text-center">
        Average EPSS Score by State (Highest → Lowest)
      </h2>

      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="name"
            angle={-45}
            textAnchor="end"
            interval={0}
            height={100}
          />
          <YAxis />
          <Tooltip />
          <Bar dataKey="avg_epss" fill="#ff4d4d" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default StateEpssChart;
