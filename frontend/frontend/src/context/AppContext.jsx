import React, { createContext, useContext, useReducer, useCallback } from 'react';

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
  },
  
  // Threat Data
  threatData: {
    stateThreatData: {
      'New York': { threats: 150 },
      'California': { threats: 120 },
      'Illinois': { threats: 100 },
      'Texas': { threats: 90 },
      'Pennsylvania': { threats: 85 },
      'Georgia': { threats: 70 },
      'Massachusetts': { threats: 75 },
      'Florida': { threats: 60 },
      'Colorado': { threats: 50 },
      'Washington': { threats: 65 },
      'Missouri': { threats: 55 },
      'Utah': { threats: 55 },
      'Arizona': { threats: 45 },
      'North Carolina': { threats: 58 },
      'Virginia': { threats: 62 },
      'Ohio': { threats: 52 },
      'Michigan': { threats: 48 },
      'Tennessee': { threats: 42 },
      'Indiana': { threats: 40 },
      'Maryland': { threats: 38 },
      'Wisconsin': { threats: 35 },
      'Minnesota': { threats: 33 },
      'Louisiana': { threats: 30 },
      'Alabama': { threats: 28 },
      'Oregon': { threats: 25 },
      'Kentucky': { threats: 22 },
      'South Carolina': { threats: 20 },
      'Oklahoma': { threats: 18 },
      'Connecticut': { threats: 16 },
      'Iowa': { threats: 15 },
      'Nevada': { threats: 14 },
      'Mississippi': { threats: 12 },
      'Kansas': { threats: 10 },
      'Arkansas': { threats: 9 },
      'Nebraska': { threats: 8 },
      'New Mexico': { threats: 7 },
      'West Virginia': { threats: 6 },
      'Idaho': { threats: 5 },
      'Hawaii': { threats: 4 },
      'New Hampshire': { threats: 3 },
      'Maine': { threats: 2 },
      'Montana': { threats: 1 },
      'Rhode Island': { threats: 0 },
      'Delaware': { threats: 0 },
      'South Dakota': { threats: 0 },
      'North Dakota': { threats: 0 },
      'Alaska': { threats: 0 },
      'Vermont': { threats: 0 },
      'Wyoming': { threats: 0 }
    },
    threatSummary: [
      { category: 'Phishing', incidents: 1245, change: 12, avgLoss: 8400, status: 'Rising' },
      { category: 'Ransomware', incidents: 530, change: 4, avgLoss: 58000, status: 'Stable' },
      { category: 'Malware', incidents: 890, change: -6, avgLoss: 11200, status: 'Falling' },
      { category: 'DDoS', incidents: 210, change: 1, avgLoss: 5600, status: 'Stable' },
      { category: 'Credential Stuffing', incidents: 430, change: 9, avgLoss: 3700, status: 'Rising' },
    ],
  },
  
  // Insights
  insights: {
    highestRate: 'State A',
    lowestRate: 'State B',
    topThreatTypes: ['Ransomware', 'Phishing', 'DDoS'],
    notes: 'Use this panel for anomaly alerts (e.g., KEV matches, spikes).',
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
      dispatch({ type: ActionTypes.UPDATE_INSIGHTS, payload: insights });
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

