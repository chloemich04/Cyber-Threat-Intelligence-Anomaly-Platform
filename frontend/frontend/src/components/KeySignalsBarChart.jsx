import React, { useMemo, useState } from 'react';

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

  // interaction removed: this chart is now static (click-to-filter removed)

  return (
    <div style={{padding: '0.5rem'}}>
   

      {/* Heatmap grid */}
      <div style={{overflowX: 'auto'}}>
        <div style={{display: 'grid', gridTemplateColumns: `200px repeat(${weeks.length}, 1fr)`, gap: 8, alignItems: 'center'}}>
          {/* header row: empty cell + week labels */}
          <div />
          {weeks.map((wk, cIdx) => (
            <div key={`wk-${cIdx}`} style={{fontSize: 12, color: 'var(--muted)', textAlign: 'center'}}>{formatWeek(wk)}</div>
          ))}

          {/* rows */}
          {usedRows.map((r, rowIdx) => (
            <React.Fragment key={`row-${rowIdx}`}>
              <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                <div style={{fontWeight: 600}} title={r.label}>{r.label}</div>
              </div>

              {(usedMatrix[rowIdx] || []).map((val, colIdx) => {
                const score = Number(val) || 0;
                const intensity = Math.min(1, score / maxVal);
                const bg = score > 0 ? `rgba(56,189,248, ${0.25 + 0.7 * intensity})` : 'transparent';
                const border = score > 0 ? 'none' : '1px solid rgba(255,255,255,0.04)';
                return (
                  <div key={`cell-${rowIdx}-${colIdx}`} title={`${r.label} — ${formatWeek(weeks[colIdx])} — ${Math.round(score * 100)}%`} style={{height: 32, background: bg, borderRadius: 4, border}}> 
                    {/* visually centered score for high values */}
                    {score > 0.0 && (
                      <div style={{textAlign: 'center', lineHeight: '32px', fontWeight: 700, color: 'rgba(255,255,255,0.95)'}}>{Math.round(score * 100)}%</div>
                    )}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
