import React, { useEffect, useState } from 'react';
import { useSelectedState } from '../context/SelectedStateContext';
import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

// Module-level cache to prevent duplicate API calls - stores full raw response
let _internetChartRawCache = null;
let _internetChartPromise = null;

const CACHE_KEY = '_internetChartCache_v2'; // Changed key to invalidate old cache format

// Try to restore cache from sessionStorage at module load (survives HMR during dev)
try {
  const cached = sessionStorage.getItem(CACHE_KEY);
  if (cached) {
    const parsed = JSON.parse(cached);
    // Verify the cache has the correct structure (should have region_code and isps)
    if (parsed.length > 0 && parsed[0].region_code && Array.isArray(parsed[0].isps)) {
      _internetChartRawCache = parsed;
    } else {
      console.log('[InternetChart] Clearing old cache format');
      sessionStorage.removeItem(CACHE_KEY);
    }
  }
} catch (e) {
  // ignore parse errors
}

function fetchInternetChartData() {
  // Return cached data if available
  if (_internetChartRawCache) {
    return Promise.resolve(_internetChartRawCache);
  }

  // Return in-flight promise if one exists
  if (_internetChartPromise) {
    return _internetChartPromise;
  }

  // Create new fetch promise
  _internetChartPromise = fetch("http://127.0.0.1:8000/api/internet_chart/")
    .then(res => res.json())
    .then(raw => {
      if (!Array.isArray(raw)) {
        console.error("Unexpected API response:", raw);
        return [];
      }

      // Cache the FULL raw response (includes isps data)
      _internetChartRawCache = raw;
      
      // Store in sessionStorage
      try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(raw));
      } catch (e) {
        console.warn('Failed to write to sessionStorage:', e);
      }

      return raw;
    })
    .catch(err => {
      console.error("Error fetching chart data:", err);
      return [];
    })
    .finally(() => {
      _internetChartPromise = null;
    });

  return _internetChartPromise;
}

