import React from 'react';

export default function KeySignalsBarChart({ signals = [] }) {
  const items = Array.isArray(signals) ? signals.slice(0, 8) : [];
  if (!items || items.length === 0) {
    return (
      <div style={{height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)'}}>
        No key signals available yet.
      </div>
    );
  }

  // compute percent display (scores are 0..1, but may sum to <=1)
  const maxScore = Math.max(...items.map(s => s.score || 0), 0.01);

  return (
    <div style={{padding: '0.5rem'}}>
      <div style={{display: 'flex', flexDirection: 'column', gap: '0.6rem'}}>
        {items.map((s, idx) => {
          const score = Math.max(0, Number(s.score) || 0);
          const percent = Math.round((score / maxScore) * 100);
          return (
            <div key={`sig-${idx}`} style={{display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
              <div style={{flex: '0 0 180px', minWidth: 120}}>
                <div style={{fontWeight: 600}} title={s.label}>{s.label}</div>
                <div style={{fontSize: '0.8rem', color: 'var(--muted)'}}>{s.type}</div>
              </div>

              <div style={{flex: 1}}>
                <div style={{background: 'rgba(255,255,255,0.06)', height: 14, borderRadius: 8, overflow: 'hidden'}} aria-hidden>
                  <div style={{width: `${percent}%`, height: '100%', background: 'linear-gradient(90deg,var(--accent), #2dd4bf)'}} />
                </div>
              </div>

              <div style={{width: 60, textAlign: 'right', fontWeight: 600}}>{Math.round(score * 100)}%</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
