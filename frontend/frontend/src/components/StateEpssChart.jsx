import React, { useEffect, useState, useMemo, useRef } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Label, Cell
} from "recharts";
import InfoModal from './InfoModal';

// Module-level cache to avoid re-fetching EPSS data across mounts
let _epssDataCache = null;
let _epssDataFetched = false;
// Promise representing an in-flight fetch so multiple mounts don't trigger duplicate requests
let _epssDataPromise = null;

// Try to restore cache from sessionStorage (survives HMR during dev)
try {
  const cached = sessionStorage.getItem('_epssChartCache_v2');
  if (cached) {
    _epssDataCache = JSON.parse(cached);
    _epssDataFetched = true;
  }
} catch (e) {
  // ignore parse errors
}

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

const customTooltipStyle = {
  background: '#111827',
  color: '#e5e7eb',
  padding: '8px 10px',
  borderRadius: 8,
  border: '1px solid #1f2937',
};

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0];
  const obj = p.payload || {};
  const stateName = obj.state || obj.name || label || obj.region_name || 'Unknown';
  const avg = (obj.avg_epss != null) ? obj.avg_epss : (p.value != null ? p.value : null);
  const formatted = (typeof avg === 'number') ? `${avg.toFixed(1)}%` : (avg || '—');

  return (
    <div style={customTooltipStyle}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#e5e7eb' }}>{stateName}</div>
      <div style={{ fontSize: 12, color: '#e5e7eb', marginTop: 6 }}>{`Avg EPSS: ${formatted}`}</div>
    </div>
  );
}

const STATE_NAME_TO_CODE = {
    Alabama: 'AL', Alaska: 'AK', Arizona: 'AZ', Arkansas: 'AR', California: 'CA', Colorado: 'CO', Connecticut: 'CT', Delaware: 'DE', Florida: 'FL', Georgia: 'GA', Hawaii: 'HI', Idaho: 'ID', Illinois: 'IL', Indiana: 'IN', Iowa: 'IA', Kansas: 'KS', Kentucky: 'KY', Louisiana: 'LA', Maine: 'ME', Maryland: 'MD', Massachusetts: 'MA', Michigan: 'MI', Minnesota: 'MN', Mississippi: 'MS', Missouri: 'MO', Montana: 'MT', Nebraska: 'NE', Nevada: 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', Ohio: 'OH', Oklahoma: 'OK', Oregon: 'OR', Pennsylvania: 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC', 'South Dakota': 'SD', Tennessee: 'TN', Texas: 'TX', Utah: 'UT', Vermont: 'VT', Virginia: 'VA', Washington: 'WA', 'West Virginia': 'WV', Wisconsin: 'WI', Wyoming: 'WY'
};

// reverse map for code -> state name
const CODE_TO_STATE = Object.keys(STATE_NAME_TO_CODE).reduce((acc, name) => {
  acc[STATE_NAME_TO_CODE[name]] = name;
  return acc;
}, {});

// Normalize incoming EPSS data ensuring `state`, `region_code`, and `avg_epss` exist
const normalizeEpssData = (arr) => {
  // Debug raw response shape to help diagnose mapping issues
  try { console.debug && console.debug('EPSS raw response:', arr); } catch (e) {}

  // Support common wrappers: results, data, items
  let list = arr;
  if (arr && typeof arr === 'object' && !Array.isArray(arr)) {
    if (Array.isArray(arr.results)) list = arr.results;
    else if (Array.isArray(arr.data)) list = arr.data;
    else if (Array.isArray(arr.items)) list = arr.items;
    else if (Array.isArray(arr.values)) list = arr.values;
    else {
      // fallback: convert object entries to array
      list = Object.keys(arr).map(k => {
        const v = arr[k];
        if (v && typeof v === 'object') return { ...v };
        return { name: k, avg_epss: v };
      });
    }
  }

  if (!Array.isArray(list)) return [];
  return list.map(item => {
    const copy = { ...item };
    
    // Normalize region_code to uppercase
    if (copy.region_code) {
      copy.region_code = String(copy.region_code).toUpperCase();
    } else if (typeof copy.name === 'string' && copy.name.length === 2) {
      copy.region_code = copy.name.toUpperCase();
    } else if (typeof copy.region_name === 'string') {
      const code = STATE_NAME_TO_CODE[copy.region_name];
      if (code) copy.region_code = code;
    } else if (typeof copy.state === 'string') {
      const code = STATE_NAME_TO_CODE[copy.state];
      if (code) copy.region_code = code;
    }

    // Use region_code (state abbreviation) for both name and state to match RankingBarChart
    if (copy.region_code) {
      const code = String(copy.region_code).toUpperCase();
      // Set both name and state to the abbreviation (like "CA", "NY")
      copy.name = code;
      copy.state = code;
      copy.region_code = code;
    } else {
      // fallback: ensure we have both fields
      if (!copy.name) copy.name = copy.region_code || copy.state;
      if (!copy.state) copy.state = copy.name;
    }

    // normalize avg_epss to percent, tolerate strings
    if (copy.avg_epss == null && copy.epss != null) copy.avg_epss = copy.epss;
    if (copy.avg_epss != null) {
      const parsed = typeof copy.avg_epss === 'string' ? parseFloat(copy.avg_epss) : copy.avg_epss;
      if (!Number.isFinite(parsed)) {
        copy.avg_epss = null;
      } else {
        copy.avg_epss = parsed;
        // Backend returns avg_epss as 0..1, convert to percentage
        if (copy.avg_epss <= 1) copy.avg_epss = copy.avg_epss * 100;
      }
    } else {
      copy.avg_epss = null;
    }

    return copy;
  });
};

