import React, { useState } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const DashboardPDFExport = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [exportOptions, setExportOptions] = useState({
    includeMetrics: true,
    includeThreatSummary: true,
    includeInsights: true,
    includeIncidentSeverity: false,
    includeTopThreats: false,
    includeBreachTypes: false,
    includeVulnerableTech: false,
    includeAttackVectors: false,
    includeResponseTimes: false,
  });

  const handleCheckboxChange = (option) => {
    setExportOptions(prev => ({
      ...prev,
      [option]: !prev[option]
    }));
  };

  const captureChart = async (elementId) => {
    const element = document.querySelector(`[data-dashboard-chart-id="${elementId}"]`);
    if (!element) {
      console.warn(`Chart element ${elementId} not found`);
      return null;
    }

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true,
      });
      return canvas.toDataURL('image/png');
    } catch (error) {
      console.error(`Error capturing chart ${elementId}:`, error);
      return null;
    }
  };

  const generatePDF = async () => {
    setIsExporting(true);
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - (2 * margin);
      let yPosition = margin;

      // Helper function to add new page if needed
      const checkPageBreak = (requiredSpace) => {
        if (yPosition + requiredSpace > pageHeight - margin) {
          pdf.addPage();
          yPosition = margin;
          return true;
        }
        return false;
      };

      // Header
      pdf.setFontSize(20);
      pdf.setTextColor(37, 99, 235);
      pdf.text('Cyber Threat Intelligence Dashboard Report', margin, yPosition);
      yPosition += 10;

      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Generated: ${new Date().toLocaleString()}`, margin, yPosition);
      yPosition += 15;

      // Executive Summary
      pdf.setFontSize(14);
      pdf.setTextColor(0, 0, 0);
      pdf.text('Executive Summary', margin, yPosition);
      yPosition += 8;

      pdf.setFontSize(10);
      pdf.setTextColor(60, 60, 60);
      const summary = 'This report provides comprehensive insights into current cyber threat landscape, including historical threat data, incident metrics, and key vulnerability trends.';
      const lines = pdf.splitTextToSize(summary, contentWidth);
      if (Array.isArray(lines)) {
        lines.forEach(line => {
          if (line && typeof line === 'string') {
            checkPageBreak(6);
            pdf.text(line, margin, yPosition);
            yPosition += 6;
          }
        });
      }
      yPosition += 10;

      // Key Metrics
      if (exportOptions.includeMetrics) {
        checkPageBreak(50);
        
        pdf.setFontSize(14);
        pdf.setTextColor(0, 0, 0);
        pdf.text('Key Metrics', margin, yPosition);
        yPosition += 10;

        const metrics = [
          ['Total Cyber Incidents:', '—'],
          ['Average Loss / Incident:', '—'],
          ['Exposure Score (0-100):', '—'],
          ['KEV / Active Exploits:', '—'],
        ];

        pdf.setFontSize(10);
        metrics.forEach(([label, value]) => {
          checkPageBreak(7);
          pdf.setFont(undefined, 'bold');
          if (label && typeof label === 'string') {
            pdf.text(label, margin, yPosition);
          }
          pdf.setFont(undefined, 'normal');
          if (value && typeof value === 'string') {
            pdf.text(value, margin + 70, yPosition);
          }
          yPosition += 7;
        });
        yPosition += 10;
      }

      // Threat Summary Table
      if (exportOptions.includeThreatSummary) {
        checkPageBreak(80);
        
        pdf.setFontSize(14);
        pdf.setTextColor(0, 0, 0);
        pdf.text('Threat Summary', margin, yPosition);
        yPosition += 10;

        // Table headers
        pdf.setFontSize(9);
        pdf.setFont(undefined, 'bold');
        
        const colWidths = [40, 25, 25, 25, 25];
        const headers = ['Category', 'Incidents', '% Change', 'Avg Loss', 'Status'];
        let xPos = margin;
        
        headers.forEach((header, i) => {
          if (header && typeof header === 'string') {
            pdf.text(header, xPos, yPosition);
          }
          xPos += colWidths[i];
        });
        yPosition += 7;

        // Table data
        const threatData = [
          ['Phishing', '1,245', '+12%', '$8,400', 'Rising'],
          ['Ransomware', '530', '+4%', '$58,000', 'Stable'],
          ['Malware', '890', '-6%', '$11,200', 'Falling'],
          ['DDoS', '210', '+1%', '$5,600', 'Stable'],
          ['Credential Stuffing', '430', '+9%', '$3,700', 'Rising'],
        ];

        pdf.setFont(undefined, 'normal');
        threatData.forEach(row => {
          checkPageBreak(7);
          xPos = margin;
          row.forEach((cell, i) => {
            if (cell && typeof cell === 'string') {
              pdf.text(cell, xPos, yPosition);
            }
            xPos += colWidths[i];
          });
          yPosition += 6;
        });
        yPosition += 10;
      }

      // Insights
      if (exportOptions.includeInsights) {
        checkPageBreak(40);
        
        pdf.setFontSize(14);
        pdf.setTextColor(0, 0, 0);
        pdf.text('Key Insights', margin, yPosition);
        yPosition += 10;

        const insights = [
          'Highest Rate: State A',
          'Lowest Rate: State B',
          'Top Threat Types: Ransomware, Phishing, DDoS',
        ];

        pdf.setFontSize(10);
        pdf.setTextColor(60, 60, 60);
        insights.forEach(insight => {
          checkPageBreak(7);
          if (insight && typeof insight === 'string') {
            pdf.text(`• ${insight}`, margin + 5, yPosition);
          }
          yPosition += 7;
        });
        yPosition += 10;
      }

      // Capture and include selected charts
      const chartConfigs = [
        { id: 'incident-severity', option: 'includeIncidentSeverity', title: 'Incident Severity Distribution' },
        { id: 'top-threats', option: 'includeTopThreats', title: 'Top Threat Types' },
        { id: 'breach-types', option: 'includeBreachTypes', title: 'Breach Type Distribution' },
        { id: 'vulnerable-tech', option: 'includeVulnerableTech', title: 'Top Vulnerable Technologies' },
        { id: 'attack-vectors', option: 'includeAttackVectors', title: 'Attack Vector Trends' },
        { id: 'response-times', option: 'includeResponseTimes', title: 'Incident Response Times' },
      ];

      for (const chart of chartConfigs) {
        if (exportOptions[chart.option]) {
          checkPageBreak(100);
          
          pdf.setFontSize(14);
          pdf.setTextColor(0, 0, 0);
          if (chart.title && typeof chart.title === 'string') {
            pdf.text(chart.title, margin, yPosition);
          }
          yPosition += 8;

          const chartImage = await captureChart(chart.id);
          if (chartImage) {
            const imgWidth = contentWidth;
            const imgHeight = (imgWidth * 280) / 600;
            
            checkPageBreak(imgHeight + 10);
            pdf.addImage(chartImage, 'PNG', margin, yPosition, imgWidth, imgHeight);
            yPosition += imgHeight + 15;
          } else {
            pdf.setFontSize(10);
            pdf.setTextColor(150, 150, 150);
            pdf.text('Chart not available or coming soon', margin, yPosition);
            yPosition += 15;
          }
        }
      }

      // Footer on last page
      pdf.setFontSize(8);
      pdf.setTextColor(150, 150, 150);
      pdf.text('© 2025 CTI Dashboard — Historical Threat Analytics', margin, pageHeight - 10);

      // Save the PDF
      const filename = `dashboard-report-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(filename);

    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsExporting(false);
      setShowModal(false);
    }
  };

  return (
    <>
      <button 
        className="button primary" 
        type="button"
        onClick={() => setShowModal(true)}
        disabled={isExporting}
      >
        {isExporting ? 'Generating PDF...' : 'Export PDF'}
      </button>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Export Dashboard Report</h2>
              <button 
                className="modal-close" 
                onClick={() => setShowModal(false)}
                aria-label="Close modal"
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              <p style={{ marginBottom: '1rem', color: 'var(--muted)' }}>
                Select the content you want to include in your PDF report:
              </p>

              <div className="export-options">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={exportOptions.includeMetrics}
                    onChange={() => handleCheckboxChange('includeMetrics')}
                  />
                  <span>Key Metrics Summary</span>
                </label>

                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={exportOptions.includeThreatSummary}
                    onChange={() => handleCheckboxChange('includeThreatSummary')}
                  />
                  <span>Threat Summary Table</span>
                </label>

                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={exportOptions.includeInsights}
                    onChange={() => handleCheckboxChange('includeInsights')}
                  />
                  <span>Key Insights</span>
                </label>

                <div style={{ marginTop: '1rem', marginBottom: '0.5rem', fontWeight: '600' }}>
                  Historical Analytics Charts:
                </div>

                <label className="checkbox-label" style={{ marginLeft: '1rem' }}>
                  <input
                    type="checkbox"
                    checked={exportOptions.includeIncidentSeverity}
                    onChange={() => handleCheckboxChange('includeIncidentSeverity')}
                  />
                  <span>Incident Severity Distribution</span>
                </label>

                <label className="checkbox-label" style={{ marginLeft: '1rem' }}>
                  <input
                    type="checkbox"
                    checked={exportOptions.includeTopThreats}
                    onChange={() => handleCheckboxChange('includeTopThreats')}
                  />
                  <span>Top Threat Types</span>
                </label>

                <label className="checkbox-label" style={{ marginLeft: '1rem' }}>
                  <input
                    type="checkbox"
                    checked={exportOptions.includeBreachTypes}
                    onChange={() => handleCheckboxChange('includeBreachTypes')}
                  />
                  <span>Breach Type Distribution</span>
                </label>

                <label className="checkbox-label" style={{ marginLeft: '1rem' }}>
                  <input
                    type="checkbox"
                    checked={exportOptions.includeVulnerableTech}
                    onChange={() => handleCheckboxChange('includeVulnerableTech')}
                  />
                  <span>Top Vulnerable Technologies</span>
                </label>

                <label className="checkbox-label" style={{ marginLeft: '1rem' }}>
                  <input
                    type="checkbox"
                    checked={exportOptions.includeAttackVectors}
                    onChange={() => handleCheckboxChange('includeAttackVectors')}
                  />
                  <span>Attack Vector Trends</span>
                </label>

                <label className="checkbox-label" style={{ marginLeft: '1rem' }}>
                  <input
                    type="checkbox"
                    checked={exportOptions.includeResponseTimes}
                    onChange={() => handleCheckboxChange('includeResponseTimes')}
                  />
                  <span>Incident Response Times</span>
                </label>
              </div>
            </div>

            <div className="modal-footer">
              <button 
                className="button secondary" 
                onClick={() => setShowModal(false)}
                disabled={isExporting}
              >
                Cancel
              </button>
              <button 
                className="button primary" 
                onClick={generatePDF}
                disabled={isExporting}
              >
                {isExporting ? 'Generating...' : 'Generate PDF'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DashboardPDFExport;
