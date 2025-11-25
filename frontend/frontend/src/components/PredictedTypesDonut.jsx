import React, { useState } from 'react';
import DonutChart from './DonutChart';

// PredictedTypesDonut expects predictedTypes: [{ threat_type, probability }]
export default function PredictedTypesDonut({ predictedTypes }) {
  const data = (predictedTypes || []).map(pt => ({ name: pt.threat_type, value: Math.max(0, pt.probability || 0) }));

  // Choose a color palette fallback
  const palette = ['#b2e0fcff', 
    '#3a6e90ff', 
    '#022a43ff'];

  // Slightly smaller outerRadius and increased wrapper height to make room for legend below
  return (
    <DonutWrapper data={data} palette={palette} />
  );
}

function DonutWrapper({ data, palette }) {
  const [hovered, setHovered] = useState(null);

  const descriptions = {
    'Exploit': 'An active exploitation of a vulnerability — evidence of attackers leveraging a flaw in software to gain access or execute code.',
    'Malware': 'Malicious software families (trojans, ransomware, backdoors) observed or likely to be involved in attacks.',
    'Vulnerability Disclosure': 'Public disclosure of vulnerabilities which can increase exploit risk if not patched promptly.',
    'Phishing': 'Social-engineering attacks aimed at tricking users into revealing credentials or executing malicious actions.',
    'Ransomware': 'Malware that encrypts data and demands payment; typically high-impact for operations.',
    'Default': 'No description available for this threat type.'
  };

  const handlePieEnter = (entry, index) => {
    if (entry && entry.name) setHovered(entry.name);
  };

  const handlePieLeave = () => setHovered(null);

  return (
    <div style={{ width: '100%', height: '280px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: '8px 0', overflow: 'hidden' }}>
      <div style={{ width: '100%', height: '190px', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: '10px' }}>
        <DonutChart
          data={data}
          colors={palette}
          innerRadius={40}
          outerRadius={65}
          height={200}
          onPieEnter={handlePieEnter}
          onPieLeave={handlePieLeave}
        />
      </div>

      <div style={{ width: '100%', maxWidth: '95%', marginTop: 8, minHeight: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {hovered ? (
          <div style={{ color: '#94a3b8', fontSize: 11, textAlign: 'center' }}>
            <strong style={{ color: '#e5e7eb' }}>{hovered}:</strong> {descriptions[hovered] || descriptions['Default']}
          </div>
        ) : (
          <div style={{ color: '#94a3b8', fontSize: 10, textAlign: 'center' }}>
            Hover a slice to see a short description of the threat type.
          </div>
        )}
      </div>
    </div>
  );
}