const StateEpssChart = ({ topN = 10 }) => {
  const [data, setData] = useState([]);
  const [highlightedState, setHighlightedState] = useState(null);
  const [showInfo, setShowInfo] = useState(false);
  const fetchedRef = useRef(false);

  useEffect(() => {
    // If we have cached data, use it immediately
    if (_epssDataFetched && _epssDataCache) {
      setData(_epssDataCache);
      return;
    }

    // If a fetch is already in-flight, attach to it instead of issuing a new request
    if (_epssDataPromise) {
      _epssDataPromise.then((normalized) => setData(normalized)).catch(() => {});
      return;
    }

    // Only fetch once per session - start the fetch
    _epssDataPromise = fetch("http://localhost:8000/api/epss_chart/")
      .then((res) => res.json())
      .then((json) => {
        const normalized = normalizeEpssData(json);
        console.log('EPSS normalized data count:', normalized.length, 'sample (should show abbreviations):', normalized.slice(0, 3).map(d => ({name: d.name, state: d.state, region_code: d.region_code})));
        _epssDataFetched = true;
        _epssDataCache = normalized;
        _epssDataPromise = null;
        // Persist to sessionStorage to survive HMR during dev
        try {
          sessionStorage.setItem('_epssChartCache_v2', JSON.stringify(normalized));
        } catch (e) {
          // ignore quota errors
        }
        return normalized;
      })
      .then((normalized) => {
        console.log('Setting EPSS data state with', normalized.length, 'items');
        setData(normalized);
      })
      .catch(err => {
        _epssDataPromise = null;
        console.error('Error fetching EPSS data:', err);
      });
  }, []);

  // Listen for heatmap selections; highlight or add synthetic entry without refetch
  useEffect(() => {
    function onStateSelected(e) {
      const detail = e && e.detail ? e.detail : e;
      const stateName = detail && (detail.name || detail.state || detail.region_name);
      const code = detail && (detail.code || detail.region_code || null);
      const avg = detail && (detail.avg_epss || detail.avg || detail.epss || detail.value);
      if (!stateName && !code) return;

      const matchesEntry = (entry) => {
        if (!entry) return false;
        if (code && (entry.region_code === code || (entry.code && entry.code === code))) return true;
        if (stateName && ((entry.state && entry.state === stateName) || (entry.region_name && entry.region_name === stateName))) return true;
        return false;
      };

      if (_epssDataCache && Array.isArray(_epssDataCache)) {
        const found = _epssDataCache.find(item => matchesEntry(item));
        if (!found) {
          const synthetic = { state: stateName || code, region_code: code || null, avg_epss: (typeof avg === 'number') ? (avg <= 1 ? avg * 100 : avg) : 0, synthetic: true };
          setData(prev => {
            if (prev.some(p => matchesEntry(p))) return prev;
            return [...prev, synthetic];
          });
        }
      } else {
        setData(prev => {
          if (prev.some(p => matchesEntry(p))) return prev;
          const synthetic = { state: stateName || code, region_code: code || null, avg_epss: (typeof avg === 'number') ? (avg <= 1 ? avg * 100 : avg) : 0, synthetic: true };
          return [...prev, synthetic];
        });
      }

      setHighlightedState({ name: stateName, code });
    }

    window.addEventListener('stateSelected', onStateSelected);
    return () => window.removeEventListener('stateSelected', onStateSelected);
  }, []);

  // Clear highlight
  useEffect(() => {
    function onStateCleared() {
      setHighlightedState(null);
      if (_epssDataCache) setData(_epssDataCache);
    }
    window.addEventListener('stateCleared', onStateCleared);
    return () => window.removeEventListener('stateCleared', onStateCleared);
  }, []);

  // derive top N by avg_epss descending, but ensure highlighted state is visible
  const topData = useMemo(() => {
    console.log('Computing topData from data.length=', data?.length, 'topN=', topN);
    if (!Array.isArray(data)) return [];
    const sorted = [...data].sort((a, b) => (b.avg_epss || 0) - (a.avg_epss || 0));
    const base = sorted.slice(0, topN).map((d, i) => ({ ...d, rank: d.rank_overall || i + 1 }));
    console.log('topData base computed:', base.length, 'items, sample:', base.slice(0, 2));

    if (highlightedState) {
      const inBase = base.some(d => {
        if (!d) return false;
        if (highlightedState.code && (d.region_code === highlightedState.code || d.code === highlightedState.code)) return true;
        return (d.state && d.state === highlightedState.name) || (d.region_name && d.region_name === highlightedState.name);
      });
      if (!inBase) {
        const found = sorted.find(d => {
          if (highlightedState.code && (d.region_code === highlightedState.code || d.code === highlightedState.code)) return true;
          return (d.state && d.state === highlightedState.name) || (d.region_name && d.region_name === highlightedState.name);
        });
        let entryToInsert = null;
        if (found) entryToInsert = { ...found, rank: found.rank_overall || (sorted.indexOf(found) + 1) };
        else {
          const synthetic = data.find(d => {
            if (highlightedState.code && (d.region_code === highlightedState.code || d.code === highlightedState.code)) return true;
            return (d.state && d.state === highlightedState.name) || (d.region_name && d.region_name === highlightedState.name);
          });
          if (synthetic) entryToInsert = { ...synthetic, rank: synthetic.rank_overall || null };
          else entryToInsert = { state: highlightedState.name || highlightedState.code, region_code: highlightedState.code || null, avg_epss: 0, rank: null };
        }

        if (base.length >= topN) base[base.length - 1] = entryToInsert;
        else base.push(entryToInsert);
      }
    }

    return base;
  }, [data, topN, highlightedState]);

  const containerHeight = '100%';
  const barSize = Math.max(14, Math.min(48, Math.floor(300 / Math.max(1, topData.length)))) - 5;

  return (
    <div style={{ width: '100%', padding: '8px', height: '100%' }} aria-label="State EPSS bar chart">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        
      </div>

      <div style={{ width: '100%', height: containerHeight, minHeight: 300, background: 'transparent', borderRadius: 6 }}>
        {(!topData || topData.length === 0) ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#999' }}>No EPSS data available</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={topData}
              margin={{ top: 10, right: 20, left: 12, bottom: 60 }}
              barCategoryGap="25%"
              barGap={15}
            >
              <CartesianGrid stroke="#1f2937" vertical={false} strokeDasharray="4 4" />

              <XAxis
                dataKey="name"
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
                domain={[0, 25]}
                ticks={[0, 5, 10, 15, 20, 25]}
                tick={{ fill: '#bbb' }}
                axisLine={{ stroke: '#333' }}
                tickLine={false}
                interval={0}
                tickCount={101}
                minTickGap={0}
              >
                <Label value="EPSS (%)" angle={-90} position="insideLeft" style={{ fill: '#bbb' }} />
              </YAxis>

              <Tooltip content={<CustomTooltip />} />

              <Bar
                dataKey="avg_epss"
                radius={[6, 6, 0, 0]}
                isAnimationActive={false}
                barSize={barSize}
              >
                {topData.map((entry, i) => {
                  const entryStateName = entry.state || entry.region_name || `entry-${i}`;
                  const entryCode = (entry.region_code || entry.code || (STATE_NAME_TO_CODE && STATE_NAME_TO_CODE[entryStateName])) ? (entry.region_code || entry.code || STATE_NAME_TO_CODE[entryStateName]) : null;

                  const isHighlighted = Boolean(highlightedState && (
                    (highlightedState.code && entryCode && String(entryCode).toUpperCase() === String(highlightedState.code).toUpperCase()) ||
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

export default StateEpssChart;