export default function TopStatesDonutChart({ injectedData = null, exportMode = false }) {
  const [rawData, setRawData] = useState([]);
  const [data, setData] = useState([]);
  const [hovered, setHovered] = useState(null);
  const { selectedState } = useSelectedState();

  // Fetch data on mount or use injected data when provided
  useEffect(() => {
    if (injectedData) {
      console.debug && console.debug('[InternetChart] using injectedData length:', Array.isArray(injectedData) ? injectedData.length : 'object');
      try {
        const raw = injectedData;
        setRawData(raw || []);
        // When exportMode is true, force the national/top-states view regardless of selectedState
        const sorted = Array.isArray(raw) ? [...raw].sort((a, b) => (b.total_count || 0) - (a.total_count || 0)) : [];
        const top10 = sorted.slice(0, 10);
        const chartData = top10.map(state => ({ name: state.region_code, value: state.total_count }));
        setData(chartData);
        return;
      } catch (err) {
        console.error('[InternetChart] Error applying injected data:', err);
      }
    }

    console.log('[InternetChart] Fetching data...');
    fetchInternetChartData().then(raw => {
      console.log('[InternetChart] Received raw data:', raw);
      if (!raw || raw.length === 0) {
        console.warn('[InternetChart] No data received from internet_chart API');
        return;
      }
      console.log('[InternetChart] Sample of first item:', raw[0]);
      setRawData(raw);
      // Initially show top 10 states
      const sorted = [...raw].sort((a, b) => b.total_count - a.total_count);
      const top10 = sorted.slice(0, 10);
      const chartData = top10.map(state => ({
        name: state.region_code,
        value: state.total_count
      }));
      console.log('[InternetChart] Setting chart data:', chartData);
      setData(chartData);
    }).catch(err => {
      console.error('[InternetChart] Error in useEffect:', err);
    });
  }, [injectedData]);

  // Notify PDF exporter when this chart's rendered `data` is available
  useEffect(() => {
    if (Array.isArray(data) && data.length > 0) {
      try {
        window.dispatchEvent(new CustomEvent('dashboardPDF:chartReady', { detail: { id: 'internet-provider' } }));
      } catch (e) {}
    }
  }, [data]);

  // Recompute chart data whenever rawData or the global selectedState changes
  useEffect(() => {
    if (!rawData || rawData.length === 0) return;

    const parseNum = (v) => {
      if (v == null) return 0;
      if (typeof v === 'number') return v;
      const s = String(v).trim();
      const cleaned = s.replace(/[^0-9.-]+/g, '');
      const n = parseFloat(cleaned);
      return Number.isFinite(n) ? n : 0;
    };

    // If a state is selected via context, show top 5 ISPs for that state. When in exportMode, ignore selectedState and show national view.
    if (!exportMode && selectedState && (selectedState.code || selectedState.name)) {
      const selCode = selectedState.code ? String(selectedState.code).toUpperCase() : null;
      const selName = selectedState.name ? String(selectedState.name).trim().toLowerCase() : null;

      const stateData = rawData.find(s => {
        if (!s) return false;
        if (selCode && s.region_code && String(s.region_code).toUpperCase() === selCode) return true;
        if (selName && s.region_name && String(s.region_name).trim().toLowerCase() === selName) return true;
        return false;
      });

      if (stateData) {
        let isps = [];
        if (Array.isArray(stateData.isps)) isps = stateData.isps;
        else if (Array.isArray(stateData.providers)) isps = stateData.providers;
        else if (Array.isArray(stateData.isp_list)) isps = stateData.isp_list;

        // normalize and rank ISPs by numeric count/value
        const ispChartData = isps.map(isp => ({
          name: isp.isp || isp.name || isp.provider || isp.key || 'Unknown',
          value: parseNum(isp.cnt ?? isp.count ?? isp.value ?? isp.total ?? isp.incidents ?? isp[1] ?? 0)
        }))
        .sort((a,b) => b.value - a.value)
        .slice(0,5);

        setData(ispChartData);
        return;
      }

      // no matching state or no ISP list: clear view
      setData([]);
      return;
    }

    // No selection: show top 5 STATES by number of ISPs (fallback to total_count)
    const statesWithCounts = rawData.map(s => {
      const ispCount = Array.isArray(s.isps) ? s.isps.length : (s.isp_count ?? s.total_isps ?? 0);
      const fallback = parseNum(s.total_count ?? s.total_cves ?? s.count ?? s.total ?? 0);
      return {
        code: s.region_code || s.region_name || 'US',
        count: ispCount || fallback
      };
    });

    const topStates = statesWithCounts.sort((a,b) => b.count - a.count).slice(0,5);
    const chartData = topStates.map(st => ({ name: st.code, value: st.count }));
    setData(chartData);
  }, [rawData, selectedState]);

  const COLORS = [
    '#9d00ffff', 
    '#e2b3ffff', 
    '#482563ff',
    '#7f648fff', 
    '#48276fff',
    '#e5d3f0ff', 
    '#2b2632ff',
    
   
  ];

  // Every other slice gets lines (odd indices: 1, 3, 5, 7, 9)
  const hasPattern = (index) => index % 2 === 1;

  const handlePieEnter = (entry) => {
    if (entry && entry.name) {
      setHovered(entry.name);
    }
  };

  const handlePieLeave = () => {
    setHovered(null);
  };

  if (data.length === 0) {
    return (
      <div style={{ color: 'var(--muted)', textAlign: 'center', padding: '20px' }}>
        <p>Loading chart...</p>
        {rawData.length === 0 && <p style={{ fontSize: '10px', marginTop: '8px' }}>Fetching data from API...</p>}
      </div>
    );
  }

  // Determine chart title based on whether a state is selected
  const chartTitle = selectedState 
    ? `Top ISPs per state` 
    : 'Top 5 States by Total Count';

  return (
    <div style={{ width: '100%', height: '280px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: '8px 0', overflow: 'hidden' }}>
      {/* Dynamic title */}
      <div style={{ width: '100%', textAlign: 'center', marginBottom: '4px', fontSize: '11px', fontWeight: '600', color: '#e5e7eb' }}>
        {chartTitle}
      </div>
      <div style={{ width: '100%', height: '190px', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: '4px' }}>
        <div style={{ width: '100%', maxWidth: 420, display: 'flex', justifyContent: 'center' }}>
          <PieChart width={200} height={200}>
          <defs>
            {data.map((entry, index) => {
              if (!hasPattern(index)) return null;
              const baseColor = COLORS[index % COLORS.length];
              return (
                <pattern key={`pattern-${index}`} id={`lines-${index}`} x="0" y="0" width="6" height="6" patternUnits="userSpaceOnUse">
                  <rect width="6" height="6" fill={baseColor} />
                  <circle cx="1.5" cy="1.5" r="1.2" fill="rgba(0, 0, 0, 0.8)" />
                  <circle cx="4.5" cy="4.5" r="1.2" fill="rgba(0, 0, 0, 0.8)" />
                </pattern>
              );
            })}
          </defs>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="45%"
            innerRadius={40}
            outerRadius={65}
            onMouseEnter={handlePieEnter}
            onMouseLeave={handlePieLeave}
            stroke="#1f2937"
            strokeWidth={1}
          >
            {data.map((entry, index) => {
              const baseColor = COLORS[index % COLORS.length];
              
              return (
                <Cell 
                  key={`cell-${index}`} 
                  fill={hasPattern(index) ? `url(#lines-${index})` : baseColor}
                />
              );
            })}
          </Pie>
          <Tooltip 
            contentStyle={{ 
              background: '#111827',
              border: '1px solid #1f2937',
              borderRadius: '8px',
              color: '#e5e7eb',
              padding: '8px 10px'
            }}
            itemStyle={{
              color: '#e5e7eb',
              fontSize: '12px'
            }}
            labelStyle={{
              color: '#e5e7eb',
              fontSize: '13px',
              fontWeight: '700'
            }}
          />
          <Legend 
            verticalAlign="bottom" 
            height={50}
            iconType="circle"
            wrapperStyle={{ 
              fontSize: '9px', 
              paddingTop: '0px',
              width: '100%',
              lineHeight: '14px'
            }}
            layout="horizontal"
            align="center"
            formatter={(value) => <span style={{ color: '#e5e7eb' }}>{value}</span>}
          />
          </PieChart>
        </div>
      </div>

    </div>
  );
}
