import React, { useEffect, useState, useMemo, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Label, Cell } from 'recharts';
import { useSelectedState } from '../context/SelectedStateContext';

// Module-level cache to avoid re-fetching ranking data across mounts/unmounts
let _rankingDataCache = null;
let _rankingDataFetched = false;
let _rankingDataPromise = null;

// Try to restore cache from sessionStorage (survives HMR during dev)
try {
  const cached = sessionStorage.getItem('_rankingChartCache');
  if (cached) {
    _rankingDataCache = JSON.parse(cached);
    _rankingDataFetched = true;
  }
} catch (e) {
  // ignore parse errors
}

// Colors for bars (background fill and border) provided by design
const BAR_BACKGROUND_COLORS = [
    '#9d00ffff', 
    '#cc9ceaff', 
    '#482563ff',
];

const BAR_BORDER_COLORS = [
    '#1f2937',
    '#1f2937',
    '#1f2937',
    '#1f2937',
    '#1f2937',
    '#1f2937',
    '#1f2937',
    '#1f2937',
    '#1f2937',
    '#1f2937',
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

const titleTextStyle = { fontSize: 16, fontWeight: 600, color: '#e5e7eb' };

const infoDotStyle = { background: 'rgba(255,255,255,0.06)', borderRadius: 6, padding: '2px 6px', fontSize: 12, color: '#e5e7eb' };

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

const RankingBarChart = ({ topN = 10, injectedData = null, exportMode = false }) => {
    const [data, setData] = useState([]);
    // highlightedState will be an object { name, code } when set
    const [highlightedState, setHighlightedState] = useState(null);
    const { selectedState } = useSelectedState();

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
    useEffect(() => {
        // If injected data is provided (PDF export), use it
        if (injectedData) {
            try {
                const normalized = normalizeRankingData(injectedData);
                _rankingDataFetched = true;
                _rankingDataCache = normalized;
                setData(normalized);
                return;
            } catch (e) {
                console.error('Error normalizing injected ranking data:', e);
            }
        }

        if (_rankingDataFetched && _rankingDataCache) {
            // Use cached data from earlier fetch in this page session
            setData(normalizeRankingData(_rankingDataCache));
            return;
        }

        // If a fetch is already in-flight, attach to it
        if (_rankingDataPromise) {
            _rankingDataPromise.then((normalized) => setData(normalizeRankingData(normalized))).catch(() => {});
            return;
        }

        _ranking_data_temp:
        _rankingDataPromise = fetch("http://127.0.0.1:8000/api/ranking_data/")
            .then((res) => res.json())
            .then((raw) => {
                const normalized = normalizeRankingData(raw);
                _rankingDataFetched = true;
                _rankingDataCache = normalized;
                _rankingDataPromise = null;
                // Persist to sessionStorage
                try {
                    sessionStorage.setItem('_rankingChartCache', JSON.stringify(normalized));
                } catch (e) {}
                return normalized;
            })
            .then((normalized) => setData(normalized))
            .catch((err) => {
                _rankingDataPromise = null;
                console.error("Error fetching ranking bar chart data:", err);
            });
    }, []);

    // Derive top N data sorted by cve_count descending from the full dataset
    // (national top-N). If a state is selected, highlight it if it's in the
    // top-N; otherwise replace the Nth entry with the selected state so it
    // remains visible.
    const topData = useMemo(() => {
        if (!Array.isArray(data)) return [];
        const sortedFull = [...data].sort((a, b) => (b.cve_count || 0) - (a.cve_count || 0));

        const base = sortedFull.slice(0, topN).map((d, i) => ({ ...d, rank: d.rank_overall || i + 1 }));

        // When exporting, ignore selected state to render the national top-N view
        const active = exportMode ? null : (highlightedState || selectedState);
        if (!active) return base;

        const selCode = active.code ? String(active.code).toUpperCase() : null;
        const selName = active.name ? String(active.name).trim().toLowerCase() : null;

        const inBase = base.some(d => {
            if (!d) return false;
            const codes = [d.region_code, d.code, d.regionCode, d.region];
            for (const v of codes) if (v && selCode && String(v).toUpperCase() === selCode) return true;
            const names = [d.state, d.name, d.region_name, d.regionName];
            for (const v of names) if (v && selName && String(v).trim().toLowerCase() === selName) return true;
            return false;
        });

        if (inBase) return base;

        // find the entry in the full sorted list
        const found = sortedFull.find(d => {
            const codes = [d.region_code, d.code, d.regionCode, d.region];
            for (const v of codes) if (v && selCode && String(v).toUpperCase() === selCode) return true;
            const names = [d.state, d.name, d.region_name, d.regionName];
            for (const v of names) if (v && selName && String(v).trim().toLowerCase() === selName) return true;
            return false;
        });

        let entryToInsert = null;
        if (found) entryToInsert = { ...found, rank: found.rank_overall || (sortedFull.indexOf(found) + 1) };
        else {
            // synthetic fallback
            entryToInsert = { state: active.name || active.code, region_code: active.code || null, cve_count: 0, rank: null };
        }

        if (base.length >= topN) base[base.length - 1] = entryToInsert;
        else base.push(entryToInsert);

        return base;
    }, [data, topN, highlightedState, selectedState]);

    // Notify PDF exporter when this chart has data ready for capture
    useEffect(() => {
        if (Array.isArray(topData) && topData.length > 0) {
            try {
                console.debug && console.debug('[RankingBarChart] topData ready length=', topData.length);
                window.dispatchEvent(new CustomEvent('dashboardPDF:chartReady', { detail: { id: 'vulnerable-tech' } }));
            } catch (e) {}
        }
    }, [topData]);

    const containerHeight = '100%';

    // responsive bar size depending on number of items (based on available width heuristic)
    const barSize = Math.max(14, Math.min(48, Math.floor(300 / Math.max(1, topData.length)))) - 5;

        return (
            <div style={{ width: '100%', padding: '8px', height: '100%' }} aria-label="Ranking bar chart">

                <div style={{ width: '100%', height: containerHeight, minHeight: 280, minWidth: 300, background: 'transparent', borderRadius: 6 }}>
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
                                    isAnimationActive={true}
                                    animationDuration={1000}
                                    animationEasing="ease-in-out"
                                    barSize={barSize}
                                >
                                    {topData.map((entry, i) => {
                                        const active = highlightedState || selectedState;
                                        const entryStateName = entry.state || entry.region_name || `entry-${i}`;
                                        const entryCode = (entry.region_code || entry.code || (STATE_NAME_TO_CODE && STATE_NAME_TO_CODE[entryStateName])) ? (entry.region_code || entry.code || STATE_NAME_TO_CODE[entryStateName]) : null;

                                        const isHighlighted = Boolean(active && (
                                            (active.code && entryCode && String(entryCode).toUpperCase() === String(active.code).toUpperCase()) ||
                                            (active.name && entryStateName === active.name)
                                        ));

                                        const fill = isHighlighted ? '#00d9ff' : BAR_BACKGROUND_COLORS[i % BAR_BACKGROUND_COLORS.length];
                                        const stroke = isHighlighted ? '#00d9ff' : BAR_BORDER_COLORS[i % BAR_BORDER_COLORS.length];
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
