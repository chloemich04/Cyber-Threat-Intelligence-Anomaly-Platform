import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';

// Module-level guard to ensure we only attempt to load insights once per app session.
// This prevents duplicate loads in React StrictMode (dev) or accidental remounts.
let _insightsLoaded = false;
// Tracks whether a load attempt is currently in progress. Allows retry if previous
// attempt returned no data (we won't mark _insightsLoaded true on empty results).
let _insightsLoadStarted = false;
// Module-level guard for metrics derivation so we compute once per session
let _metricsLoaded = false;

// Initial State
const initialState = {
  // Navigation
  currentPage: 'dashboard',
  isMenuOpen: false,
  
  // Filters
  filters: {
    year: null,
    sector: null,
    riskLevel: null,
  },
  
  // Dashboard Data
  metrics: {
    totalIncidents: null,
    averageLoss: null,
    exposureScore: null,
    kevActiveExploits: null,
    // Simpler, robust KPIs
    top5ConcentrationPercent: null,
    activeStatesPercent: null,
  },

  
  // Insights
  insights: {
    highestRate: '',
    lowestRate: '',
    topThreatTypes: [],
    notes: '',
  },
  
  // UI State
  ui: {
    loading: false,
    error: null,
  },
};

// Action Types
const ActionTypes = {
  SET_CURRENT_PAGE: 'SET_CURRENT_PAGE',
  TOGGLE_MENU: 'TOGGLE_MENU',
  SET_FILTER: 'SET_FILTER',
  RESET_FILTERS: 'RESET_FILTERS',
  SET_METRICS: 'SET_METRICS',
  UPDATE_THREAT_DATA: 'UPDATE_THREAT_DATA',
  UPDATE_INSIGHTS: 'UPDATE_INSIGHTS',
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
};

// Reducer
const appReducer = (state, action) => {
  switch (action.type) {
    case ActionTypes.SET_CURRENT_PAGE:
      return {
        ...state,
        currentPage: action.payload,
      };
      
    case ActionTypes.TOGGLE_MENU:
      return {
        ...state,
        isMenuOpen: !state.isMenuOpen,
      };
      
    case ActionTypes.SET_FILTER:
      return {
        ...state,
        filters: {
          ...state.filters,
          [action.payload.key]: action.payload.value,
        },
      };
      
    case ActionTypes.RESET_FILTERS:
      return {
        ...state,
        filters: initialState.filters,
      };
      
    case ActionTypes.SET_METRICS:
      return {
        ...state,
        metrics: {
          ...state.metrics,
          ...action.payload,
        },
      };
      
    case ActionTypes.UPDATE_THREAT_DATA:
      return {
        ...state,
        threatData: {
          ...state.threatData,
          ...action.payload,
        },
      };
      
    case ActionTypes.UPDATE_INSIGHTS:
      try {
        console.debug('reducer UPDATE_INSIGHTS - prev insights:', state.insights, 'payload:', action.payload);
      } catch (e) {
        // ignore
      }
      return {
        ...state,
        insights: {
          ...state.insights,
          ...action.payload,
        },
      };
      
    case ActionTypes.SET_LOADING:
      return {
        ...state,
        ui: {
          ...state.ui,
          loading: action.payload,
        },
      };
      
    case ActionTypes.SET_ERROR:
      return {
        ...state,
        ui: {
          ...state.ui,
          error: action.payload,
        },
      };
      
    default:
      return state;
  }
};

// Create Context
const AppContext = createContext(null);

