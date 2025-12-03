import React from 'react';

export default function InfoIcon({ size = 14, color = 'currentColor', title = 'Info' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={title}
      focusable="false"
      style={{ display: 'inline-block', verticalAlign: 'middle' }}
    >
      <title>{title}</title>
      <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="1.5" fill="none" />
      <rect x="11" y="9" width="2" height="6" rx="1" fill={color} />
      <circle cx="12" cy="7" r="1.25" fill={color} />
    </svg>
  );
}
