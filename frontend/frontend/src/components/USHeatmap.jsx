import React, { useState, useEffect, useRef } from "react";
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";
import { useSelectedState } from '../context/SelectedStateContext';

// Module-level cache to avoid re-fetching heatmap data across mounts/unmounts
let _heatmapDataCache = null;
let _heatmapDataFetched = false;

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

export default function USHeatmap(props) {
  const [data, setData] = useState({});
  const [loadingState, setLoadingState] = useState(false);
  // tooltip state for custom map tooltip (overrides native <title>)
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, title: '', body: '' });

  const { selectedState, setSelectedState } = useSelectedState();
  const fetchedRef = useRef(false);
  // map zoom / pan state
  const DEFAULT_CENTER = [-98, 38]; // approximate continental US center [lon, lat]
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState(DEFAULT_CENTER);
  // animation ref for smooth transitions
  const animRef = useRef(null);
  const mapRef = useRef(null);
  const initialCenterRef = useRef(null);
  const initialZoomRef = useRef(null);

  const easeInOut = (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

  const animateTo = (targetCenter, targetZoom, duration = 480) => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    const start = performance.now();
    const fromCenter = Array.isArray(center) ? center.slice() : DEFAULT_CENTER.slice();
    const fromZoom = zoom;
    const [tx, ty] = targetCenter;
    const [fx, fy] = fromCenter;
    const dz = targetZoom - fromZoom;

    function step(now) {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / duration);
      const eased = easeInOut(t);
      const nx = fx + (tx - fx) * eased;
      const ny = fy + (ty - fy) * eased;
      setCenter([nx, ny]);
      setZoom(fromZoom + dz * eased);
      if (t < 1) animRef.current = requestAnimationFrame(step);
      else animRef.current = null;
    }

    animRef.current = requestAnimationFrame(step);
  };
  useEffect(() => {
    // capture initial center/zoom at first mount so reset returns to page-load view
    if (initialCenterRef.current == null) initialCenterRef.current = center.slice();
    if (initialZoomRef.current == null) initialZoomRef.current = zoom;
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

  const handleWheel = (e) => {
    // zoom with wheel: zoom toward mouse position
    // Note: when used as a native listener we call preventDefault there.
    try {
      const rect = mapRef.current ? mapRef.current.getBoundingClientRect() : { width: 800, height: 500, left: 0, top: 0 };
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const relX = (mx / rect.width) - 0.5; // -0.5 .. 0.5
      const relY = (my / rect.height) - 0.5;

      const factor = e.deltaY < 0 ? 1.35 : 1 / 1.35;
      const newZoom = Math.max(1, Math.min(8, zoom * factor));

      // approximate longitude/latitude shift proportional to relative mouse position and zoom change
      const zoomDeltaRatio = (newZoom / zoom) - 1;

      // heuristics: longitude span ~ 60deg across map, latitude span ~ 30deg
      const lonSpan = 60;
      const latSpan = 30;

      const lonShift = relX * lonSpan * zoomDeltaRatio;
      const latShift = -relY * latSpan * zoomDeltaRatio;

      const targetCenter = [center[0] + lonShift, center[1] + latShift];
      animateTo(targetCenter, newZoom, 220);
    } catch (err) {
      // fallback to simple zoom
      if (e.deltaY < 0) setZoom((z) => Math.min(z * 1.35, 8));
      else setZoom((z) => Math.max(z / 1.35, 1));
    }
  };

  // Use a native wheel listener with `{ passive: false }` so we can call
  // `preventDefault()` without browser warnings. React's synthetic
  // `onWheel` may be attached in a passive context in some browsers
  // which triggers the console warning. We attach a native listener on
  // the map container and forward events to the in-component handler.
  const wheelHandlerRef = useRef(handleWheel);
  useEffect(() => { wheelHandlerRef.current = handleWheel; }, [handleWheel]);

  useEffect(() => {
    const node = mapRef.current;
    if (!node) return;
    const nativeHandler = (e) => {
      // prevent page scroll while zooming the map
      try { e.preventDefault(); } catch (err) {}
      if (wheelHandlerRef.current) wheelHandlerRef.current(e);
    };
    node.addEventListener('wheel', nativeHandler, { passive: false });
    return () => node.removeEventListener('wheel', nativeHandler);
  }, []);

  return (
    <div style={{ display: "flex", gap: "20px" }}>
      <div ref={mapRef} style={{ width: "70%", position: "relative" }} onWheel={handleWheel}>
        <ComposableMap
          projection="geoAlbersUsa"
          projectionConfig={{ scale: 1000, translate: [480, 300] }}
          style={{ width: "100%", height: "500px" }}
        >
          <ZoomableGroup center={center} zoom={zoom} disablePanning={false} onMoveEnd={(pos) => {
              // keep our center state in sync when user pans/zooms interactively
              try { if (pos && pos.coordinates) setCenter(pos.coordinates); } catch(e){}
            }}>
            <Geographies geography={geoUrl}>
              {({ geographies }) =>
                geographies.map((geo) => {
                  const stateName = geo.properties.name;
                  const count = (data[stateName] && data[stateName].total_cves) ? data[stateName].total_cves : 0;

                  const isSelected = selectedState && selectedState.name === stateName;

                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill={isSelected ? "#00d9ff" : getColor(count)}
                      stroke="#FFF"
                      onMouseEnter={(ev) => {
                        // show custom tooltip
                        setTooltip({ visible: true, x: ev.clientX, y: ev.clientY, title: stateName, body: `${count > 0 ? count : 'No data'} CVE${(count === 1) ? '' : 's'}` });
                      }}
                      onMouseMove={(ev) => {
                        // update position
                        setTooltip((t) => ({ ...t, x: ev.clientX, y: ev.clientY }));
                      }}
                      onMouseLeave={() => setTooltip({ visible: false, x: 0, y: 0, title: '', body: '' })}
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
                        setSelectedState({ name: stateName, code: code, count });
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
                              code: code,
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
                      }}
                      style={{
                        default: { outline: "none" },
                        hover: { fill: "#02a9c6ff", outline: "none" },
                        pressed: { fill: "#169bb2ff", outline: "none" },
                        selected: { fill: "#00d9ff", outline: "none" }
                      }}
                    />
                  );
                })
              }
            </Geographies>
          </ZoomableGroup>
        </ComposableMap>

        {/* zoom controls overlay */}
        <div className="map-zoom-controls" style={{ position: 'absolute', left: 10, top: 10, zIndex: 3000 }}>
          <button onClick={() => setZoom((z) => Math.min(z * 1.4, 8))} aria-label="Zoom in">+</button>
          <button onClick={() => setZoom((z) => Math.max(z / 1.4, 1))} aria-label="Zoom out">−</button>
          <button onClick={() => {
            // animate then enforce final center/zoom to ensure map recenters to initial view
            const dur = 520;
            const targetCenter = initialCenterRef.current ? initialCenterRef.current.slice() : DEFAULT_CENTER.slice();
            const targetZoom = initialZoomRef.current || 1;
            animateTo(targetCenter, targetZoom, dur);
            setTimeout(() => {
              if (animRef.current) cancelAnimationFrame(animRef.current);
              setCenter(targetCenter);
              setZoom(targetZoom);
            }, dur + 40);
          }} aria-label="Reset zoom">⟳</button>
        </div>
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ fontWeight: 600 }}>Top CVEs</div>
                          <span className="external-icon-inline" aria-hidden="true">
                            <svg className="external-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                              <path d="M14 3h7v7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M10 14L21 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M21 21H3V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </span>
                        </div>
                        <ol style={{ marginTop: 6 }}>
                          {data[selectedState.name].top_cves.map((cveObj, i) => {
                            const id = cveObj && (cveObj.id || cveObj.cve_id || cveObj[0]) || null;
                            const occ = cveObj && (cveObj.occurrences || cveObj.occ || 0);
                            return (
                              <li key={i} style={{ marginBottom: 4 }}>
                                {id ? (
                                  <a href={`https://nvd.nist.gov/vuln/detail/${id}`} target="_blank" rel="noreferrer" style={{ color: '#00d9ff' }}>{id}</a>
                                ) : <span style={{ color: '#00d9ff' }}>Unknown</span>}
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
      {/* Fixed-position custom tooltip (styled like chart tooltips) */}
      {tooltip.visible && (
        <div
          className="map-tooltip"
          style={{ position: 'fixed', left: tooltip.x + 12, top: tooltip.y + 12, zIndex: 4000, pointerEvents: 'none' }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, color: '#e5e7eb' }}>{tooltip.title}</div>
          <div style={{ fontSize: 12, color: '#e5e7eb', marginTop: 6 }}>{tooltip.body}</div>
        </div>
      )}
    </div>
  );
};
