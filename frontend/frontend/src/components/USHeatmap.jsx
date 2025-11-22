import React, { useState, useEffect, useRef } from "react";

// Module-level cache to avoid re-fetching heatmap data across mounts/unmounts
let _heatmapDataCache = null;
let _heatmapDataFetched = false;
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
  const [loadingState, setLoadingState] = useState(false);

  const fetchedRef = useRef(false);
  useEffect(() => {
    if (_heatmapDataFetched && _heatmapDataCache) {
      setData(_heatmapDataCache);
      return;
    }

    if (fetchedRef.current) return;
    fetchedRef.current = true;

    fetch("http://127.0.0.1:8000/api/heatmap_data/")
      .then((res) => res.json())
      .then((rawData) => {
        // Aggregate raw API rows into a per-state detail object. The API may include different fields
        // depending on backend enrichment; be defensive and collect useful fields if present.
        const agg = rawData.reduce((acc, item) => {
          const code = item.region_code;
          if (!code) return acc;

          if (!acc[code]) {
            acc[code] = {
              total_cves: 0,
              cves: new Set(),
              exploit_count: 0,
              cvss_sum: 0,
              cvss_count: 0,
              last_seen: null,
              vendor_counts: {},
              notes: new Set(),
              source_count: 0,
            };
          }

          const bucket = acc[code];
          const t = Number(item.total_cves) || 0;
          bucket.total_cves += t;

          // support single cve string or array of cves
          if (item.cve) bucket.cves.add(item.cve);
          if (Array.isArray(item.cves)) item.cves.forEach(c => c && bucket.cves.add(c));

          // exploit telemetry count
          if (item.exploit_count) bucket.exploit_count += Number(item.exploit_count) || 0;

          // average CVSS (we'll accumulate sum and count)
          if (item.avg_cvss) {
            bucket.cvss_sum += Number(item.avg_cvss) || 0;
            bucket.cvss_count += 1;
          }

          // last seen date (keep the most recent)
          if (item.last_seen) {
            const d = new Date(item.last_seen);
            if (!isNaN(d)) {
              if (!bucket.last_seen || new Date(bucket.last_seen) < d) bucket.last_seen = item.last_seen;
            }
          }

          // vendor / product counts
          if (item.vendor) {
            bucket.vendor_counts[item.vendor] = (bucket.vendor_counts[item.vendor] || 0) + 1;
          }

          if (item.note) bucket.notes.add(item.note);

          bucket.source_count += 1;

          return acc;
        }, {});

        const mappedData = {};
        for (const code in stateMap) {
          const name = stateMap[code];
          const src = agg[code];
          if (src) {
            // convert sets/maps back to useful arrays/fields
            const top_vendors = Object.entries(src.vendor_counts || {}).sort((a,b)=>b[1]-a[1]).map(e=>e[0]).slice(0,3);
            mappedData[name] = {
              total_cves: src.total_cves || 0,
              top_cves: Array.from(src.cves).slice(0,5),
              exploit_count: src.exploit_count || 0,
              avg_cvss: src.cvss_count ? +(src.cvss_sum / src.cvss_count).toFixed(2) : null,
              last_seen: src.last_seen || null,
              top_vendors,
              notes: Array.from(src.notes).slice(0,3),
              source_count: src.source_count || 0,
            };
          } else {
            mappedData[name] = { total_cves: 0 };
          }
        }

        setData(mappedData);
        _heatmapDataFetched = true;
        _heatmapDataCache = mappedData;
        // Notify other parts of the app that canonical heatmap data is available.
        try {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('heatmapLoaded', { detail: { mappedData } }));
          }
        } catch (e) {
          // fallback for older browsers
          try {
            const ev = document.createEvent('CustomEvent');
            ev.initCustomEvent('heatmapLoaded', true, true, { mappedData });
            window.dispatchEvent(ev);
          } catch (err) {}
        }
      })
      .catch((err) => console.error("Error fetching data:", err));
  }, []);

  const getColor = (count) => {
    if (!count || count === 0)
        return "#444"; // gray ~ no data
    // compute max from data total_cves values (defensive)
    const values = Object.values(data || {}).map(d => (d && d.total_cves) ? d.total_cves : 0);
    const max = values.length ? Math.max(...values) : 1;
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
                            const count = (data[stateName] && data[stateName].total_cves) ? data[stateName].total_cves : 0;

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={getColor(count)}
                    stroke="#FFF"
                    onClick={() => {
                            // When a state is clicked, try to fetch enriched per-state details
                            // from the backend endpoint. Backend route expects a region code
                            // (two-letter). We map the state name back to its code.
                            const nameToCode = Object.entries(stateMap).reduce((acc, [c, n]) => {
                              acc[n] = c;
                              return acc;
                            }, {});

                            const code = nameToCode[stateName];

                            // optimistic select to show immediate feedback
                            setSelectedState({ name: stateName, count: count, loading: true });
                            // Broadcast the state selection so other components can react 
                            try {
                              window.dispatchEvent(new CustomEvent('stateSelected', { detail: { name: stateName, code, region_code: code, total_cves: count } }));
                            } catch (e) {
                              // older browsers fallback
                              const ev = document.createEvent('CustomEvent');
                              ev.initCustomEvent('stateSelected', true, true, { name: stateName, code, region_code: code, total_cves: count });
                              window.dispatchEvent(ev);
                            }
                            if (!code) {
                              // no code mapping; just set what we have
                              setSelectedState({ name: stateName, count: count });
                              return;
                            }
                            setLoadingState(true);
                            fetch(`http://127.0.0.1:8000/api/heatmap/state/${code}/`)
                              .then(res => {
                                if (!res.ok) throw new Error(`Status ${res.status}`);
                                return res.json();
                              })
                              .then(detail => {
                                // Expect detail to include region_name or similar; normalize
                                const normalized = {
                                  name: detail.region_name || stateName,
                                  count: detail.total_cves != null ? detail.total_cves : count,
                                  detail: detail,
                                };
                                // store enriched data under the state's name for side-panel rendering
                                setData(prev => ({ ...prev, [normalized.name]: { ...(prev[normalized.name] || {}), ...detail } }));
                                setSelectedState(normalized);
                              })
                              .catch(err => {
                                console.error('Error fetching state detail:', err);
                                // fallback to simple selection
                                setSelectedState({ name: stateName, count: count });
                              })
              .finally(() => setLoadingState(false));
              }
            } style={{
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
          background: "#1f2937",
          color: "white",
          padding: "16px",
          borderRadius: "8px",
          overflowY: "auto",
          maxHeight: "500px",
        }}
      >
        {selectedState ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: 20, fontWeight: 'bold', margin: 0 }}>{selectedState.name}</h3>
              <button
                onClick={() => {
                  setSelectedState(null);
                  setLoadingState(false);
                  try {
                    window.dispatchEvent(new CustomEvent('stateCleared', { detail: {} }));
                  } catch (e) {
                    const ev = document.createEvent('CustomEvent');
                    ev.initCustomEvent('stateCleared', true, true, {});
                    window.dispatchEvent(ev);
                  }
                }}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'white',
                  padding: '6px 10px',
                  borderRadius: 8,
                  cursor: 'pointer'
                }}
                aria-label="Clear state selection"
              >
                Clear
              </button>
            </div>
            {loadingState && <p style={{ fontStyle: 'italic', fontSize: 13 }}>Loading details...</p>}
            {selectedState.count > 0 ? (
              <>
                <p>
                  Total CVEs: <strong>{selectedState.count}</strong>
                </p>

                {/* If we have enriched details for this state, show only the approved fields */}
                {data[selectedState.name] && (
                  <div style={{ fontSize: 13 }}>
                    {data[selectedState.name].top_cves && data[selectedState.name].top_cves.length > 0 && (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ fontWeight: 600 }}>Top CVEs</div>
                        <ol style={{ marginTop: 6 }}>
                          {data[selectedState.name].top_cves.map((cveObj, i) => {
                            const id = cveObj && (cveObj.id || cveObj.cve_id || cveObj[0]) || null;
                            const occ = cveObj && (cveObj.occurrences || cveObj.occ || 0);
                            return (
                              <li key={i} style={{ marginBottom: 4 }}>
                                {id ? (
                                  <a href={`https://nvd.nist.gov/vuln/detail/${id}`} target="_blank" rel="noreferrer" style={{ color: '#9bd' }}>{id}</a>
                                ) : <span style={{ color: '#9bd' }}>Unknown</span>}
                                {typeof occ === 'number' && <span style={{ marginLeft: 8, color: '#ccc' }}>({occ} reports)</span>}
                              </li>
                            );
                          })}
                        </ol>
                      </div>
                    )}

                    {Array.isArray(data[selectedState.name].top_tags) && data[selectedState.name].top_tags.length > 0 && (
                      <p style={{ marginTop: 8 }}>Top tags: <strong>{data[selectedState.name].top_tags.join(', ')}</strong></p>
                    )}

                    {typeof data[selectedState.name].exploit_count === 'number' && (
                      <p style={{ marginTop: 8 }}>Recent exploit reports: <strong>{data[selectedState.name].exploit_count}</strong></p>
                    )}

                    {data[selectedState.name].risk_score != null && (
                      <p>Risk score: <strong>{data[selectedState.name].risk_score}</strong> / 100</p>
                    )}

                    {Array.isArray(data[selectedState.name].notes) && data[selectedState.name].notes.length > 0 && (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ fontWeight: 600 }}>Notes</div>
                        <ul style={{ marginTop: 6 }}>
                          {data[selectedState.name].notes.map((n, idx) => (
                            <li key={idx} style={{ fontSize: 13 }}>{n}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </>
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