// Context Provider
export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Actions
  const actions = {
    setCurrentPage: useCallback((page) => {
      dispatch({ type: ActionTypes.SET_CURRENT_PAGE, payload: page });
    }, []),

    toggleMenu: useCallback(() => {
      dispatch({ type: ActionTypes.TOGGLE_MENU });
    }, []),

    setFilter: useCallback((key, value) => {
      dispatch({ type: ActionTypes.SET_FILTER, payload: { key, value } });
    }, []),

    resetFilters: useCallback(() => {
      dispatch({ type: ActionTypes.RESET_FILTERS });
    }, []),

    setMetrics: useCallback((metrics) => {
      dispatch({ type: ActionTypes.SET_METRICS, payload: metrics });
    }, []),

    updateThreatData: useCallback((data) => {
      dispatch({ type: ActionTypes.UPDATE_THREAT_DATA, payload: data });
    }, []),

    updateInsights: useCallback((insights) => {
      try {
        console.debug('actions.updateInsights -> dispatching UPDATE_INSIGHTS', insights);
      } catch (e) {
        // ignore logging failures
      }
      dispatch({ type: ActionTypes.UPDATE_INSIGHTS, payload: insights });
    }, []),

    // reloadInsights used to dynamically import a legacy insights loader. Insights are
    // now derived directly from the canonical heatmap aggregation (heatmapLoaded event).
    // Keep a safe no-op implementation so callers don't throw if they attempt to
    // trigger a reload; it simply returns null and logs a diagnostic message.
    reloadInsights: useCallback(async ({ force = false } = {}) => {
      try {
        try { console.debug('reloadInsights: disabled — insights are derived from heatmap events.'); } catch (e) {}
        return null;
      } catch (e) {
        // defensive: ensure the function always resolves to null on error
        return null;
      }
    }, []),

    setLoading: useCallback((loading) => {
      dispatch({ type: ActionTypes.SET_LOADING, payload: loading });
    }, []),

    setError: useCallback((error) => {
      dispatch({ type: ActionTypes.SET_ERROR, payload: error });
    }, []),
  };

  const value = {
    state,
    actions,
  };

  // Instead of scheduling standalone loader attempts, listen for the heatmap component to
  // announce when it has loaded data. USHeatmap dispatches a `heatmapLoaded` event with
  // `detail.mappedData` when it finishes its fetch and aggregation. Using that event
  // ensures Insights are derived from the same canonical data source and avoids duplicate
  // network requests.
  useEffect(() => {
    if (_insightsLoaded) return;
    let mounted = true;

    const handler = (ev) => {
      try {
        const mapped = ev && ev.detail && ev.detail.mappedData;
        console.debug('AppContext: received heatmapLoaded event, mappedData present:', !!mapped);
        if (!mapped || !mounted) return;

        // Compute insights from the mapped data (mapped keys = state names)
        // Also collect fields we can use for Key Metrics (exploit_count, avg_cvss).
        const items = Object.entries(mapped).map(([name, d]) => ({
          name,
          total_cves: Number((d && d.total_cves) || 0),
          top_tags: Array.isArray(d.top_tags) ? d.top_tags : (Array.isArray(d.top_vendors) ? d.top_vendors : []),
          notes: Array.isArray(d.notes) ? d.notes : [],
          exploit_count: Number((d && d.exploit_count) || 0),
          avg_cvss: d && (d.avg_cvss != null) ? Number(d.avg_cvss) : null,
        }));

        if (!items.length) return;

        // sort descending by total_cves
        items.sort((a, b) => b.total_cves - a.total_cves);
        const highest = items[0];
        const minVal = Math.min(...items.map(i => i.total_cves));
        const lowestEntries = items.filter(i => i.total_cves === minVal);

        const highestRate = `${highest.name} (${highest.total_cves})`;
        const lowestRates = lowestEntries.map(e => `${e.name} (${e.total_cves})`);
        const lowestRate = lowestRates.length ? lowestRates[0] : '';

        // aggregate tags
        const tagCounts = {};
        const notesList = [];
        for (const it of items) {
          if (Array.isArray(it.top_tags)) {
            for (const t of it.top_tags) {
              if (!t) continue;
              tagCounts[t] = (tagCounts[t] || 0) + 1;
            }
          }
          if (Array.isArray(it.notes)) {
            for (const n of it.notes) if (n) notesList.push(n);
          }
        }

        const topThreatTypes = Object.entries(tagCounts).sort((a,b)=>b[1]-a[1]).slice(0,3).map(e=>e[0]);

        // prefer notes from highest state if present
        const notes = (highest && highest.notes && highest.notes.length) ? highest.notes.slice(0,3).join('; ') : (notesList.length ? notesList.slice(0,3).join('; ') : '');

        const payload = { highestRate, lowestRates, lowestRate, topThreatTypes, notes };
        console.debug('AppContext: computed insights payload from heatmap:', payload);
        actions.updateInsights(payload);
        _insightsLoaded = true;

        // Derive Key Metrics from the same canonical heatmap data so the dashboard
        // and PDF export are consistent with the heatmap source. We compute only
        // metrics that can be robustly derived from heatmap output. Some KPIs
        // (for example Average Loss / Incident) require financial/impact data
        // that is not available in the heatmap payload; those will remain null.
        try {
          if (!_metricsLoaded) {
            // Aggregate national totals (sum across all states) so KPIs are computed for the whole US
            const totalIncidents = items.reduce((s, it) => s + (it.total_cves || 0), 0);
            const totalExploits = items.reduce((s, it) => s + (it.exploit_count || 0), 0);

            // Compute a weighted average CVSS across states (weight by incidents).
            const cvssNumerator = items.reduce((s, it) => s + ((it.avg_cvss != null ? it.avg_cvss : 0) * (it.total_cves || 0)), 0);
            const cvssDenominator = items.reduce((s, it) => s + (it.total_cves || 0), 0);
            const weightedAvgCvss = cvssDenominator ? +(cvssNumerator / cvssDenominator).toFixed(2) : null;

            // Exposure score: composite 0-100. This is a heuristic derived client-side
            // so it remains explainable and reproducible. Formula (simple, conservative):
            // - CVSS component (0-70): weightedAvgCvss / 10 * 70
            // - Incident volume component (0-30): scaled logarithmically so large spikes
            //   don't saturate the score (log scale with a 10k cap for normalization).
            // If avg CVSS is not available, exposureScore falls back to incident-only signal.
            let exposureScore = null;
            if (weightedAvgCvss != null) {
              const cvssComponent = (weightedAvgCvss / 10) * 70;
              const incidentComponent = totalIncidents ? Math.min(30, (Math.log(totalIncidents + 1) / Math.log(10000 + 1)) * 30) : 0;
              exposureScore = Math.round(cvssComponent + incidentComponent);
            } else if (totalIncidents) {
              exposureScore = Math.round(Math.min(100, (Math.log(totalIncidents + 1) / Math.log(10000 + 1)) * 100));
            }

            // Build metrics payload scoped to the United States (national aggregation)
            const metricsPayload = {
              totalIncidents: totalIncidents || 0,
              averageLoss: null, // requires impact/loss data upstream (not available in heatmap)
              exposureScore: exposureScore,
              kevActiveExploits: totalExploits || 0,
              // Exploit rate: raw percent and a smoothed Laplace estimate for small counts
              exploitRatePercent: (function() {
                try {
                  if (!totalIncidents) return null;
                  return Math.round(((totalExploits || 0) / totalIncidents) * 100);
                } catch (e) { return null; }
              })(),
              exploitRateSmoothed: (function() {
                try {
                  if (!totalIncidents) return null;
                  return Math.round((((totalExploits || 0) + 1) / (totalIncidents + 2)) * 100);
                } catch (e) { return null; }
              })(),
              // Telemetry coverage heuristic: low/medium/high
              telemetryCoverage: (function() {
                try {
                  if (!totalIncidents) return 'none';
                  if (totalIncidents < 50) return 'low';
                  if (totalIncidents < 500) return 'medium';
                  return 'high';
                } catch (e) { return 'none'; }
              })(),
              // Simpler KPIs derived from national aggregation
              // Top-5 concentration: percent of national incidents occurring in the top 5 states
              top5ConcentrationPercent: (function() {
                try {
                  if (!totalIncidents) return 0;
                  const topN = 5;
                  const sorted = items.slice().sort((a,b)=>b.total_cves - a.total_cves);
                  const topSum = sorted.slice(0, topN).reduce((s, it) => s + (it.total_cves || 0), 0);
                  return Math.round((topSum / totalIncidents) * 100);
                } catch (e) { return null; }
              })(),
              // Active states percent: percent of states with at least one incident
              activeStatesPercent: (function() {
                try {
                  const totalStates = items.length || 0;
                  if (!totalStates) return 0;
                  const active = items.filter(it => (it.total_cves || 0) > 0).length;
                  return Math.round((active / totalStates) * 100);
                } catch (e) { return null; }
              })(),
              // Store the weighted average CVSS used in exposure computations so the UI
              // can show it or make display decisions (e.g., whether CVSS data exists).
              weightedAvgCvss: weightedAvgCvss,
              // Percent critical CVEs (estimated): use per-state avg_cvss to estimate P(CVSS>=9)
              percentCritical: (function() {
                try {
                  if (!totalIncidents) return null;
                  const sd = 1.5; // heuristic standard deviation for CVSS within a state
                  // erf-based normal CDF
                  function erf(x) {
                    // Abramowitz and Stegun approximation
                    const sign = x >= 0 ? 1 : -1;
                    x = Math.abs(x);
                    const a1 = 0.254829592;
                    const a2 = -0.284496736;
                    const a3 = 1.421413741;
                    const a4 = -1.453152027;
                    const a5 = 1.061405429;
                    const p = 0.3275911;
                    const t = 1 / (1 + p * x);
                    const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
                    return sign * y;
                  }
                  function normalCdf(x, mean, sdLocal) {
                    return 0.5 * (1 + erf((x - mean) / (Math.SQRT2 * sdLocal)));
                  }

                  // Sum weighted state probabilities
                  let weightedProbSum = 0;
                  let weightTotal = 0;
                  for (const it of items) {
                    if (it.avg_cvss == null || (it.total_cves || 0) === 0) continue;
                    const stateMean = it.avg_cvss;
                    const pCritical = 1 - normalCdf(9, stateMean, sd);
                    const w = it.total_cves || 0;
                    weightedProbSum += pCritical * w;
                    weightTotal += w;
                  }
                  if (!weightTotal) return null;
                  const overallProb = weightedProbSum / weightTotal;
                  return Math.round(overallProb * 100);
                } catch (e) { return null; }
              })(),
            };
            console.debug('AppContext: computed metrics from heatmap:', metricsPayload);
            actions.setMetrics(metricsPayload);
            _metricsLoaded = true;
          }
        } catch (e) {
          console.error('AppContext metrics derivation error:', e);
        }
      } catch (e) {
        console.error('AppContext heatmapLoaded handler error:', e);
      }
    };

    window.addEventListener('heatmapLoaded', handler);

    return () => {
      mounted = false;
      window.removeEventListener('heatmapLoaded', handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

// Custom Hook to use context
export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
};

// Selector hooks for specific state slices
export const useNavigation = () => {
  const { state, actions } = useAppContext();
  return {
    currentPage: state.currentPage,
    isMenuOpen: state.isMenuOpen,
    setCurrentPage: actions.setCurrentPage,
    toggleMenu: actions.toggleMenu,
  };
};

export const useFilters = () => {
  const { state, actions } = useAppContext();
  return {
    filters: state.filters,
    setFilter: actions.setFilter,
    resetFilters: actions.resetFilters,
  };
};

export const useMetrics = () => {
  const { state, actions } = useAppContext();
  return {
    metrics: state.metrics,
    setMetrics: actions.setMetrics,
  };
};

export const useThreatData = () => {
  const { state, actions } = useAppContext();
  return {
    threatData: state.threatData,
    updateThreatData: actions.updateThreatData,
  };
};

export const useInsights = () => {
  const { state, actions } = useAppContext();
  return {
    insights: state.insights,
    updateInsights: actions.updateInsights,
    reloadInsights: actions.reloadInsights,
  };
};

export const useUI = () => {
  const { state, actions } = useAppContext();
  return {
    loading: state.ui.loading,
    error: state.ui.error,
    setLoading: actions.setLoading,
    setError: actions.setError,
  };
};

export default AppContext;

