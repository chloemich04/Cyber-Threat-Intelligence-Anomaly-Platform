// Uses 'threat/top-types/' endpoint to get the needed data (top threat types) for this bar chart

import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

const TopThreatTypesChart = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/threat/top-types/")
      .then((res) => res.json())
      .then((data) => setData(data))
      .catch((err) => console.error("Error fetching top threat types:", err));
  }, []);

  return (
    <section className="panel" style={{ gridColumn: '1 / 3' }}>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="threat_type" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="count" fill="#007bff" name="Incidents" />
        </BarChart>
      </ResponsiveContainer>
    </section>
  );
};

export default TopThreatTypesChart;
