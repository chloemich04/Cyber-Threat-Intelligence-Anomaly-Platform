// Lightweight module-level cache for the latest forecast.
// This module reuses an in-flight fetch promise to avoid parallel requests
// when multiple components request the forecast at the same time (eg. React
// StrictMode mounting or multiple consumers).
let _forecastCache = null;
let _forecastFetched = false;
let _fetchPromise = null;

export async function getLatestForecast({ force = false } = {}) {
  if (_forecastFetched && _forecastCache && !force) {
    return _forecastCache;
  }

  const url = 'http://localhost:8000/api/forecast/latest/';

  if (_fetchPromise && !force) {
    return _fetchPromise;
  }

  _fetchPromise = (async () => {
    const res = await fetch(url);
    if (!res.ok) {
      const err = new Error(`HTTP error! status: ${res.status}`);
      err.status = res.status;
      _fetchPromise = null;
      throw err;
    }
    const json = await res.json();
    _forecastFetched = true;
    _forecastCache = json;
    _fetchPromise = null;
    return json;
  })();

  return _fetchPromise;
}

export function clearForecastCache() {
  _forecastCache = null;
  _forecastFetched = false;
  _fetchPromise = null;
}
