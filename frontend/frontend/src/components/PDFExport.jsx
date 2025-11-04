import React, { useState } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const PDFExport = ({ forecastData }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [exportOptions, setExportOptions] = useState({
    includeText: true,
    includeForecastTable: true,
    includeLossBySector: false,
    includeThreatSeverity: false,
    includeTopCVEs: false,
    includeThreatTrends: false,
    includeGeographic: false,
    includeMetrics: true,
  });

  const handleCheckboxChange = (option) => {
    setExportOptions(prev => ({
      ...prev,
      [option]: !prev[option]
    }));
  };

  const captureChart = async (elementId) => {
    const element = document.querySelector(`[data-chart-id="${elementId}"]`);
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
      // Validate we have data to export
      if (!forecastData && (exportOptions.includeText || exportOptions.includeForecastTable)) {
        alert('No forecast data available. Please generate a forecast first.');
        setIsExporting(false);
        return;
      }

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
      pdf.setTextColor(37, 99, 235); // Primary blue
      pdf.text('Threat Intelligence Report', margin, yPosition);
      yPosition += 10;

      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Generated: ${new Date().toLocaleString()}`, margin, yPosition);
      yPosition += 15;

      // Include Text Content
      if (exportOptions.includeText && forecastData) {
        checkPageBreak(30);
        
        pdf.setFontSize(14);
        pdf.setTextColor(0, 0, 0);
        pdf.text('Executive Summary', margin, yPosition);
        yPosition += 8;

        pdf.setFontSize(10);
        pdf.setTextColor(60, 60, 60);
        
        const summary = `This report provides AI-powered threat intelligence predictions for the next ${forecastData.forecast_horizon_weeks || 4} weeks. The analysis is based on ${forecastData.metadata?.total_cves_analyzed || 100} CVEs and approximately ${forecastData.metadata?.total_events_analyzed || 450} threat events.`;
        
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
      }

      // Include Forecast Predictions Table
      if (exportOptions.includeForecastTable && forecastData?.predictions) {
        checkPageBreak(40);
        
        pdf.setFontSize(14);
        pdf.setTextColor(0, 0, 0);
        pdf.text('Threat Forecast Predictions', margin, yPosition);
        yPosition += 8;

        // Group predictions by country
        const countryCodes = [...new Set(forecastData.predictions.map(p => p.country_code))];
        
        countryCodes.forEach((countryCode, countryIndex) => {
          const countryPredictions = forecastData.predictions.filter(p => p.country_code === countryCode);
          const countryName = countryPredictions[0]?.country_name || countryCode || 'Unknown';

          if (countryIndex > 0) {
            checkPageBreak(50);
          } else {
            checkPageBreak(40);
          }

          pdf.setFontSize(12);
          pdf.setTextColor(37, 99, 235);
          if (countryName && typeof countryName === 'string') {
            pdf.text(countryName, margin, yPosition);
          }
          yPosition += 7;

          // Table with borders
          const colWidths = [30, 25, 25, 25, 25];
          const headers = ['Week Start', 'Expected', 'CI Range', 'Spike Risk', 'Confidence'];
          const tableStartY = yPosition;
          let xPos = margin;
          
          // Draw table header background
          pdf.setFillColor(240, 240, 240);
          pdf.rect(margin, yPosition - 4, contentWidth, 6, 'F');
          
          // Draw header borders
          pdf.setDrawColor(150, 150, 150);
          pdf.setLineWidth(0.3);
          
          // Header text
          pdf.setFontSize(9);
          pdf.setTextColor(0, 0, 0);
          pdf.setFont(undefined, 'bold');
          
          headers.forEach((header, i) => {
            // Vertical lines
            pdf.line(xPos, yPosition - 4, xPos, yPosition + 2);
            if (header && typeof header === 'string') {
              pdf.text(header, xPos + 2, yPosition);
            }
            xPos += colWidths[i];
          });
          // Last vertical line
          pdf.line(xPos, yPosition - 4, xPos, yPosition + 2);
          
          // Horizontal lines for header
          pdf.line(margin, yPosition - 4, margin + contentWidth, yPosition - 4);
          pdf.line(margin, yPosition + 2, margin + contentWidth, yPosition + 2);
          
          yPosition += 6;

          // Table rows with borders
          pdf.setFont(undefined, 'normal');
          countryPredictions.forEach((pred, idx) => {
            checkPageBreak(7);
            
            xPos = margin;
            const rowData = [
              pred.week_start ? new Date(pred.week_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A',
              pred.expected_count != null ? pred.expected_count.toString() : 'N/A',
              pred.expected_count_ci ? `${pred.expected_count_ci[0]}-${pred.expected_count_ci[1]}` : 'N/A',
              pred.spike_probability != null ? `${(pred.spike_probability * 100).toFixed(0)}%` : 'N/A',
              pred.confidence != null ? `${(pred.confidence * 100).toFixed(0)}%` : 'N/A'
            ];

            // Draw row borders
            rowData.forEach((data, i) => {
              // Vertical line
              pdf.line(xPos, yPosition - 4, xPos, yPosition + 2);
              if (data && typeof data === 'string') {
                pdf.text(data, xPos + 2, yPosition);
              }
              xPos += colWidths[i];
            });
            // Last vertical line
            pdf.line(xPos, yPosition - 4, xPos, yPosition + 2);
            // Horizontal line
            pdf.line(margin, yPosition + 2, margin + contentWidth, yPosition + 2);
            
            yPosition += 6;
          });

          // Add explanation if available
          if (countryPredictions[0]?.explanation && typeof countryPredictions[0].explanation === 'string') {
            yPosition += 3;
            checkPageBreak(20);
            
            pdf.setFontSize(8);
            pdf.setTextColor(60, 60, 60);
            const explanation = `Analysis: ${countryPredictions[0].explanation}`;
            const expLines = pdf.splitTextToSize(explanation, contentWidth);
            if (Array.isArray(expLines)) {
              expLines.forEach(line => {
                if (line && typeof line === 'string') {
                  checkPageBreak(5);
                  pdf.text(line, margin, yPosition);
                  yPosition += 5;
                }
              });
            }
          }

          yPosition += 8;
        });
      }

      // Include Metrics
      if (exportOptions.includeMetrics) {
        checkPageBreak(40);
        
        pdf.setFontSize(14);
        pdf.setTextColor(0, 0, 0);
        pdf.text('Performance Metrics', margin, yPosition);
        yPosition += 10;

        pdf.setFontSize(10);
        const metrics = [
          ['CVEs Analyzed:', forecastData?.metadata?.total_cves_analyzed || '100'],
          ['Threat Events:', forecastData?.metadata?.total_events_analyzed || '~450'],
          ['Forecast Horizon:', `${forecastData?.forecast_horizon_weeks || 4} weeks`],
          ['Analysis Scope:', 'Worldwide'],
        ];

        metrics.forEach(([label, value]) => {
          checkPageBreak(7);
          pdf.setFont(undefined, 'bold');
          if (label && typeof label === 'string') {
            pdf.text(label, margin, yPosition);
          }
          pdf.setFont(undefined, 'normal');
          if (value && typeof value === 'string') {
            pdf.text(value, margin + 50, yPosition);
          }
          yPosition += 7;
        });
        yPosition += 10;
      }

      // Capture and include selected charts in 2-column layout
      const chartConfigs = [
        { id: 'loss-by-sector', option: 'includeLossBySector', title: 'Loss by Sector' },
        { id: 'threat-severity', option: 'includeThreatSeverity', title: 'Predicted Threat Severity' },
        { id: 'top-cves', option: 'includeTopCVEs', title: 'Top Predicted CVE Threats' },
        { id: 'threat-trends', option: 'includeThreatTrends', title: 'Threat Trend Predictions' },
        { id: 'geographic', option: 'includeGeographic', title: 'Geographic Threat Forecast' },
      ];

      const selectedCharts = chartConfigs.filter(chart => exportOptions[chart.option]);
      
      if (selectedCharts.length > 0) {
        checkPageBreak(40);
        pdf.setFontSize(16);
        pdf.setTextColor(0, 0, 0);
        pdf.text('Charts & Analytics', margin, yPosition);
        yPosition += 12;
      }

      // Process charts in pairs for 2-column layout
      for (let i = 0; i < selectedCharts.length; i += 2) {
        const leftChart = selectedCharts[i];
        const rightChart = selectedCharts[i + 1];
        
        checkPageBreak(90);
        
        const chartWidth = (contentWidth - 10) / 2; // 10mm gap between charts
        const chartHeight = 70; // Fixed height for consistency
        
        // Left chart
        const leftImage = await captureChart(leftChart.id);
        pdf.setFontSize(11);
        pdf.setTextColor(0, 0, 0);
        pdf.text(leftChart.title, margin, yPosition);
        
        if (leftImage) {
          pdf.addImage(leftImage, 'PNG', margin, yPosition + 3, chartWidth, chartHeight);
        } else {
          pdf.setFontSize(9);
          pdf.setTextColor(150, 150, 150);
          pdf.text('Chart not available', margin + 5, yPosition + 35);
        }
        
        // Right chart (if exists)
        if (rightChart) {
          const rightImage = await captureChart(rightChart.id);
          pdf.setFontSize(11);
          pdf.setTextColor(0, 0, 0);
          pdf.text(rightChart.title, margin + chartWidth + 10, yPosition);
          
          if (rightImage) {
            pdf.addImage(rightImage, 'PNG', margin + chartWidth + 10, yPosition + 3, chartWidth, chartHeight);
          } else {
            pdf.setFontSize(9);
            pdf.setTextColor(150, 150, 150);
            pdf.text('Chart not available', margin + chartWidth + 15, yPosition + 35);
          }
        }
        
        yPosition += chartHeight + 15;
      }

      // Footer on last page
      pdf.setFontSize(8);
      pdf.setTextColor(150, 150, 150);
      pdf.text('© 2025 CTI Dashboard — AI-Powered Threat Intelligence', margin, pageHeight - 10);

      // Save the PDF
      const filename = `threat-intelligence-report-${new Date().toISOString().split('T')[0]}.pdf`;
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
        className="button" 
        type="button"
        onClick={() => setShowModal(true)}
        disabled={isExporting}
      >
        {isExporting ? 'Generating PDF...' : 'Export Predictions'}
      </button>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Export to PDF</h2>
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
                  <span>Executive Summary & Text Content</span>
                </label>

                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={exportOptions.includeForecastTable}
                    onChange={() => handleCheckboxChange('includeForecastTable')}
                  />
                  <span>Forecast Predictions Table</span>
                </label>

                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={exportOptions.includeMetrics}
                    onChange={() => handleCheckboxChange('includeMetrics')}
                  />
                  <span>Performance Metrics</span>
                </label>

                <div style={{ marginTop: '1rem', marginBottom: '0.5rem', fontWeight: '600' }}>
                  Charts & Graphs:
                </div>

                <label className="checkbox-label" style={{ marginLeft: '1rem' }}>
                  <input
                    type="checkbox"
                    checked={exportOptions.includeLossBySector}
                    onChange={() => handleCheckboxChange('includeLossBySector')}
                  />
                  <span>Loss by Sector Chart</span>
                </label>

                <label className="checkbox-label" style={{ marginLeft: '1rem' }}>
                  <input
                    type="checkbox"
                    checked={exportOptions.includeThreatSeverity}
                    onChange={() => handleCheckboxChange('includeThreatSeverity')}
                  />
                  <span>Predicted Threat Severity</span>
                </label>

                <label className="checkbox-label" style={{ marginLeft: '1rem' }}>
                  <input
                    type="checkbox"
                    checked={exportOptions.includeTopCVEs}
                    onChange={() => handleCheckboxChange('includeTopCVEs')}
                  />
                  <span>Top Predicted CVE Threats</span>
                </label>

                <label className="checkbox-label" style={{ marginLeft: '1rem' }}>
                  <input
                    type="checkbox"
                    checked={exportOptions.includeThreatTrends}
                    onChange={() => handleCheckboxChange('includeThreatTrends')}
                  />
                  <span>Threat Trend Predictions</span>
                </label>

                <label className="checkbox-label" style={{ marginLeft: '1rem' }}>
                  <input
                    type="checkbox"
                    checked={exportOptions.includeGeographic}
                    onChange={() => handleCheckboxChange('includeGeographic')}
                  />
                  <span>Geographic Threat Forecast</span>
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

export default PDFExport;
