import React, { useMemo, useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';

// Props: predictions: [{ week_start, country_code, country_name, expected_count, expected_count_ci: [low,high], spike_probability }]
export default function ForecastRiskMatrix({ predictions = [], height = 260 }) {
  const data = useMemo(() => {
    if (!predictions || predictions.length === 0) return [];
    return predictions.map((p) => {
      const expected = typeof p.expected_count === 'number' ? p.expected_count : Number(p.expected_count) || 0;
      const ci = Array.isArray(p.expected_count_ci) ? p.expected_count_ci : null;
      const ciLow = ci ? ci[0] : Math.max(0, expected - Math.max(1, Math.round(expected * 0.2)));
      const ciHigh = ci ? ci[1] : expected + Math.max(1, Math.round(expected * 0.2));
  const ciWidth = ciHigh - ciLow;
  // confidence = expected / (expected + ciWidth) — smooth, bounded 0..1
  const confidence = expected > 0 ? expected / (expected + ciWidth) : 0;

      return {
        x: expected, // impact
        y: Number(confidence.toFixed(3)), // confidence
        expected,
        ciLow,
        ciHigh,
        spike_probability: p.spike_probability || 0,
        country_code: p.country_code || p.country || 'US',
        country_name: p.country_name || p.country || p.country_code || 'US',
        week_start: p.week_start,
        raw: p,
      };
    });
  }, [predictions]);
  const [selectedSignal, setSelectedSignal] = useState(null);

  useEffect(() => {
    const handler = (e) => {
      const sig = e?.detail?.signal;
      setSelectedSignal(sig || null);
    };
    window.addEventListener('signalFilter', handler);
    return () => window.removeEventListener('signalFilter', handler);
  }, []);

  // split data into highlighted and others based on selectedSignal
  const { highlightedData, otherData } = useMemo(() => {
    if (!selectedSignal) return { highlightedData: [], otherData: data };
    const sigLabel = (selectedSignal.label || '').toString();
    const cveMatch = (sigLabel.match(/CVE-\d{4}-\d{1,7}/i) || [null])[0];
    const highlighted = [];
    const others = [];
    data.forEach(d => {
      const p = d.raw || {};
      const found = (p.top_signals || []).some(ts => {
        if (cveMatch) return ts.id && ts.id.toString().toUpperCase() === cveMatch.toUpperCase();
        return (ts.id && sigLabel.toLowerCase().includes(ts.id.toString().toLowerCase())) || (ts.signal_type && sigLabel.toLowerCase().includes(ts.signal_type.toLowerCase()));
      });
      if (found) highlighted.push(d); else others.push(d);
    });
    return { highlightedData: highlighted, otherData: others };
  }, [selectedSignal, data]);

  if (!data || data.length === 0) {
    return <div style={{ padding: 12, color: 'var(--muted)' }}>No data for risk matrix.</div>;
  }

  // compute thresholds using medians/means
  const impactValues = data.map((d) => d.x).sort((a, b) => a - b);
  const mid = Math.floor(impactValues.length / 2);
  const impactMedian = impactValues.length % 2 === 0 ? (impactValues[mid - 1] + impactValues[mid]) / 2 : impactValues[mid];
  const confidenceThreshold = 0.5; // 50% confidence

  const customTooltip = ({ active, payload }) => {
    if (!active || !payload || payload.length === 0) return null;
    const p = payload[0].payload;
    return (
      <div style={{ background: 'var(--panel-2)', padding: 8, borderRadius: 6, border: '1px solid #1f2937', color: 'var(--text)' }}>
        <div style={{ fontWeight: 700 }}>{new Date(p.week_start).toLocaleDateString()}</div>
        <div>Expected: <strong>{p.expected}</strong></div>
        <div>Confidence: <strong>{Math.round(p.y * 100)}%</strong></div>
        <div>CI: {p.ciLow} — {p.ciHigh}</div>
        <div>Spike probability: {(p.spike_probability * 100).toFixed(0)}%</div>
      </div>
    );
  };

  const handlePointClick = (point) => {
    if (!point || !point.payload) return;
    const p = point.payload;
    // Dispatch an event so other components can react (show details)
    window.dispatchEvent(new CustomEvent('riskPointSelected', { detail: p.raw }));
  };

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
          <XAxis type="number" dataKey="x" name="Impact" tick={{ fill: 'var(--muted)' }} />
          <YAxis type="number" dataKey="y" name="Confidence" domain={[0, 1]} tickFormatter={(v) => `${Math.round(v * 100)}%`} tick={{ fill: 'var(--muted)' }} />
          <Tooltip cursor={{ border: '1px solid #1f2937', strokeWidth: 1 }} content={customTooltip} />

          {/* Reference lines to split quadrants */}
          <ReferenceLine x={impactMedian} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
          <ReferenceLine y={confidenceThreshold} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />

          {/* Render non-highlighted points first */}
          {otherData && otherData.length > 0 && (
            <Scatter name="Predictions" data={otherData} fill='#9d00ffff' onClick={(d) => handlePointClick(d)} />
          )}
          {/* Render highlighted points on top with a distinct color/size */}
          {highlightedData && highlightedData.length > 0 && (
            <Scatter name="Highlighted" data={highlightedData} fill="#1d5872ff" onClick={(d) => handlePointClick(d)} />
          )}
        </ScatterChart>
      </ResponsiveContainer>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, color: 'var(--muted)', fontSize: 13 }}>
        <div>Impact threshold: {impactMedian}</div>
        <div>Confidence threshold: {Math.round(confidenceThreshold * 100)}%</div>
      </div>
      
    </div>
  );
}
