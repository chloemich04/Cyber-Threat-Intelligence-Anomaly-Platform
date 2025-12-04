import React, { createContext, useContext, useState, useCallback } from 'react';

const SelectedStateContext = createContext();

// Map full state names to 2-letter codes for normalization
const STATE_NAME_TO_CODE = {
  Alabama: 'AL', Alaska: 'AK', Arizona: 'AZ', Arkansas: 'AR', California: 'CA', Colorado: 'CO', Connecticut: 'CT', Delaware: 'DE', Florida: 'FL', Georgia: 'GA', Hawaii: 'HI', Idaho: 'ID', Illinois: 'IL', Indiana: 'IN', Iowa: 'IA', Kansas: 'KS', Kentucky: 'KY', Louisiana: 'LA', Maine: 'ME', Maryland: 'MD', Massachusetts: 'MA', Michigan: 'MI', Minnesota: 'MN', Mississippi: 'MS', Missouri: 'MO', Montana: 'MT', Nebraska: 'NE', Nevada: 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', Ohio: 'OH', Oklahoma: 'OK', Oregon: 'OR', Pennsylvania: 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC', 'South Dakota': 'SD', Tennessee: 'TN', Texas: 'TX', Utah: 'UT', Vermont: 'VT', Virginia: 'VA', Washington: 'WA', 'West Virginia': 'WV', Wisconsin: 'WI', Wyoming: 'WY'
};

export function SelectedStateProvider({ children }) {
  const [selectedState, _setSelectedState] = useState(null);

  // Wrap the setter so callers can pass either a string (state name), an
  // object with a `name` and optional `code`, or `null`. We normalize to an
  // object that includes both `name` and `code` when possible so downstream
  // consumers can reliably check `selectedState.code`.
  const setSelectedState = useCallback((value) => {
    if (value == null) {
      _setSelectedState(null);
      // also dispatch a cleared event for legacy listeners
      try {
        window.dispatchEvent(new CustomEvent('stateCleared'));
      } catch (e) {}
      return;
    }

    // If a string was provided, treat as the state name
    if (typeof value === 'string') {
      const code = STATE_NAME_TO_CODE[value] || null;
      _setSelectedState({ name: value, code });
      return;
    }

    // If an object was provided, normalize fields
    if (typeof value === 'object') {
      const name = value.name || value.region_name || null;
      const code = value.code || value.region_code || (name ? STATE_NAME_TO_CODE[name] : null) || null;
      const count = value.count || value.total_cves || value.totalCves || null;
      const normalized = { ...(value || {}), name, code };
      if (count != null) normalized.count = count;
      _setSelectedState(normalized);
      return;
    }

    // Fallback: store as-is
    _setSelectedState(value);
  }, []);

  return (
    <SelectedStateContext.Provider value={{ selectedState, setSelectedState }}>
      {children}
    </SelectedStateContext.Provider>
  );
}

export function useSelectedState() {
  return useContext(SelectedStateContext);
}
