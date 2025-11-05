import React, { useState, useEffect } from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";

const stateMap = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
};

const geoUrl = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";

const USHeatmap = () => {
  const [data, setData] = useState({});
  const [selectedState, setSelectedState] = useState(null);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/fake-data/heatmap-data/")
      .then((res) => res.json())
      .then((rawData) => {
        const agg = rawData.reduce((acc, item) => {
          const code = item.region_code;
          if (!acc[code]) acc[code] = { total: 0, count: 0, points: [] };
          acc[code].total += item.epss || 0;
          acc[code].count += 1;
          acc[code].points.push(item);
          return acc;
        }, {});

        const mappedData = {};
        for (const code in stateMap) {
          const name = stateMap[code];
          if (agg[code]) {
            mappedData[name] = {
              avgEpss: agg[code].total / agg[code].count,
              points: agg[code].points,
            };
          } else {
            mappedData[name] = null; // No data
          }
        }

        setData(mappedData);
      })
      .catch((err) => console.error("Error fetching data:", err));
  }, []);

  const getColor = (stateData) => {
    if (!stateData) return "#444"; // Gray for no data
    const avgEpss = stateData.avgEpss;
    const value = Math.min(Math.max(avgEpss, 0), 1);
    const red = Math.floor(255 * value);
    const green = Math.floor(255 * (1 - value));
    return `rgb(${red},${green},50)`;
  };

  return (
    <div style={{ display: "flex", gap: "20px" }}>
      <div style={{ width: "70%" }}>
        <ComposableMap
          projection="geoAlbersUsa"
          projectionConfig={{ scale: 1000, translate: [480, 300] }}
          style={{ width: "100%", height: "500px" }}
        >
          <Geographies geography={geoUrl}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const stateName = geo.properties.name;
                const stateData = data[stateName];

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={getColor(stateData)}
                    stroke="#FFF"
                    onClick={() =>
                      setSelectedState({
                        name: stateName,
                        points: stateData ? stateData.points : [],
                        avgEpss: stateData ? stateData.avgEpss : 0,
                      })
                    }
                    style={{
                      default: { outline: "none" },
                      hover: { fill: "#f39c12", outline: "none" },
                      pressed: { fill: "#e67e22", outline: "none" },
                    }}
                  >
                    <title>
                      {stateName} — Avg EPS:{" "}
                      {stateData ? stateData.avgEpss.toFixed(4) : "No data"}
                    </title>
                  </Geography>
                );
              })
            }
          </Geographies>
        </ComposableMap>


      </div>

      {/* Side panel */}
      <div
        style={{
          flex: 1,
          background: "#1e1e1e",
          color: "white",
          padding: "16px",
          borderRadius: "8px",
          overflowY: "auto",
          maxHeight: "500px",
        }}
      >
        {selectedState ? (
          <>
            <h3>{selectedState.name}</h3>
            <p>
              Average EPSS: <strong>{selectedState.avgEpss.toFixed(4)}</strong>
            </p>
            <p>
              Showing <strong>{selectedState.points.length}</strong> records
            </p>
            <ul>
              {selectedState.points.map((p, i) => (
                <li key={i} style={{ marginBottom: "8px" }}>
                  Lat: {p.latitude}, Lon: {p.longitude}, EPSS: {p.epss.toFixed(5)}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p>Select a state to view threat data.</p>
        )}
      </div>
    </div>
  );
};

export default USHeatmap;
