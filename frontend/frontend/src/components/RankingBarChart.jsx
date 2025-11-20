import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Label, Legend } from 'recharts';

const RankingBarChart = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/ranking_data/")
      .then((res) => res.json())
      .then((data) => setData(data))
      .catch((err) => console.error("Error fetching ranking bar chart data:", err));
  }, []);

  return (
    <div style={{ width: "100%", height: 370, padding: "20px" }}>
        <h2 style={{ textAlign: "center" }}>
            CVE Count by State
        </h2>

        <ResponsiveContainer width="100%" height="100%">
            <BarChart
                data={data}
                margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
            >

                <CartesianGrid strokeDasharray="3 3"/>
                <XAxis
                    dataKey="state"
                    angle={-45}
                    textAnchor="end"
                    interval={0}
                >
                    <Label value="State" offset={50} position="bottom" />
                </XAxis>

                <YAxis>
                    <Label
                    value="Total CVEs"
                    angle={-90}
                    position="insideLeft"
                    style={{ textAnchor: "middle" }}
                    />
                </YAxis>

                <Tooltip
                   formatter={(value, name) => {
                       if (name === "cve_count") return [`${value} CVEs`, "CVE Count"];
                       if (name === "avg_epss") return [value.toFixed(4), "Avg EPSS"];
                       }}
                   labelFormatter={(label) => {
                       const entry = data.find((d) => d.state === label);
                       return `${entry.state} (Rank #${entry.rank_overall})`;
                       }}
               />

               <Bar dataKey="cve_count" fill="#ff4d4d" />
           </BarChart>
       </ResponsiveContainer>
   </div>
  );
};

export default RankingBarChart;
