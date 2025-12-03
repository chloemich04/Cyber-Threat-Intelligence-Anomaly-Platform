import React, { useMemo, useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';

function SimpleSigTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0].payload || payload[0];
  const pct = Math.round((p.value || 0) * 100);
  const raw = p.total || 0;
  return (
    <div style={{ background: '#0b1220', color: '#e5e7eb', padding: 10, borderRadius: 8, border: '1px solid #1f2937', boxShadow: '0 8px 20px rgba(0,0,0,0.5)', maxWidth: 320 }}>
      <div style={{ fontWeight: 700 }}>{p.label}</div>
      <div style={{ marginTop: 6, color: '#cbd5e1' }}>{`${pct}% — ${raw && typeof raw === 'number' && raw.toFixed ? raw.toFixed(2) : raw} (aggregated)`}</div>
    </div>
  );
}

export default function KeySignalsBarChart({ signals = [], predictions = [] }) {
  // canonicalize top signals list (prefer provided user-friendly list)
  const topSignals = Array.isArray(signals) && signals.length > 0 ? signals.slice(0, 12) : [];

  // build weeks array from predictions
  const weeks = Array.isArray(predictions) ? predictions.map(p => p.week_start) : [];

  // helper to extract CVE id from a label when available
  const extractCve = (label = '') => {
    const m = String(label).match(/CVE-\d{4}-\d{1,7}/i);
    return m ? m[0].toUpperCase() : null;
  };

  // canonical key for a signal object or label so we dedupe rows properly
  const canonicalKey = (s = {}) => {
    const idOrLabel = (s.id || s.label || '').toString();
    const type = (s.signal_type || s.type || '').toString().toLowerCase();
    // if any string contains a CVE, prefer the canonical CVE id
    const cve = extractCve(idOrLabel);
    if (cve) return cve;
    // if the item explicitly declares type 'cve' and has an id, use that
    if (type === 'cve' && s.id) {
      const cveFromId = extractCve(s.id);
      if (cveFromId) return cveFromId;
    }
    // prefer stable id when present
    if (s.id) return String(s.id);
    // otherwise fall back to normalized label or type
    return sanitizeLabel((s.label || s.signal_type || '').toString());
  };

  // aggressively sanitize a label: remove parentheticals, trailing tokens like 'activity' or 'reports', punctuation
  const sanitizeLabel = (raw = '') => {
    if (!raw) return '';
    let v = String(raw).trim();
    // remove parenthetical content e.g. 'CVE-2018-2368 (Exploit)' -> 'CVE-2018-2368'
    v = v.replace(/\s*\(.*?\)\s*/g, ' ');
    // remove common trailing descriptors
    v = v.replace(/\b(activity|reports|report|vulnerability|exploit)\b/gi, ' ');
    // remove punctuation and extra whitespace
    v = v.replace(/[\(\)\,\:\/\-]/g, ' ').replace(/\s+/g, ' ').trim();
    return v.toLowerCase();
  };

  // map common synonyms to canonical tag names
  const canonicalTag = (label = '') => {
    const s = sanitizeLabel(label || '').toLowerCase();
    if (!s) return '';
    if (/(^|\s)exploit(\s|$)/i.test(s)) return 'Exploit';
    if (/(^|\s)vulnerab(ility|le|ility reports?)(\s|$)/i.test(s)) return 'Vulnerability';
    if (/(^|\s)cve(\s|$)/i.test(s)) return 'CVE';
    return s;
  };

  // build canonical rows: prefer key_signals_user_friendly labels, fallback to aggregating per-week signals
  const rows = useMemo(() => {
    const rowsByKey = new Map();

    // start from global signals (use canonical keys to avoid duplicates)
    topSignals.forEach(s => {
      const key = canonicalKey(s);
      const label = s.label || s.id || `${s.type || s.signal_type || 'signal'}`;
      rowsByKey.set(key, { key, label, type: s.type || s.signal_type, globalScore: Number(s.score) || 0 });
    });

    // augment with signals found in predictions
    (predictions || []).forEach(p => {
      (p.top_signals || []).forEach(ts => {
        const key = canonicalKey(ts);
        if (!rowsByKey.has(key)) {
          const label = ts.label || ts.id || key;
          rowsByKey.set(key, { key, label, type: ts.signal_type, globalScore: 0 });
        }
      });
    });

    // return as array sorted by globalScore desc
    return Array.from(rowsByKey.values()).sort((a, b) => (b.globalScore || 0) - (a.globalScore || 0));
  }, [topSignals, predictions]);
  // build matrix of scores: rows x weeks
  const matrix = useMemo(() => {
    const m = rows.map(() => Array(weeks.length).fill(0));

    weeks.forEach((wk, colIdx) => {
      const p = (predictions || []).find(x => x.week_start === wk);
      if (!p) return;
      (p.top_signals || []).forEach(ts => {
        // match to row by canonical key
        const tsKey = canonicalKey(ts);
        rows.forEach((r, rowIdx) => {
          if (r.key && tsKey && r.key.toString().toLowerCase() === tsKey.toString().toLowerCase()) {
            m[rowIdx][colIdx] = Number(ts.score) || 0;
          }
        });
      });
    });

    return m;
  }, [rows, weeks, predictions]);

  // Final dedupe pass: collapse tag variants (e.g., 'Vulnerability Reports' and 'vulnerability')
  // into a single canonical tag row so the UI never shows duplicates.
  const { collapsedRows, collapsedMatrix } = useMemo(() => {
    const map = new Map();
    const numCols = weeks.length;

    rows.forEach((r, rowIdx) => {
      // determine normalized grouping key: CVEs stay as-is, non-CVEs map to 'tag:<canonicalTag>'
      const isCve = /^CVE-\d{4}-\d{1,7}/i.test(String(r.key || ''));
      const normalized = isCve ? r.key : `tag:${canonicalTag(r.label || r.key) || sanitizeLabel(r.label || r.key)}`;

      if (!map.has(normalized)) {
        map.set(normalized, {
          key: normalized,
          label: isCve ? (r.label || r.key) : (r.label || String(normalized).replace(/^tag:/, '')),
          type: isCve ? 'cve' : 'tag',
          scores: Array(numCols).fill(0),
        });
      }

      const entry = map.get(normalized);
      const rowScores = matrix[rowIdx] || Array(numCols).fill(0);
      for (let c = 0; c < numCols; c++) {
        entry.scores[c] += Number(rowScores[c]) || 0;
      }
    });

    const outRows = Array.from(map.values()).map((e) => ({ key: e.key, label: e.label, type: e.type, globalScore: 0 }));
    const outMatrix = Array.from(map.values()).map((e) => e.scores);
    return { collapsedRows: outRows, collapsedMatrix: outMatrix };
  }, [rows, matrix, weeks]);
  // UI: allow aggregation of CVE rows into tag buckets (exploit/vulnerability)
  // Default to false so both CVE rows and tag rows are shown together by default.
  const [aggregateCves, setAggregateCves] = useState(false);

  // ref for chart wrapper used by tooltips/positioning (declare early to keep hook order stable)
  const chartRef = useRef(null);

  // If aggregation is enabled, collapse CVE rows into tag rows and sum per-week scores.
  const { displayRows, displayMatrix, contributorsByTag } = useMemo(() => {
    if (!aggregateCves) return { displayRows: collapsedRows, displayMatrix: collapsedMatrix, contributorsByTag: null };

    const tagBuckets = new Map();

    collapsedRows.forEach((r, rowIdx) => {
      // determine tag: if row.key is a CVE, map to tag via r.type or canonicalTag; otherwise use canonicalTag of label/key
      const isCve = /^CVE-\d{4}-\d{1,7}/i.test(String(r.key || ''));
      const rawTagSource = isCve ? (r.type || r.label) : (r.label || r.key);
      const tag = canonicalTag(rawTagSource) || 'other';
      const tagKey = `tag:${tag}`;

      if (!tagBuckets.has(tagKey)) {
        tagBuckets.set(tagKey, { key: tagKey, label: tag.charAt(0).toUpperCase() + tag.slice(1), type: 'tag', scores: Array(weeks.length).fill(0), contributors: Array(weeks.length).fill(null).map(() => []) });
      }

      // accumulate this row's per-week scores into the tag bucket
      const bucket = tagBuckets.get(tagKey);
      (collapsedMatrix[rowIdx] || []).forEach((val, colIdx) => {
        const v = Number(val) || 0;
        if (v > 0) {
          bucket.scores[colIdx] += v;
          bucket.contributors[colIdx].push({ label: r.label, score: v });
        }
      });
    });

    const dRows = Array.from(tagBuckets.values());
    const dMatrix = dRows.map(r => r.scores);
    const contributors = new Map();
    dRows.forEach(r => contributors.set(r.key, r.contributors));
    return { displayRows: dRows, displayMatrix: dMatrix, contributorsByTag: contributors };
  }, [aggregateCves, collapsedRows, collapsedMatrix, weeks]);

  const formatWeek = (wk) => {
    try {
      return new Date(wk).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch (e) {
      return wk;
    }
  };

  // choose the matrix/rows we'll actually render (after dedupe and optional aggregation)
  const usedRows = displayRows || collapsedRows || rows;
  const usedMatrix = displayMatrix || collapsedMatrix || matrix;

  // compute maximum value for color scaling (guard tiny values)
  const maxVal = Math.max(0.001, ...(usedMatrix.flat ? usedMatrix.flat() : [].concat(...usedMatrix)));

  // if there are no rows after processing, show a friendly empty state
  if (!usedRows || usedRows.length === 0) {
    return (
      <div style={{height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)'}}>
        No key signals available yet.
      </div>
    );
  }
  // Build totals per display row (sum across weeks)
  const totals = (usedRows || []).map((r, idx) => {
    const vals = usedMatrix[idx] || [];
    const total = vals.reduce((s, v) => s + (Number(v) || 0), 0);
    return { key: r.key, label: r.label, type: r.type, total };
  });

  // sort descending and take top N
  const TOP_N = 12;
  const sorted = [...totals].sort((a, b) => b.total - a.total).slice(0, TOP_N);

  // compute max so we can normalize into 0..1 for the X axis (fits the existing panel scale)
  const maxTotal = Math.max(0.000001, ...sorted.map(d => d.total));

  // normalized chart data and keep original totals for tooltip
  const chartData = sorted.map((d, i) => ({ ...d, rank: i + 1, value: (d.total || 0) / maxTotal }));

  const COLORS = ['#9d00ff', '#cc9cea', '#482563', '#9b8be6', '#00d9ff', '#22c55e'];


  // Custom Y tick renderer: wrap long labels into up to 2 lines and center them vertically
  const renderYAxisTick = (props) => {
    const { y, payload } = props;
    const label = String(payload.value || '');
    const maxLen = 28;
    let line1 = label;
    let line2 = '';
    if (label.length > maxLen) {
      const idx = label.lastIndexOf(' ', maxLen) > 0 ? label.lastIndexOf(' ', maxLen) : maxLen;
      line1 = label.slice(0, idx).trim();
      line2 = label.slice(idx).trim();
    }
    return (
      <g transform={`translate(0,${y})`}>
        <text x={6} y={-6} textAnchor="start" fill="#fff" fontSize={13} style={{ pointerEvents: 'none' }}>{line1}</text>
        {line2 && <text x={6} y={10} textAnchor="start" fill="#cbd5e1" fontSize={12} style={{ pointerEvents: 'none' }}>{line2}</text>}
      </g>
    );
  };

  // PortalTooltip: render tooltip into document.body so it's always above other elements
  function PortalTooltip({ chartRef }) {
    const [visible, setVisible] = useState(false);
    const [pos, setPos] = useState({ x: 0, y: 0 });
    const [payload, setPayload] = useState(null);

    useEffect(() => {
      const el = chartRef && chartRef.current;
      if (!el) return;

      const onMove = (ev) => {
        const rect = el.getBoundingClientRect();
        if (ev.clientX < rect.left || ev.clientX > rect.right || ev.clientY < rect.top || ev.clientY > rect.bottom) {
          setVisible(false);
          return;
        }

        const localY = ev.clientY - rect.top;
        const rowsCount = Math.max(1, chartData.length);
        const rowH = rect.height / rowsCount;
        let idx = Math.floor(localY / rowH);
        if (idx < 0) idx = 0;
        if (idx >= rowsCount) idx = rowsCount - 1;

        const d = chartData[idx];
        if (!d) {
          setVisible(false);
          return;
        }

        setPayload(d);
        const tooltipX = Math.min(window.innerWidth - 260, ev.clientX + 12);
        const tooltipY = Math.max(8, Math.min(window.innerHeight - 80, ev.clientY - 8));
        setPos({ x: tooltipX, y: tooltipY });
        setVisible(true);
      };

      const onLeave = () => setVisible(false);

      el.addEventListener('pointermove', onMove);
      el.addEventListener('pointerleave', onLeave);

      return () => {
        el.removeEventListener('pointermove', onMove);
        el.removeEventListener('pointerleave', onLeave);
      };
    }, [chartRef, chartData]);

    if (typeof document === 'undefined') return null;

    return ReactDOM.createPortal(
      visible && payload ? (
        <div style={{ position: 'fixed', left: pos.x, top: pos.y, zIndex: 2147483000, pointerEvents: 'none', transform: 'translateZ(0)', willChange: 'transform, opacity' }} aria-hidden>
          <div style={{ background: '#111827', color: '#e5e7eb', padding: '8px 10px', borderRadius: 8, border: '1px solid #1f2937', width: 250, fontSize: 13, boxShadow: '0 8px 22px rgba(0,0,0,0.6)' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#e5e7eb' }}>{`${payload.rank != null ? `Rank #${payload.rank}` : 'Rank —'} — ${payload.label}`}</div>
            <div style={{ marginTop: 6, color: '#e5e7eb' }}>{`Total: ${Math.round((payload.total || 0) * 100) / 100}`}</div>
          </div>
        </div>
      ) : null,
      document.body
    );
  }

  return (
    <div style={{ width: '100%', height: 340, padding: 8 }} aria-label="Key signals bar chart">
      {(!chartData || chartData.length === 0) ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--muted)' }}>No key signals available</div>
      ) : (
        <div ref={chartRef} style={{ position: 'relative', width: '100%', height: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={chartData} margin={{ top: 8, right: 12, left: 12, bottom: 8 }} barCategoryGap={8}>
            <CartesianGrid vertical={false} stroke="#0f172a" strokeDasharray="3 6" />
            <XAxis type="number" domain={[0, 1]} ticks={[0, 0.25, 0.5, 0.75, 1]} tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: '#0b1220' }} tickLine={false} />
            <YAxis type="category" dataKey="label" width={160} tick={renderYAxisTick} axisLine={false} tickLine={false} />
                      {/* Tooltip replaced by PortalTooltip to render above the chart */}
            <Bar dataKey="value" radius={[18, 18, 18, 18]} isAnimationActive={true} animationDuration={700} barSize={20}>
              {chartData.map((entry, idx) => (
                <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
              ))}
            </Bar>
            </BarChart>
          </ResponsiveContainer>
                    {/* Portal tooltip component — rendered on top of everything */}
                    <PortalTooltip chartRef={chartRef} />
        </div>
      )}
      {/* Bottom metrics: show top signal and display settings similar to Risk Matrix */}
      {chartData && chartData.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, color: 'var(--muted)', fontSize: 13 }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontWeight: 700, color: 'var(--text)' }}>{chartData[0].label}</div>
            <div style={{ marginTop: 4 }}>{`Top signal: ${Math.round((chartData[0].value || 0) * 100)}%`}</div>
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div>{`Signals shown: ${chartData.length}`}</div>
            <div>{`Aggregation: ${aggregateCves ? 'On' : 'Off'}`}</div>
          </div>
        </div>
      )}
    </div>
  );
}
