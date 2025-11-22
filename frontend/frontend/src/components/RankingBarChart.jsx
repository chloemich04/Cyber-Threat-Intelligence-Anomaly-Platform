import React, { useEffect, useState, useMemo, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Label, Cell } from 'recharts';

// Module-level cache to avoid re-fetching ranking data across mounts/unmounts
let _rankingDataCache = null;
let _rankingDataFetched = false;

// Colors for bars (background fill and border) provided by design
const BAR_BACKGROUND_COLORS = [
    '#b2e0fcff', 
    '#3a6e90ff', 
    '#022a43ff',
   
];

const BAR_BORDER_COLORS = [
    '#8eaec2ff',
    '#487794ff',
    '#0a334eff',
   
];

const panelStyle = {
    background: '#0b1220',
    border: '1px solid #1f2937',
    padding: 10,
    borderRadius: 12,
    boxShadow: '0 6px 18px rgba(2,8,20,0.6)'
};

const titleStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6
};

const titleTextStyle = { fontSize: 16, fontWeight: 600, color: '#dff6ff' };

const infoDotStyle = { background: 'rgba(255,255,255,0.06)', borderRadius: 6, padding: '2px 6px', fontSize: 12 };

const customTooltipStyle = {
    background: '#111827',
    color: '#e5e7eb',
    padding: '8px 10px',
    borderRadius: 8,
    border: '1px solid #1f2937',
};

function CustomTooltip({ active, payload, label }) {
    // Match the requested style: dark background, light title/body, subtle border, no color boxes
    if (!active || !payload || !payload.length) return null;
    const p = payload[0];
    // prefer structured payload values when available
    const obj = p.payload || {};
    const rank = obj.rank || obj.rank_overall || obj.rank_number || null;
    const stateName = obj.state || label || obj.region_name || 'Unknown';
    const cveCount = (obj.cve_count != null) ? obj.cve_count : (p.value != null ? p.value : null);
    const formattedCount = typeof cveCount === 'number' ? cveCount.toLocaleString() : (cveCount || '—');

    return (
        <div style={customTooltipStyle}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#e5e7eb' }}>{`Rank ${rank != null ? `#${rank}` : '—'} — ${stateName}`}</div>
            <div style={{ fontSize: 12, color: '#e5e7eb', marginTop: 6 }}>{`${formattedCount} CVE${(typeof cveCount === 'number' && cveCount === 1) ? '' : 's'}`}</div>
        </div>
    );
}

