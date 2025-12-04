import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

// Expects predictions: [{ week_start: ISOstring, expected_count, expected_count_ci: [low, high], spike_probability }, ...]
export default function ForecastTimeline({ predictions = [], height = 260 }) {
  if (!predictions || predictions.length === 0) {
    return (
      <div style={{ padding: 20 }}>
        <div style={{ color: 'var(--muted)' }}>No timeline data available.</div>
      </div>
    );
  }

  // Sort by week_start ascending
  const data = [...predictions]
    .sort((a, b) => new Date(a.week_start) - new Date(b.week_start))
    .map((p) => ({
      week: new Date(p.week_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      expected_count: typeof p.expected_count === 'number' ? p.expected_count : Number(p.expected_count) || 0,
      ci_low: Array.isArray(p.expected_count_ci) ? p.expected_count_ci[0] : null,
      ci_high: Array.isArray(p.expected_count_ci) ? p.expected_count_ci[1] : null,
      spike_probability: p.spike_probability || 0,
      raw: p,
    }))
    .map((d) => {
      // If CI missing, create a small symmetric band around expected_count
      if (d.ci_low == null || d.ci_high == null) {
        const delta = Math.max(1, Math.round(d.expected_count * 0.2));
        return { ...d, ci_low: Math.max(0, d.expected_count - delta), ci_high: d.expected_count + delta };
      }
      return d;
    });

  const customTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null;
    const p = payload[0].payload;
    return (
      <div style={{ background: 'var(--panel-2)', padding: 8, borderRadius: 6, border: '1px solid var(--border)', color: 'var(--text)' }}>
        <div style={{ fontWeight: 700 }}>{label}</div>
        <div>Expected: <strong>{p.expected_count}</strong></div>
        <div>CI: {p.ci_low} — {p.ci_high}</div>
        <div>Spike probability: {(p.spike_probability * 100).toFixed(0)}%</div>
      </div>
    );
  };

  return (
    <div className="panel" style={{ gridColumn: '1 / -1', padding: 12 }}>
      <h3 style={{ marginTop: 0 }}>Forecast Timeline (with Confidence Interval)</h3>
      <div style={{ width: '100%', height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
            <XAxis dataKey="week" tick={{ fill: 'var(--muted)' }} />
            <YAxis tick={{ fill: 'var(--muted)' }} />
            <Tooltip content={customTooltip} />

            {/* CI band as two areas: lower & upper with transparent overlap to simulate band */}
            <Area type="monotone" dataKey="ci_high" stroke={null} fill="rgba(59,130,246,0.12)" dot={false} isAnimationActive={false} />
            <Area type="monotone" dataKey="ci_low" stroke={null} fill="rgba(59,130,246,0.12)" dot={false} isAnimationActive={false} />

            {/* Line for expected_count */}
            <Line type="monotone" dataKey="expected_count" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
