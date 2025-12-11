import React, { useState } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const PDFExport = ({ forecastData }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [exportOptions, setExportOptions] = useState({
    includeText: true,
    includeForecastTable: true,
    includePredictedThreatTypes: true,
    includeKeySignals: true,
    includeRiskMatrix: true,
    includeMetrics: true,
  });

  const handleCheckboxChange = (option) => {
    setExportOptions(prev => ({
      ...prev,
      [option]: !prev[option]
    }));
  };

  // captureChart accepts optional target pixel dimensions so we can render
  // higher-resolution images for PDF insertion when needed.
  const captureChart = async (elementId, targetPxWidth = 800, targetPxHeight = 600) => {
    const element = document.querySelector(`[data-chart-id="${elementId}"]`);
    if (!element) {
      console.warn(`Chart element ${elementId} not found`);
      return null;
    }

    try {
      // Temporarily enforce explicit pixel dimensions for a reliable capture
      const origStyle = {
        width: element.style.width,
        height: element.style.height,
        opacity: element.style.opacity,
        transform: element.style.transform,
        pointerEvents: element.style.pointerEvents,
      };

      try {
        if (targetPxWidth) element.style.width = `${targetPxWidth}px`;
        if (targetPxHeight) element.style.height = `${targetPxHeight}px`;
        element.style.opacity = '1';
        element.style.pointerEvents = 'none';
        element.style.transform = 'none';

        const canvas = await html2canvas(element, {
          scale: 1,
          backgroundColor: null,
          logging: false,
          useCORS: true,
        });

        return canvas.toDataURL('image/png');
      } finally {
        try {
          element.style.width = origStyle.width || '';
          element.style.height = origStyle.height || '';
          element.style.opacity = origStyle.opacity || '';
          element.style.transform = origStyle.transform || '';
          element.style.pointerEvents = origStyle.pointerEvents || '';
        } catch (e) {}
      }
    } catch (error) {
      console.error(`Error capturing chart ${elementId}:`, error);
      return null;
    }
  };

  const generatePDF = async () => {
    setIsExporting(true);
    
    try {
      // Validate we have data to export
      if (!forecastData && (exportOptions.includeText || exportOptions.includeForecastTable)) {
        alert('No forecast data available. Please generate a forecast first.');
        setIsExporting(false);
        return;
      }

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - (2 * margin);
      let yPosition = margin;
      
      
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
      pdf.text('Threat Intelligence Report', margin, yPosition + 5);
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

      // Include Text Content
      if (exportOptions.includeText && forecastData) {
        checkPageBreak(35);
        
        // Section header with background
        pdf.setFillColor(...colors.panel);
        pdf.roundedRect(margin, yPosition - 2, contentWidth, 10, 2, 2, 'F');
        
        pdf.setFontSize(16);
        pdf.setTextColor(...colors.accent);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Forecast Overview', margin + 3, yPosition + 5);
        yPosition += 14;

        pdf.setFontSize(11);
        pdf.setTextColor(...colors.text);
        pdf.setFont('helvetica', 'normal');
        
        const summary = `This report provides AI-powered threat intelligence predictions for the next ${forecastData.forecast_horizon_weeks || 4} weeks. The analysis is based on ${forecastData.total_threats || forecastData.metadata?.total_cves_analyzed || 100} CVEs and leverages OpenAI GPT-5 to analyze vulnerability data and predict emerging threat patterns across the United States.`;
        
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
      }

      // Include Forecast Predictions Table
      if (exportOptions.includeForecastTable && forecastData?.predictions) {
        checkPageBreak(45);
        
        // Section header with background
        pdf.setFillColor(...colors.panel);
        pdf.roundedRect(margin, yPosition - 2, contentWidth, 10, 2, 2, 'F');
        
        pdf.setFontSize(16);
        pdf.setTextColor(...colors.accent);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Threat Forecast', margin + 3, yPosition + 5);
        yPosition += 16;

        // Group predictions by country
        const countryCodes = [...new Set(forecastData.predictions.map(p => p.country_code))];
        
        countryCodes.forEach((countryCode, countryIndex) => {
          const countryPredictions = forecastData.predictions.filter(p => p.country_code === countryCode);
          

          if (countryIndex > 0) {
            checkPageBreak(55);
          } else {
            checkPageBreak(45);
          }

          // Country name with subtle background
          pdf.setFillColor(...colors.panel);
          pdf.roundedRect(margin, yPosition - 3, contentWidth, 9, 2, 2, 'F');
          
          

          // Table with modern styling
          const colWidths = [30, 25, 25, 25, 25];
          const headers = ['Week Start', 'Expected', 'CI Range', 'Spike Risk', 'Confidence'];
          let xPos = margin;
          
          // Draw table header background with gradient effect
          pdf.setFillColor(31, 41, 55); // Darker panel for header
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

          // Table rows with modern styling
          pdf.setFont('helvetica', 'normal');
          countryPredictions.forEach((pred, idx) => {
            checkPageBreak(9);
            
            // Alternating row backgrounds for readability
            if (idx % 2 === 0) {
              pdf.setFillColor(17, 24, 39); // panel color
              pdf.rect(margin, yPosition - 4, contentWidth, 7, 'F');
            }
            
            xPos = margin;
            const rowData = [
              pred.week_start ? new Date(pred.week_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A',
              pred.expected_count != null ? pred.expected_count.toString() : 'N/A',
              pred.expected_count_ci ? `${pred.expected_count_ci[0]}-${pred.expected_count_ci[1]}` : 'N/A',
              pred.spike_probability != null ? `${(pred.spike_probability * 100).toFixed(0)}%` : 'N/A',
              pred.confidence != null ? `${(pred.confidence * 100).toFixed(0)}%` : 'N/A'
            ];

            // Color-code spike probability
            pdf.setFontSize(9);
            rowData.forEach((data, i) => {
              if (i === 3 && pred.spike_probability != null) {
                // Color spike probability based on risk
                if (pred.spike_probability >= 0.7) {
                  pdf.setTextColor(...colors.danger);
                } else if (pred.spike_probability >= 0.4) {
                  pdf.setTextColor(...colors.warn);
                } else {
                  pdf.setTextColor(...colors.accent2);
                }
              } else {
                pdf.setTextColor(...colors.text);
              }
              
              if (data && typeof data === 'string') {
                pdf.text(data, xPos + 2, yPosition + 1);
              }
              xPos += colWidths[i];
            });
            
            // Subtle row separator
            pdf.setDrawColor(...colors.border);
            pdf.setLineWidth(0.1);
            pdf.line(margin, yPosition + 3, margin + contentWidth, yPosition + 3);
            
            yPosition += 7;
          });

          // Add explanation if available
          if (countryPredictions[0]?.explanation && typeof countryPredictions[0].explanation === 'string') {
            yPosition += 4;
            checkPageBreak(22);
            
            // Explanation box with accent border
            pdf.setDrawColor(...colors.accent);
            pdf.setLineWidth(0.5);
            pdf.setFillColor(...colors.panel);
            pdf.roundedRect(margin, yPosition - 2, contentWidth, 0, 2, 2, 'FD');
            
            pdf.setFontSize(9);
            pdf.setTextColor(...colors.muted);
            pdf.setFont('helvetica', 'italic');
            const explanation = `Analysis: ${countryPredictions[0].explanation}`;
            const expLines = pdf.splitTextToSize(explanation, contentWidth - 6);
            if (Array.isArray(expLines)) {
              expLines.forEach((line, lineIdx) => {
                if (line && typeof line === 'string') {
                  checkPageBreak(6);
                  pdf.text(line, margin + 3, yPosition + 3 + (lineIdx * 6));
                }
              });
              yPosition += (expLines.length * 6) + 6;
            }
          }

          yPosition += 8;
        });
      }

        // Include Forecast Accuracy & Performance metrics (show the same KPIs displayed on the page)
      if (exportOptions.includeMetrics) {
        checkPageBreak(50);

        // Section header with background
        pdf.setFillColor(...colors.panel);
        pdf.roundedRect(margin, yPosition - 2, contentWidth, 10, 2, 2, 'F');

        pdf.setFontSize(16);
        pdf.setTextColor(...colors.accent);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Forecast Accuracy & Performance', margin + 3, yPosition + 5);
        yPosition += 16;

        // KPIs in cards (Average Confidence, Average Spike Probability, CVEs Analyzed, Monthly Predicted Attacks)
        const avgConfidence = forecastData?.predictions && forecastData.predictions.length > 0
          ? `${Math.round((forecastData.predictions.reduce((sum, p) => sum + (p.confidence || 0), 0) / forecastData.predictions.length) * 100)}%`
          : '—';

        const avgSpike = forecastData?.predictions && forecastData.predictions.length > 0
          ? `${Math.round((forecastData.predictions.reduce((sum, p) => sum + (p.spike_probability || 0), 0) / forecastData.predictions.length) * 100)}%`
          : '—';

        const cvesAnalyzed = forecastData?.total_threats || forecastData?.metadata?.total_cves_analyzed;
        
        const metrics = [
          { label: 'Average Confidence', value: avgConfidence },
          { label: 'Average Spike Probability', value: avgSpike },
          { label: 'CVEs Analyzed', value: cvesAnalyzed != null ? String(cvesAnalyzed) : '—' },
          { label: 'Monthly Predicted Attacks', value: typeof forecastData?.monthly_predicted_attacks === 'number' ? forecastData.monthly_predicted_attacks.toLocaleString() : '—' },
        ];

        metrics.forEach((metric, idx) => {
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

      // Capture and include selected charts - match AI page order exactly
      const chartConfigs = [
        { id: 'predicted-donut', option: 'includePredictedThreatTypes', title: 'Predicted Threat Types' },
        { id: 'key-signals-bar-chart', option: 'includeKeySignals', title: 'Key Signals' },
        { id: 'risk-matrix', option: 'includeRiskMatrix', title: 'Confidence vs Impact' },
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
        pdf.text('AI-Powered Analytics & Insights', margin + 3, yPosition + 5);
        yPosition += 18;
      }

      // Process charts using a fixed-width grid so each chart gets the same
      // visual size in the PDF regardless of how many are selected.
      if (selectedCharts.length > 0) {
        const gap = 5; // mm between chart cells
        const fixedChartWidth = 55; // mm per chart cell width
        const fixedChartHeight = 65; // mm per chart cell height

        // compute columns that fit in the content width
        const columns = Math.max(1, Math.floor((contentWidth + gap) / (fixedChartWidth + gap)));
        const rows = Math.ceil(selectedCharts.length / columns);

        // render row by row
        for (let r = 0; r < rows; r++) {
          checkPageBreak(fixedChartHeight + 16);

          for (let c = 0; c < columns; c++) {
            const idx = r * columns + c;
            if (idx >= selectedCharts.length) break;
            const chart = selectedCharts[idx];

            const xPos = margin + c * (fixedChartWidth + gap);

            // Chart title
            pdf.setFillColor(...colors.panel);
            pdf.roundedRect(xPos, yPosition, fixedChartWidth, 8, 1, 1, 'F');
            pdf.setFontSize(9);
            pdf.setTextColor(...colors.text);
            pdf.setFont('helvetica', 'bold');

            // Truncate title if necessary
            const maxTitleWidth = fixedChartWidth - 4;
            let titleText = chart.title;
            while (pdf.getTextWidth(titleText) > maxTitleWidth && titleText.length > 10) {
              titleText = titleText.slice(0, -1);
            }
            if (titleText !== chart.title) titleText += '...';
            pdf.text(titleText, xPos + 2, yPosition + 5);

            // Compute target pixel size for capture from mm -> px
            const pxPerMm = 96 / 25.4; // approximate screen px per mm
            const exportScale = 3; // render at ~3x for crispness
            const targetPxW = Math.max(120, Math.round(fixedChartWidth * pxPerMm * exportScale));
            const targetPxH = Math.max(120, Math.round(fixedChartHeight * pxPerMm * exportScale));

            const chartImage = await captureChart(chart.id, targetPxW, targetPxH);

            if (chartImage) {
              pdf.addImage(chartImage, 'PNG', xPos, yPosition + 9, fixedChartWidth, fixedChartHeight - 9);
            } else {
              pdf.setFillColor(30, 30, 30);
              pdf.roundedRect(xPos, yPosition + 9, fixedChartWidth, fixedChartHeight - 9, 2, 2, 'F');
              pdf.setFontSize(9);
              pdf.setTextColor(...colors.muted);
              pdf.setFont('helvetica', 'italic');
              pdf.text('Chart unavailable', xPos + fixedChartWidth / 2, yPosition + fixedChartHeight / 2, { align: 'center' });
            }
          }

          yPosition += fixedChartHeight + 12;
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
      const filename = `ai-forecast-report-${new Date().toISOString().split('T')[0]}.pdf`;
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
              <h2>Export Forecast Report</h2>
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
                      checked={exportOptions.includeText}
                      onChange={() => handleCheckboxChange('includeText')}
                    />
                    {/* Match the page/section heading used in the PDF content */}
                    <span>Forecast Overview</span>
                  </label>

                  
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={exportOptions.includeMetrics}
                      onChange={() => handleCheckboxChange('includeMetrics')}
                    />
                    {/* Match the page KPI section title */}
                    <span>Forecast Accuracy & Performance</span>
                  </label>
                  <label className="checkbox-label">
                    
                    
                    <input
                      type="checkbox"
                      checked={exportOptions.includeForecastTable}
                      onChange={() => handleCheckboxChange('includeForecastTable')}
                    />
                    {/* Match the Threat Forecast section title on the page */}
                    <span>Threat Forecast</span>
                  </label>

                  <div style={{ marginTop: '1rem', marginBottom: '0.5rem', fontWeight: '600' }}>
                    AI-Powered Analytics & Insights:
                  </div>

                  <label className="checkbox-label" style={{ marginLeft: '1rem' }}>
                    <input
                      type="checkbox"
                      checked={exportOptions.includePredictedThreatTypes}
                      onChange={() => handleCheckboxChange('includePredictedThreatTypes')}
                    />
                    <span>Predicted Threat Types</span>
                  </label>

                  <label className="checkbox-label" style={{ marginLeft: '1rem' }}>
                    <input
                      type="checkbox"
                      checked={exportOptions.includeKeySignals}
                      onChange={() => handleCheckboxChange('includeKeySignals')}
                    />
                    <span>Key Signals</span>
                  </label>

                  <label className="checkbox-label" style={{ marginLeft: '1rem' }}>
                    <input
                      type="checkbox"
                      checked={exportOptions.includeRiskMatrix}
                      onChange={() => handleCheckboxChange('includeRiskMatrix')}
                    />
                    <span>Confidence vs Impact</span>
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

export default PDFExport;