const RankingBarChart = ({ topN = 10 }) => {
    const [data, setData] = useState([]);
    // highlightedState will be an object { name, code } when set
    const [highlightedState, setHighlightedState] = useState(null);

    // mapping of state display name -> two-letter code to normalize incoming data
    const STATE_NAME_TO_CODE = {
        Alabama: 'AL', Alaska: 'AK', Arizona: 'AZ', Arkansas: 'AR', California: 'CA', Colorado: 'CO', Connecticut: 'CT', Delaware: 'DE', Florida: 'FL', Georgia: 'GA', Hawaii: 'HI', Idaho: 'ID', Illinois: 'IL', Indiana: 'IN', Iowa: 'IA', Kansas: 'KS', Kentucky: 'KY', Louisiana: 'LA', Maine: 'ME', Maryland: 'MD', Massachusetts: 'MA', Michigan: 'MI', Minnesota: 'MN', Mississippi: 'MS', Missouri: 'MO', Montana: 'MT', Nebraska: 'NE', Nevada: 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', Ohio: 'OH', Oklahoma: 'OK', Oregon: 'OR', Pennsylvania: 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC', 'South Dakota': 'SD', Tennessee: 'TN', Texas: 'TX', Utah: 'UT', Vermont: 'VT', Virginia: 'VA', Washington: 'WA', 'West Virginia': 'WV', Wisconsin: 'WI', Wyoming: 'WY'
    };

    // Normalize ranking data to ensure each entry has consistent fields: state (display name) and region_code (two-letter)
    const normalizeRankingData = (arr) => {
        if (!Array.isArray(arr)) return [];
        return arr.map(item => {
            const copy = { ...item };
            // if region_code present, try to map name if missing
            if (!copy.region_code) {
                // if item.state is a code (e.g., 'CA'), normalize
                if (typeof copy.state === 'string' && copy.state.length === 2) {
                    copy.region_code = copy.state.toUpperCase();
                } else if (typeof copy.region_name === 'string') {
                    const code = STATE_NAME_TO_CODE[copy.region_name];
                    if (code) copy.region_code = code;
                } else if (typeof copy.state === 'string') {
                    const code = STATE_NAME_TO_CODE[copy.state];
                    if (code) {
                        copy.region_code = code;
                        copy.state = copy.state; // keep
                    }
                }
            } else {
                // ensure uppercase
                copy.region_code = String(copy.region_code).toUpperCase();
            }

            // ensure we have a display state name in `state` or `region_name`
            if (!copy.state) {
                // try to map from region_code back to name
                const rc = copy.region_code;
                if (rc) {
                    // reverse lookup: find key by value
                    const name = Object.keys(STATE_NAME_TO_CODE).find(k => STATE_NAME_TO_CODE[k] === rc);
                    if (name) copy.state = name;
                }
            }

            return copy;
        });
    };

    // Avoid refetching repeatedly if the component is unmounted/remounted (e.g. dev StrictMode or
    // parent re-renders). Keep a session-level flag so we only fetch once per page load.
    const fetchedRef = useRef(false);
    useEffect(() => {
        if (_rankingDataFetched && _rankingDataCache) {
            // Use cached data from earlier fetch in this page session
            setData(normalizeRankingData(_rankingDataCache));
            return;
        }

        if (fetchedRef.current) return;
        fetchedRef.current = true;

        fetch("http://127.0.0.1:8000/api/ranking_data/")
            .then((res) => res.json())
            .then((raw) => {
                const normalized = normalizeRankingData(raw);
                _rankingDataFetched = true;
                _rankingDataCache = normalized;
                setData(normalized);
            })
            .catch((err) => console.error("Error fetching ranking bar chart data:", err));
    }, []);

    // Listen for state selections from the map; highlight or add the state to the chart
    useEffect(() => {
        function onStateSelected(e) {
            const detail = e && e.detail ? e.detail : e;
            const stateName = detail && (detail.name || detail.state || detail.region_name);
            const code = detail && (detail.code || detail.region_code || null);
            const total = detail && (detail.total_cves || detail.count || detail.total);
            if (!stateName && !code) return;

            // helper to match an entry by code first, then by name
            const matchesEntry = (entry) => {
                if (!entry) return false;
                if (code && (entry.region_code === code || entry.code === code)) return true;
                if (stateName && ((entry.state && entry.state === stateName) || (entry.region_name && entry.region_name === stateName))) return true;
                return false;
            };

            // If we have cached ranking data, ensure the clicked state exists in it (or keep synthetic info)
            if (_rankingDataCache && Array.isArray(_rankingDataCache)) {
                const found = _rankingDataCache.find(item => matchesEntry(item));
                if (!found) {
                    // add a synthetic entry so it will be displayed/highlighted (don't mutate cache in place)
                    const synthetic = { state: stateName || code, region_code: code || null, cve_count: (typeof total === 'number') ? total : 0, synthetic: true };
                    // update component-local data so topData recomputes with this extra entry
                    setData(prev => {
                        // avoid adding duplicate synthetic entries
                        if (prev.some(p => matchesEntry(p))) return prev;
                        return [...prev, synthetic];
                    });
                }
            } else {
                // no cache yet: set a minimal data item so chart can show the highlighted state
                setData(prev => {
                    if (prev.some(p => matchesEntry(p))) return prev;
                    const synthetic = { state: stateName || code, region_code: code || null, cve_count: (typeof total === 'number') ? total : 0, synthetic: true };
                    return [...prev, synthetic];
                });
            }

            setHighlightedState({ name: stateName, code });
        }

        window.addEventListener('stateSelected', onStateSelected);
        return () => window.removeEventListener('stateSelected', onStateSelected);
    }, []);

    // Listen for a global clear event to remove highlighting and restore original data
    useEffect(() => {
        function onStateCleared() {
            setHighlightedState(null);
            if (_rankingDataCache) {
                setData(_rankingDataCache);
            }
        }

        window.addEventListener('stateCleared', onStateCleared);
        return () => window.removeEventListener('stateCleared', onStateCleared);
    }, []);

    // Derive top N data sorted by cve_count descending
    const topData = useMemo(() => {
        if (!Array.isArray(data)) return [];
        const sorted = [...data].sort((a, b) => (b.cve_count || 0) - (a.cve_count || 0));

        // base top N
        const base = sorted.slice(0, topN).map((d, i) => ({ ...d, rank: d.rank_overall || i + 1 }));

        // If a state is highlighted and it's not already in the base slice,
        // replace the last bar in the top-N with the highlighted state so it remains visible.
        if (highlightedState) {
            const inBase = base.some(d => {
                if (!d) return false;
                if (highlightedState.code && (d.region_code === highlightedState.code || d.code === highlightedState.code)) return true;
                return (d.state && d.state === highlightedState.name) || (d.region_name && d.region_name === highlightedState.name);
            });
            if (!inBase) {
                // try to find the entry in the full sorted list by code or name
                const found = sorted.find(d => {
                    if (highlightedState.code && (d.region_code === highlightedState.code || d.code === highlightedState.code)) return true;
                    return (d.state && d.state === highlightedState.name) || (d.region_name && d.region_name === highlightedState.name);
                });
                let entryToInsert = null;
                if (found) {
                    entryToInsert = { ...found, rank: found.rank_overall || (sorted.indexOf(found) + 1) };
                } else {
                    // fallback to any synthetic entry present in data by matching code/name
                    const synthetic = data.find(d => {
                        if (highlightedState.code && (d.region_code === highlightedState.code || d.code === highlightedState.code)) return true;
                        return (d.state && d.state === highlightedState.name) || (d.region_name && d.region_name === highlightedState.name);
                    });
                    if (synthetic) entryToInsert = { ...synthetic, rank: synthetic.rank_overall || null };
                    else entryToInsert = { state: highlightedState.name || highlightedState.code, region_code: highlightedState.code || null, cve_count: 0, rank: null };
                }

                if (base.length >= topN) {
                    // replace the last element
                    base[base.length - 1] = entryToInsert;
                } else {
                    // if for some reason we have fewer than topN entries, just append
                    base.push(entryToInsert);
                }
            }
        }

        return base;
    }, [data, topN, highlightedState]);

        const containerHeight = '100%';

        // responsive bar size depending on number of items (based on available width heuristic)
        const barSize = Math.max(14, Math.min(48, Math.floor(300 / Math.max(1, topData.length)))) - 5;

        return (
            <div style={{ width: '100%', padding: '8px', height: '100%' }} aria-label="Ranking bar chart">

                <div style={{ width: '100%', height: containerHeight, minHeight: 280, background: 'transparent', borderRadius: 6 }}>
                    {(!topData || topData.length === 0) ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#999' }}>No ranking data available</div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={topData}
                                margin={{ top: 10, right: 20, left: 12, bottom: 60 }}
                                barCategoryGap="25%"
                                barGap={15}
                            >
                                {/* horizontal grid lines for easier reading */}
                                <CartesianGrid stroke="#1f2937" vertical={false} strokeDasharray="4 4" />
                               

                                <XAxis
                                    dataKey="state"
                                    type="category"
                                    interval={0}
                                    tick={{ fill: '#fff', fontSize: 13 }}
                                    axisLine={{ stroke: '#333' }}
                                    tickLine={false}
                                    angle={-30}
                                    textAnchor="end"
                                    height={56}
                                />

                                <YAxis
                                    type="number"
                                    tick={{ fill: '#bbb' }}
                                    axisLine={{ stroke: '#333' }}
                                    tickLine={false}
                                >
                                    <Label value="Total CVEs" angle={-90} position="insideLeft" style={{ fill: '#bbb' }} />
                                </YAxis>

                                {/* Custom tooltip styled to match LossBySectorBarChart */}
                                <Tooltip content={<CustomTooltip />} />

                                <Bar
                                    dataKey="cve_count"
                                    radius={[6, 6, 0, 0]}
                                    isAnimationActive={false}
                                    barSize={barSize}
                                >
                                    {topData.map((entry, i) => {
                                        const entryStateName = entry.state || entry.region_name || `entry-${i}`;
                                        // derive a canonical two-letter code for the entry when possible
                                        const entryCode = (entry.region_code || entry.code || (STATE_NAME_TO_CODE && STATE_NAME_TO_CODE[entryStateName])) ? (entry.region_code || entry.code || STATE_NAME_TO_CODE[entryStateName]) : null;

                                        const isHighlighted = Boolean(highlightedState && (
                                            // prefer code matching
                                            (highlightedState.code && entryCode && String(entryCode).toUpperCase() === String(highlightedState.code).toUpperCase()) ||
                                            // fallback to name matching
                                            (highlightedState.name && entryStateName === highlightedState.name)
                                        ));

                                        const fill = isHighlighted ? '#696868ff' : BAR_BACKGROUND_COLORS[i % BAR_BACKGROUND_COLORS.length];
                                        const stroke = isHighlighted ? '#767575ff' : BAR_BORDER_COLORS[i % BAR_BORDER_COLORS.length];
                                        const strokeWidth = isHighlighted ? 3 : 2;

                                        return (
                                            <Cell
                                                key={`cell-${i}`}
                                                fill={fill}
                                                stroke={stroke}
                                                strokeWidth={strokeWidth}
                                            />
                                        );
                                    })}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>
        );
};

export default RankingBarChart;
