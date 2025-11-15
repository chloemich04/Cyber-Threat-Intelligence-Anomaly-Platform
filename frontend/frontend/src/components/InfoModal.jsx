import React from 'react';

const InfoModal = ({ open, onClose, title, children, ariaLabel = 'Information dialog' }) => {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      className="ci-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1200,
      }}
    >
      <section
        className="panel"
        style={{
          position: 'relative',
          width: 'min(900px, 94%)',
          maxHeight: '80vh',
          overflow: 'auto',
          padding: 20,
          background: 'var(--panel-background, #111827)',
          boxShadow: '0 8px 30px rgba(0,0,0,0.25)',
          borderRadius: 8,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          aria-label={`Close ${title} dialog`}
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            background: 'transparent',
            border: 'none',
            fontSize: 18,
            cursor: 'pointer',
          }}
        >
          ✕
        </button>

        {title && <h3>{title}</h3>}

        <div
          className="forecast-explanation"
          style={{
            background: 'var(--modal-section-bg, rgba(1, 1, 4, 0.29))',
            padding: 16,
            borderRadius: 6,
            borderLeft: '4px solid var(--accent, #40c4ff)',
            color: 'var(--panel-text, #e6eef7)',
            marginTop: 8,
          }}
        >
          {children}
        </div>
      </section>
    </div>
  );
};

export default InfoModal;
