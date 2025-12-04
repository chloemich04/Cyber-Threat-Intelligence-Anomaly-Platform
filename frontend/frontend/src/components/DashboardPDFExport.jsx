import React, { useState } from 'react';
import { useMetrics, useInsights } from '../context/AppContext';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const DashboardPDFExport = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedState, setSelectedState] = useState(null);
  const [exportOptions, setExportOptions] = useState({
    includeMetrics: true,
    includeInsights: true,
    includeHeatmapDetail: false,
    includeEPSS: true,
    includeISP: true,
    includeCVERankings: true,
  });

  const handleCheckboxChange = (option) => {
    setExportOptions(prev => ({
      ...prev,
      [option]: !prev[option]
    }));
  };

  // Read metrics and insights from app context at component top-level (hooks must be called here)
  const { metrics } = useMetrics();
  const { insights } = useInsights();

  // Listen for state selection from heatmap
  React.useEffect(() => {
    const handleStateSelected = (e) => {
      const detail = e.detail || {};
      setSelectedState({
        name: detail.name,
        code: detail.code || detail.region_code,
        totalCves: detail.total_cves,
      });
      // Auto-enable heatmap detail when state is selected
      setExportOptions(prev => ({ ...prev, includeHeatmapDetail: true }));
    };

    const handleStateCleared = () => {
      setSelectedState(null);
      setExportOptions(prev => ({ ...prev, includeHeatmapDetail: false }));
    };

    window.addEventListener('stateSelected', handleStateSelected);
    window.addEventListener('stateCleared', handleStateCleared);

    return () => {
      window.removeEventListener('stateSelected', handleStateSelected);
      window.removeEventListener('stateCleared', handleStateCleared);
    };
  }, []);

  const captureChart = async (elementId) => {
    const element = document.querySelector(`[data-dashboard-chart-id="${elementId}"]`);
    if (!element) {
      console.warn(`Chart element ${elementId} not found`);
      return null;
    }

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: null,
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
        panel: [11, 34, 58],        // --panel: #0b223a
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
      pdf.text('ThreatLens Dashboard Report', margin, yPosition + 5);
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

      // Executive Summary - dynamically built based on selected sections
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
      
      // Build dynamic summary based on selected export options
      const summaryParts = [];
      if (exportOptions.includeMetrics) {
        summaryParts.push('key performance metrics');
      }
      if (exportOptions.includeInsights) {
        summaryParts.push('threat intelligence insights');
      }
      const chartParts = [];
      if (exportOptions.includeEPSS) {
        chartParts.push('EPSS vulnerability scores');
      }
      if (exportOptions.includeISP) {
        chartParts.push('ISP threat distribution');
      }
      if (exportOptions.includeCVERankings) {
        chartParts.push('CVE rankings');
      }
      if (chartParts.length > 0) {
        summaryParts.push(`threat analytics including ${chartParts.join(', ')}`);
      }
      
      let summary = 'This report provides ';
      if (summaryParts.length === 0) {
        summary += 'a snapshot of the current cyber threat landscape.';
      } else if (summaryParts.length === 1) {
        summary += summaryParts[0] + ' for the current cyber threat landscape.';
      } else if (summaryParts.length === 2) {
        summary += summaryParts.join(' and ') + ' for the current cyber threat landscape.';
      } else {
        summary += summaryParts.slice(0, -1).join(', ') + ', and ' + summaryParts[summaryParts.length - 1] + ' for the current cyber threat landscape.';
      }
      
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

        // Metrics in cards - use metrics from application context
        const metricsData = metrics || {};
        const metricsArray = [
          { label: 'Total Cyber Incidents', value: (metricsData.totalIncidents != null) ? metricsData.totalIncidents.toLocaleString() : '—' },
          { label: 'Exposure Score (0–100)', value: (metricsData.exposureScore != null) ? String(metricsData.exposureScore) : '—' },
          { label: 'Top-5 State Concentration (%)', value: (metricsData.top5ConcentrationPercent != null) ? `${metricsData.top5ConcentrationPercent}%` : '—' },
          { label: 'Active States (%)', value: (metricsData.activeStatesPercent != null) ? `${metricsData.activeStatesPercent}%` : '—' },
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

      // Insights - fetch from context at runtime inside generatePDF
      if (exportOptions.includeInsights) {
        checkPageBreak(45);
        
        // Section header with background
        pdf.setFillColor(...colors.panel);
        pdf.roundedRect(margin, yPosition - 2, contentWidth, 10, 2, 2, 'F');
        
        pdf.setFontSize(16);
        pdf.setTextColor(...colors.accent);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Insights', margin + 3, yPosition + 5);
        yPosition += 16;

        pdf.setFontSize(11);
        pdf.setTextColor(...colors.text);
        pdf.setFont('helvetica', 'normal');
        
        // Highest Rate
        checkPageBreak(7);
        const highestRate = insights?.highestRate || '—';
        pdf.text(`• Highest Rate: ${highestRate}`, margin + 5, yPosition);
        yPosition += 7;
        
        // Lowest Rate(s)
        checkPageBreak(7);
        const lowestRates = Array.isArray(insights?.lowestRates) && insights.lowestRates.length ? insights.lowestRates.join(', ') : (insights?.lowestRate || '—');
        pdf.text(`• Lowest Rate: ${lowestRates}`, margin + 5, yPosition);
        yPosition += 7;
        
        // Top Threat Types - only include if not empty
        const topThreatTypes = Array.isArray(insights?.topThreatTypes) && insights.topThreatTypes.length ? insights.topThreatTypes.join(', ') : null;
        if (topThreatTypes) {
          checkPageBreak(7);
          pdf.text(`• Top Threat Types: ${topThreatTypes}`, margin + 5, yPosition);
          yPosition += 7;
        }
        
        // Notes - only include if not empty
        if (insights?.notes && insights.notes.trim() !== '') {
          checkPageBreak(7);
          pdf.text(`• Notes: ${insights.notes}`, margin + 5, yPosition);
          yPosition += 7;
        }
        
        yPosition += 10;
      }

      // State-Specific Threat Activity (if state selected)
      if (exportOptions.includeHeatmapDetail && selectedState) {
        checkPageBreak(80);
        
        // Fetch state details
        let stateDetails = null;
        if (selectedState.code) {
          try {
            const res = await fetch(`http://127.0.0.1:8000/api/heatmap/state/${selectedState.code}/`);
            if (res.ok) {
              stateDetails = await res.json();
            }
          } catch (err) {
            console.error('Error fetching state details for PDF:', err);
          }
        }

        // Section header with background
        pdf.setFillColor(...colors.panel);
        pdf.roundedRect(margin, yPosition - 2, contentWidth, 10, 2, 2, 'F');
        
        pdf.setFontSize(16);
        pdf.setTextColor(...colors.accent);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`Threat Activity: ${selectedState.name}`, margin + 3, yPosition + 5);
        yPosition += 16;

        if (stateDetails) {
          pdf.setFontSize(11);
          pdf.setTextColor(...colors.text);
          pdf.setFont('helvetica', 'normal');
          
          // Total CVEs
          checkPageBreak(7);
          pdf.text(`Total CVEs: ${stateDetails.total_cves || selectedState.totalCves || '—'}`, margin + 5, yPosition);
          yPosition += 10;
          
          // Top CVEs
          if (stateDetails.top_cves && stateDetails.top_cves.length > 0) {
            checkPageBreak(10);
            pdf.setFont('helvetica', 'bold');
            pdf.text('Top CVEs:', margin + 5, yPosition);
            yPosition += 7;
            
            pdf.setFont('helvetica', 'normal');
            stateDetails.top_cves.slice(0, 5).forEach((cve, idx) => {
              checkPageBreak(6);
              const cveId = cve.cve_id || cve.id || (Array.isArray(cve) ? cve[0] : null) || 'Unknown';
              const occurrences = cve.occurrences || cve.occ || 0;
              const cveText = `${cveId} (${occurrences} reports)`;
              pdf.text(`  • ${cveText}`, margin + 7, yPosition);
              yPosition += 6;
            });
            yPosition += 4;
          }
          
          // Recent exploit reports
          if (stateDetails.exploit_count != null) {
            checkPageBreak(7);
            pdf.text(`Recent exploit reports: ${stateDetails.exploit_count}`, margin + 5, yPosition);
            yPosition += 7;
          }
          
          
        } else {
          pdf.setFontSize(11);
          pdf.setTextColor(...colors.muted);
          pdf.setFont('helvetica', 'italic');
          pdf.text('State details unavailable', margin + 5, yPosition);
          yPosition += 7;
        }
        
        yPosition += 10;
      }

      // Capture and include selected charts - match dashboard order
      const chartConfigs = [
        { id: 'incident-severity', option: 'includeEPSS', title: 'Exploit Probability Score (EPSS)' },
        { id: 'internet-provider', option: 'includeISP', title: 'Internet Provider Rankings' },
        { id: 'vulnerable-tech', option: 'includeCVERankings', title: 'CVE Rankings' },
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
        pdf.text('Threat Analytics', margin + 3, yPosition + 5);
        yPosition += 18;
      }

      // Process all charts using a fixed chart width per image so layout
      // remains consistent regardless of how many charts are selected.
      if (selectedCharts.length > 0) {
        // fixed sizes in mm for PDF placement
        const gap = 5; // Gap between charts in mm
        const fixedChartWidth = 55; // mm per chart
        const fixedChartHeight = 50; // mm per chart image

        // compute how many columns fit in contentWidth
        const columns = Math.max(1, Math.floor((contentWidth + gap) / (fixedChartWidth + gap)));
        const rows = Math.ceil(selectedCharts.length / columns);

        // iterate rows and columns, rendering chart images in a grid
        for (let r = 0; r < rows; r++) {
          // ensure there is enough vertical space for this row (title + chart)
          const rowHeight = 8 + fixedChartHeight + 6; // title box + chart + padding
          checkPageBreak(rowHeight + 6);

          for (let c = 0; c < columns; c++) {
            const idx = r * columns + c;
            if (idx >= selectedCharts.length) break;
            const chart = selectedCharts[idx];

            const xPos = margin + c * (fixedChartWidth + gap);

            // Chart title with background
            pdf.setFillColor(...colors.panel);
            pdf.roundedRect(xPos, yPosition, fixedChartWidth, 8, 1, 1, 'F');
            pdf.setFontSize(9);
            pdf.setTextColor(...colors.text);
            pdf.setFont('helvetica', 'bold');

            // Truncate title if too long for smaller width
            const maxTitleWidth = fixedChartWidth - 4;
            let titleText = chart.title;
            while (pdf.getTextWidth(titleText) > maxTitleWidth && titleText.length > 10) {
              titleText = titleText.substring(0, titleText.length - 1);
            }
            if (titleText !== chart.title) titleText += '...';
            pdf.text(titleText, xPos + 2, yPosition + 5);

            // Capture and insert the image for this chart. Compute desired pixel
            // size from mm dims so exported images have good resolution.
            const pxPerMm = 96 / 25.4; // approximate screen px per mm
            const exportScale = 3; // render at ~3x for crisp images
            const targetPxW = Math.max(120, Math.round(fixedChartWidth * pxPerMm * exportScale));
            const targetPxH = Math.max(120, Math.round(fixedChartHeight * pxPerMm * exportScale));
            const chartImage = await captureChart(chart.id, targetPxW, targetPxH);
            if (chartImage) {
              pdf.addImage(chartImage, 'PNG', xPos, yPosition + 9, fixedChartWidth, fixedChartHeight);
            } else {
              pdf.setFillColor(...colors.panel);
              pdf.roundedRect(xPos, yPosition + 9, fixedChartWidth, fixedChartHeight, 2, 2, 'F');
              pdf.setDrawColor(...colors.border);
              pdf.setLineWidth(0.5);
              pdf.setLineDash([2, 2]);
              pdf.roundedRect(xPos, yPosition + 9, fixedChartWidth, fixedChartHeight, 2, 2, 'D');
              pdf.setLineDash([]);

              pdf.setFontSize(8);
              pdf.setTextColor(...colors.muted);
              pdf.setFont('helvetica', 'italic');
              pdf.text('Chart not available', xPos + (fixedChartWidth / 2), yPosition + (fixedChartHeight / 2), { align: 'center' });
            }
          }

          // move to next row
          yPosition += 8 + fixedChartHeight + 10;
        }
      }

      // Footer on last page
      pdf.setFillColor(56, 189, 248); // Accent color bar
      pdf.rect(0, pageHeight - 12, pageWidth, 12, 'F');
      
      pdf.setFontSize(8);
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'normal');
      pdf.text('© 2025 ThreatLens', pageWidth / 2, pageHeight - 5, { align: 'center' });

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
                  <span>Key Metrics</span>
                </label>

                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={exportOptions.includeInsights}
                    onChange={() => handleCheckboxChange('includeInsights')}
                  />
                  <span>Insights</span>
                </label>

                {selectedState && (
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={exportOptions.includeHeatmapDetail}
                      onChange={() => handleCheckboxChange('includeHeatmapDetail')}
                    />
                    <span>Threat Activity: {selectedState.name}</span>
                  </label>
                )}

                <div style={{ marginTop: '1rem', marginBottom: '0.5rem', fontWeight: '600' }}>
                  Threat Analytics Charts:
                </div>

                <label className="checkbox-label" style={{ marginLeft: '1rem' }}>
                  <input
                    type="checkbox"
                    checked={exportOptions.includeEPSS}
                    onChange={() => handleCheckboxChange('includeEPSS')}
                  />
                  <span>Exploit Probability Score (EPSS)</span>
                </label>

                <label className="checkbox-label" style={{ marginLeft: '1rem' }}>
                  <input
                    type="checkbox"
                    checked={exportOptions.includeISP}
                    onChange={() => handleCheckboxChange('includeISP')}
                  />
                  <span>Internet Provider Rankings</span>
                </label>

                <label className="checkbox-label" style={{ marginLeft: '1rem' }}>
                  <input
                    type="checkbox"
                    checked={exportOptions.includeCVERankings}
                    onChange={() => handleCheckboxChange('includeCVERankings')}
                  />
                  <span>CVE Rankings</span>
                </label>
              </div>
            </div>

            <div className="modal-footer">
              
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
