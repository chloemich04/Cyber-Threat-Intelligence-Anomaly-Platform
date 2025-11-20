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
    fetch("http://127.0.0.1:8000/api/heatmap_data/")
      .then((res) => res.json())
      .then((rawData) => {
        const agg = rawData.reduce((acc, item) => {
          const code = item.region_code;

          if (!acc[code])
              acc[code] = 0;

          acc[code] += item.total_cves || 0;
          return acc;
        }, {});

        const mappedData = {};
        for (const code in stateMap) {
          const name = stateMap[code];
          mappedData[name] = agg[code] ? agg[code] : 0
        }

        setData(mappedData);
      })
      .catch((err) => console.error("Error fetching data:", err));
  }, []);

  const getColor = (count) => {
    if (!count || count === 0)
        return "#444"; // gray ~ no data
    const max = Math.max(...Object.values(data));
    const intensity = Math.min(Math.log(count + 1) / Math.log(max + 1), 1); // logarithmic scale
    const red = Math.floor(255 * intensity);
    const green = Math.floor(255 * (1 - intensity));
    return `rgb(${red}, ${green}, 50)`; // green -> red gradient
  };

  return (
    <div style={{ display: "flex", gap: "20px" }}>
      <div style={{ width: "70%", position: "relative" }}>
        <ComposableMap
          projection="geoAlbersUsa"
          projectionConfig={{ scale: 1000, translate: [480, 300] }}
          style={{ width: "100%", height: "500px" }}
        >
          <Geographies geography={geoUrl}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const stateName = geo.properties.name;
                const count = data[stateName] || 0;

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={getColor(count)}
                    stroke="#FFF"
                    onClick={() =>
                      setSelectedState({
                        name: stateName,
                        count: count,
                      })
                    }
                    style={{
                      default: { outline: "none" },
                      hover: { fill: "#f39c12", outline: "none" },
                      pressed: { fill: "#e67e22", outline: "none" },
                    }}
                  >
                    <title>
                      {stateName} — Total CVEs: {count > 0 ? count : "No data"}
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
            {selectedState.count > 0 ? (
              <p>
                Total CVEs: <strong>{selectedState.count}</strong>
              </p>
            ) : (
              <p>No CVE data available.</p>
            )}
          </>
        ) : (
          <p>Select a state to view CVE data.</p>
        )}
      </div>
    </div>
  );
};

export default USHeatmap;
