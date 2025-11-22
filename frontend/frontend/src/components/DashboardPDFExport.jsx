import React, { useState } from 'react';
import { useMetrics } from '../context/AppContext';
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

  // Read metrics from app context at component top-level (hooks must be called here)
  const { metrics } = useMetrics();

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
      const margin = 20;
      const contentWidth = pageWidth - (2 * margin);
      let yPosition = margin;
      
      // Color palette from app (converted to RGB)
      const colors = {
        bg: [15, 23, 42],           // --bg: #0f172a
        panel: [17, 24, 39],        // --panel: #111827
        text: [229, 231, 235],      // --text: #e5e7eb
        muted: [148, 163, 184],     // --muted: #94a3b8
        accent: [56, 189, 248],     // --accent: #38bdf8
        accent2: [34, 197, 94],     // --accent-2: #22c55e
        warn: [245, 158, 11],       // --warn: #f59e0b
        danger: [239, 68, 68],      // --danger: #ef4444
        border: [31, 41, 55],       // --border: #1f2937
      };

      // Set dark background
      pdf.setFillColor(...colors.bg);
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');

      // Helper function to add new page if needed
      const checkPageBreak = (requiredSpace) => {
        if (yPosition + requiredSpace > pageHeight - margin) {
          pdf.addPage();
          // Add dark background to new page
          pdf.setFillColor(...colors.bg);
          pdf.rect(0, 0, pageWidth, pageHeight, 'F');
          yPosition = margin;
          return true;
        }
        return false;
      };

      // Header with gradient effect
      pdf.setFillColor(56, 189, 248); // Accent color
      pdf.rect(0, 0, pageWidth, 15, 'F');
      
      pdf.setFontSize(24);
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Cyber Threat Intelligence Dashboard Report', margin, yPosition + 5);
      yPosition += 20;

      pdf.setFontSize(10);
      pdf.setTextColor(...colors.muted);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Generated: ${new Date().toLocaleString()}`, margin, yPosition);
      
      // Add decorative line
      pdf.setDrawColor(...colors.accent);
      pdf.setLineWidth(0.5);
      pdf.line(margin, yPosition + 3, pageWidth - margin, yPosition + 3);
      yPosition += 15;

      // Executive Summary
      checkPageBreak(35);
      
      // Section header with background
      pdf.setFillColor(...colors.panel);
      pdf.roundedRect(margin, yPosition - 2, contentWidth, 10, 2, 2, 'F');
      
      pdf.setFontSize(16);
      pdf.setTextColor(...colors.accent);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Executive Summary', margin + 3, yPosition + 5);
      yPosition += 14;

      pdf.setFontSize(11);
      pdf.setTextColor(...colors.text);
      pdf.setFont('helvetica', 'normal');
      const summary = 'This report provides comprehensive insights into current cyber threat landscape, including historical threat data, incident metrics, and key vulnerability trends.';
      const lines = pdf.splitTextToSize(summary, contentWidth - 6);
      if (Array.isArray(lines)) {
        lines.forEach(line => {
          if (line && typeof line === 'string') {
            checkPageBreak(7);
            pdf.text(line, margin + 3, yPosition);
            yPosition += 7;
          }
        });
      }
      yPosition += 10;

      // Key Metrics
      if (exportOptions.includeMetrics) {
        checkPageBreak(50);
        
        // Section header with background
        pdf.setFillColor(...colors.panel);
        pdf.roundedRect(margin, yPosition - 2, contentWidth, 10, 2, 2, 'F');
        
        pdf.setFontSize(16);
        pdf.setTextColor(...colors.accent);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Key Metrics', margin + 3, yPosition + 5);
        yPosition += 16;

  // Metrics in cards
  // Use metrics from application context so PDF values match the dashboard.
              const metricsData = metrics || {};
              const metrics = [
                { label: 'Total Cyber Incidents', value: (metricsData.totalIncidents != null) ? String(metricsData.totalIncidents) : '—' },
                { label: 'Exposure Score (0-100)', value: (metricsData.exposureScore != null) ? String(metricsData.exposureScore) : '—' },
              ];

        metricsArray.forEach((metric, idx) => {
          if (idx % 2 === 0 && idx > 0) {
            yPosition += 22;
            checkPageBreak(22);
          }
          
          const xStart = margin + (idx % 2) * (contentWidth / 2 + 5);
          const cardWidth = (contentWidth / 2) - 5;
          
          // Metric card with gradient background
          pdf.setFillColor(17, 24, 39);
          pdf.roundedRect(xStart, yPosition, cardWidth, 18, 2, 2, 'F');
          
          // Card border
          pdf.setDrawColor(...colors.border);
          pdf.setLineWidth(0.3);
          pdf.roundedRect(xStart, yPosition, cardWidth, 18, 2, 2, 'D');
          
          // Label
          pdf.setFontSize(10);
          pdf.setTextColor(...colors.muted);
          pdf.setFont('helvetica', 'normal');
          if (metric.label && typeof metric.label === 'string') {
            pdf.text(metric.label, xStart + 3, yPosition + 6);
          }
          
          // Value
          pdf.setFontSize(14);
          pdf.setTextColor(...colors.accent);
          pdf.setFont('helvetica', 'bold');
          if (metric.value && typeof metric.value === 'string') {
            pdf.text(metric.value, xStart + 3, yPosition + 14);
          }
        });
        
        yPosition += 24;
      }

      // Threat Summary Table
      if (exportOptions.includeThreatSummary) {
        checkPageBreak(80);
        
        // Section header with background
        pdf.setFillColor(...colors.panel);
        pdf.roundedRect(margin, yPosition - 2, contentWidth, 10, 2, 2, 'F');
        
        pdf.setFontSize(16);
        pdf.setTextColor(...colors.accent);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Threat Summary', margin + 3, yPosition + 5);
        yPosition += 16;

  // Table with modern styling (removed 'Avg Loss' column — data not available)
  const colWidths = [48, 28, 28, 28];
  const headers = ['Category', 'Incidents', '% Change', 'Status'];
        let xPos = margin;
        
        // Draw table header background
        pdf.setFillColor(31, 41, 55);
        pdf.roundedRect(margin, yPosition - 4, contentWidth, 8, 1, 1, 'F');
        
        // Draw header borders
        pdf.setDrawColor(...colors.border);
        pdf.setLineWidth(0.2);
        
        // Header text
        pdf.setFontSize(9);
        pdf.setTextColor(...colors.text);
        pdf.setFont('helvetica', 'bold');
        
        headers.forEach((header, i) => {
          if (header && typeof header === 'string') {
            pdf.text(header, xPos + 2, yPosition + 1);
          }
          xPos += colWidths[i];
        });
        
        yPosition += 8;

       

        pdf.setFont('helvetica', 'normal');
        threatData.forEach((row, idx) => {
          checkPageBreak(9);
          
          // Alternating row backgrounds
          if (idx % 2 === 0) {
            pdf.setFillColor(17, 24, 39);
            pdf.rect(margin, yPosition - 4, contentWidth, 7, 'F');
          }
          
          xPos = margin;
          row.forEach((cell, i) => {
            pdf.setFontSize(9);
            pdf.setTextColor(...colors.text);
            
            if (cell && typeof cell === 'string') {
              pdf.text(cell, xPos + 2, yPosition + 1);
            }
            xPos += colWidths[i] || 28;
          });
          
          // Subtle row separator
          pdf.setDrawColor(...colors.border);
          pdf.setLineWidth(0.1);
          pdf.line(margin, yPosition + 3, margin + contentWidth, yPosition + 3);
          
          yPosition += 7;
        });
        yPosition += 10;
      }

      // Insights
      if (exportOptions.includeInsights) {
        checkPageBreak(45);
        
        // Section header with background
        pdf.setFillColor(...colors.panel);
        pdf.roundedRect(margin, yPosition - 2, contentWidth, 10, 2, 2, 'F');
        
        pdf.setFontSize(16);
        pdf.setTextColor(...colors.accent);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Key Insights', margin + 3, yPosition + 5);
        yPosition += 16;

        const insights = [
          'Highest Rate: State A',
          'Lowest Rate: State B',
          'Top Threat Types: Ransomware, Phishing, DDoS',
        ];

        pdf.setFontSize(11);
        pdf.setTextColor(...colors.text);
        pdf.setFont('helvetica', 'normal');
        insights.forEach(insight => {
          checkPageBreak(7);
          if (insight && typeof insight === 'string') {
            pdf.text(`• ${insight}`, margin + 5, yPosition);
          }
          yPosition += 7;
        });
        yPosition += 10;
      }

      // Capture and include selected charts in 2-column layout
      const chartConfigs = [
        { id: 'incident-severity', option: 'includeIncidentSeverity', title: 'Incident Severity Distribution' },
        { id: 'top-threats', option: 'includeTopThreats', title: 'Top Threat Types' },
        { id: 'breach-types', option: 'includeBreachTypes', title: 'Breach Type Distribution' },
        { id: 'vulnerable-tech', option: 'includeVulnerableTech', title: 'Top Vulnerable Technologies' },
        { id: 'attack-vectors', option: 'includeAttackVectors', title: 'Attack Vector Trends' },
        { id: 'response-times', option: 'includeResponseTimes', title: 'Incident Response Times' },
      ];

      const selectedCharts = chartConfigs.filter(chart => exportOptions[chart.option]);
      
      if (selectedCharts.length > 0) {
        checkPageBreak(45);
        
        // Section header with background
        pdf.setFillColor(...colors.panel);
        pdf.roundedRect(margin, yPosition - 2, contentWidth, 10, 2, 2, 'F');
        
        pdf.setFontSize(16);
        pdf.setTextColor(...colors.accent);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Historical Analytics Charts', margin + 3, yPosition + 5);
        yPosition += 18;
      }

      // Process charts in pairs for 2-column layout
      for (let i = 0; i < selectedCharts.length; i += 2) {
        const leftChart = selectedCharts[i];
        const rightChart = selectedCharts[i + 1];
        
        checkPageBreak(95);
        
        const chartWidth = (contentWidth - 10) / 2; // 10mm gap between charts
        const chartHeight = 75; // Fixed height for consistency
        
        // Left chart
        const leftImage = await captureChart(leftChart.id);
        
        // Chart title with background
        pdf.setFillColor(...colors.panel);
        pdf.roundedRect(margin, yPosition, chartWidth, 8, 1, 1, 'F');
        pdf.setFontSize(11);
        pdf.setTextColor(...colors.text);
        pdf.setFont('helvetica', 'bold');
        pdf.text(leftChart.title, margin + 2, yPosition + 5);
        
        if (leftImage) {
          pdf.addImage(leftImage, 'PNG', margin, yPosition + 9, chartWidth, chartHeight);
        } else {
          pdf.setFillColor(...colors.panel);
          pdf.roundedRect(margin, yPosition + 9, chartWidth, chartHeight, 2, 2, 'F');
          pdf.setDrawColor(...colors.border);
          pdf.setLineWidth(0.5);
          pdf.setLineDash([2, 2]);
          pdf.roundedRect(margin, yPosition + 9, chartWidth, chartHeight, 2, 2, 'D');
          pdf.setLineDash([]);
          
          pdf.setFontSize(9);
          pdf.setTextColor(...colors.muted);
          pdf.setFont('helvetica', 'italic');
          pdf.text('Chart not available or coming soon', margin + (chartWidth / 2), yPosition + (chartHeight / 2), { align: 'center' });
        }
        
        // Right chart (if exists)
        if (rightChart) {
          const rightImage = await captureChart(rightChart.id);
          const rightX = margin + chartWidth + 10;
          
          // Chart title with background
          pdf.setFillColor(...colors.panel);
          pdf.roundedRect(rightX, yPosition, chartWidth, 8, 1, 1, 'F');
          pdf.setFontSize(11);
          pdf.setTextColor(...colors.text);
          pdf.setFont('helvetica', 'bold');
          pdf.text(rightChart.title, rightX + 2, yPosition + 5);
          
          if (rightImage) {
            pdf.addImage(rightImage, 'PNG', rightX, yPosition + 9, chartWidth, chartHeight);
          } else {
            pdf.setFillColor(...colors.panel);
            pdf.roundedRect(rightX, yPosition + 9, chartWidth, chartHeight, 2, 2, 'F');
            pdf.setDrawColor(...colors.border);
            pdf.setLineWidth(0.5);
            pdf.setLineDash([2, 2]);
            pdf.roundedRect(rightX, yPosition + 9, chartWidth, chartHeight, 2, 2, 'D');
            pdf.setLineDash([]);
            
            pdf.setFontSize(9);
            pdf.setTextColor(...colors.muted);
            pdf.setFont('helvetica', 'italic');
            pdf.text('Chart not available or coming soon', rightX + (chartWidth / 2), yPosition + (chartHeight / 2), { align: 'center' });
          }
        }
        
        yPosition += chartHeight + 20;
      }

      // Footer on last page
      pdf.setFillColor(56, 189, 248); // Accent color bar
      pdf.rect(0, pageHeight - 12, pageWidth, 12, 'F');
      
      pdf.setFontSize(8);
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'normal');
      pdf.text('© 2025 CTI Dashboard — Historical Threat Analytics', pageWidth / 2, pageHeight - 5, { align: 'center' });

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
