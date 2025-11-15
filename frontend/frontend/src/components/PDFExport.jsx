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
    includePredictedThreatTypesInfo: false,
    includeKeySignalsInfo: false,
    includeRiskMatrixInfo: false,
    includeCIInfo: false,
    includeConfidenceInfo: false,
    includeSpikeInfo: false,
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
        backgroundColor: null, // keep transparency so it blends with dark PDF background
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
        pdf.text('Executive Summary', margin + 3, yPosition + 5);
        yPosition += 14;

        pdf.setFontSize(11);
        pdf.setTextColor(...colors.text);
        pdf.setFont('helvetica', 'normal');
        
        const summary = `This report provides AI-powered threat intelligence predictions for the next ${forecastData.forecast_horizon_weeks || 4} weeks. The analysis is based on ${forecastData.metadata?.total_cves_analyzed || 100} CVEs and approximately ${forecastData.metadata?.total_events_analyzed || 450} threat events from the United States.`;
        
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
        pdf.text('Threat Forecast Predictions', margin + 3, yPosition + 5);
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
        // Optionally include Forecast Display info modals (Confidence Interval / Spike Risk)
        if (exportOptions.includeCIInfo) {
          yPosition += 4;
          checkPageBreak(30);
          // CI info box
          const ciText = `About the Confidence Interval: The confidence interval shows the model's uncertainty around its predictions. It represents a range where the true value is expected to lie with a given level of confidence. A wider interval means more uncertainty; a narrow interval means the model is more certain.`;
          pdf.setFillColor(...colors.panel);
          pdf.setDrawColor(...colors.accent);
          pdf.setLineWidth(0.5);
          const ciLines = pdf.splitTextToSize(ciText, contentWidth - 6);
          const ciBoxHeight = (ciLines.length * 6) + 8;
          pdf.roundedRect(margin, yPosition - 2, contentWidth, ciBoxHeight, 2, 2, 'FD');
          pdf.setFontSize(9);
          pdf.setTextColor(...colors.muted);
          pdf.setFont('helvetica', 'italic');
          ciLines.forEach((line, idx) => {
            pdf.text(line, margin + 3, yPosition + 3 + (idx * 6));
          });
          yPosition += ciBoxHeight + 6;
        }

        if (exportOptions.includeSpikeInfo) {
          yPosition += 4;
          checkPageBreak(30);
          const spikeText = `About Spike Risk: Spike Risk is the model's estimate of how likely the expected count for a week will be significantly higher than baseline. Use spike risk with confidence intervals and key signals to prioritize investigations.`;
          pdf.setFillColor(...colors.panel);
          pdf.setDrawColor(...colors.accent);
          pdf.setLineWidth(0.5);
          const spikeLines = pdf.splitTextToSize(spikeText, contentWidth - 6);
          const spikeBoxHeight = (spikeLines.length * 6) + 8;
          pdf.roundedRect(margin, yPosition - 2, contentWidth, spikeBoxHeight, 2, 2, 'FD');
          pdf.setFontSize(9);
          pdf.setTextColor(...colors.muted);
          pdf.setFont('helvetica', 'italic');
          spikeLines.forEach((line, idx) => {
            pdf.text(line, margin + 3, yPosition + 3 + (idx * 6));
          });
          yPosition += spikeBoxHeight + 6;
        }

        // Optionally include Confidence modal text
        if (exportOptions.includeConfidenceInfo) {
          yPosition += 4;
          checkPageBreak(30);
          const confText = `About Confidence: The confidence percentage reports how certain the model is about its point prediction for that week. A higher percentage indicates the model assigns more weight to the point estimate, while a lower percentage indicates more uncertainty. Use confidence alongside the confidence interval and key signals to prioritize investigations and automated actions.`;
          pdf.setFillColor(...colors.panel);
          pdf.setDrawColor(...colors.accent);
          pdf.setLineWidth(0.5);
          const confLines = pdf.splitTextToSize(confText, contentWidth - 6);
          const confBoxHeight = (confLines.length * 6) + 8;
          pdf.roundedRect(margin, yPosition - 2, contentWidth, confBoxHeight, 2, 2, 'FD');
          pdf.setFontSize(9);
          pdf.setTextColor(...colors.muted);
          pdf.setFont('helvetica', 'italic');
          confLines.forEach((line, idx) => {
            pdf.text(line, margin + 3, yPosition + 3 + (idx * 6));
          });
          yPosition += confBoxHeight + 6;
        }
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

        const metrics = [
          { label: 'Average Confidence', value: avgConfidence },
          { label: 'Average Spike Probability', value: avgSpike },
          { label: 'CVEs Analyzed', value: forecastData?.total_threats || forecastData?.metadata?.total_cves_analyzed || '—' },
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

      // Capture and include selected charts in 2-column layout
      // Map chart ids used on the Threat Intelligence page to export options and titles
      const chartConfigs = [
        {
          id: 'predicted-donut',
          option: 'includePredictedThreatTypes',
          title: 'Predicted Threat Types',
          infoOption: 'includePredictedThreatTypesInfo',
          infoText: `This chart shows the model's breakdown of predicted threat types for the forecast horizon. It summarizes the most likely categories (for example, ransomware, phishing, exploitation) based on the signals in the input feed.`,
        },
        {
          id: 'key-signals-bar-chart',
          option: 'includeKeySignals',
          title: 'Key Signals',
          infoOption: 'includeKeySignalsInfo',
          infoText: `Key Signals are summarized, human-readable indicators (e.g., recent spikes in exploit attempts, notable CVEs, or trending malware families) that the model used to inform its forecasts.`,
        },
        {
          id: 'risk-matrix',
          option: 'includeRiskMatrix',
          title: 'Risk Matrix — Confidence vs Impact',
          infoOption: 'includeRiskMatrixInfo',
          infoText: `The risk matrix plots each forecasted week by expected impact (x-axis) and model confidence (y-axis). Points in the top-right quadrant represent high-impact, high-confidence items that are strong candidates for prioritization.`,
        },
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
        pdf.text('Charts & Analytics', margin + 3, yPosition + 5);
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

        // Reserve Y offset for content inside left column
        let leftYOffset = yPosition + 9;
        let leftContentHeight = 0;

        // If user requested the chart's info modal content, render it above the image
        if (leftChart.infoOption && exportOptions[leftChart.infoOption]) {
          const infoLines = pdf.splitTextToSize(leftChart.infoText, chartWidth - 6);
          const infoBoxHeight = (infoLines.length * 6) + 8;
          checkPageBreak(infoBoxHeight + 10);
          pdf.setFillColor(...colors.panel);
          pdf.setDrawColor(...colors.accent);
          pdf.setLineWidth(0.5);
          pdf.roundedRect(margin, leftYOffset, chartWidth, infoBoxHeight, 2, 2, 'FD');
          pdf.setFontSize(9);
          pdf.setTextColor(...colors.muted);
          pdf.setFont('helvetica', 'italic');
          infoLines.forEach((line, idx) => {
            pdf.text(line, margin + 3, leftYOffset + 4 + (idx * 6));
          });
          leftYOffset += infoBoxHeight + 4;
          leftContentHeight += infoBoxHeight + 4;
        }

        if (leftImage) {
          pdf.addImage(leftImage, 'PNG', margin, leftYOffset, chartWidth, chartHeight);
          leftContentHeight += chartHeight;
        } else {
          pdf.setFillColor(...colors.panel);
          pdf.roundedRect(margin, leftYOffset, chartWidth, chartHeight, 2, 2, 'F');
          pdf.setDrawColor(...colors.border);
          pdf.setLineWidth(0.5);
          pdf.setLineDash([2, 2]);
          pdf.roundedRect(margin, leftYOffset, chartWidth, chartHeight, 2, 2, 'D');
          pdf.setLineDash([]);

          pdf.setFontSize(9);
          pdf.setTextColor(...colors.muted);
          pdf.setFont('helvetica', 'italic');
          pdf.text('Chart not available', margin + (chartWidth / 2), leftYOffset + (chartHeight / 2), { align: 'center' });
          leftContentHeight += chartHeight;
        }
        
        // Right chart (if exists)
        let rightContentHeight = 0;
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

          // Reserve Y offset for right column
          let rightYOffset = yPosition + 9;

          if (rightChart.infoOption && exportOptions[rightChart.infoOption]) {
            const rInfoLines = pdf.splitTextToSize(rightChart.infoText, chartWidth - 6);
            const rInfoBoxHeight = (rInfoLines.length * 6) + 8;
            checkPageBreak(rInfoBoxHeight + 10);
            pdf.setFillColor(...colors.panel);
            pdf.setDrawColor(...colors.accent);
            pdf.setLineWidth(0.5);
            pdf.roundedRect(rightX, rightYOffset, chartWidth, rInfoBoxHeight, 2, 2, 'FD');
            pdf.setFontSize(9);
            pdf.setTextColor(...colors.muted);
            pdf.setFont('helvetica', 'italic');
            rInfoLines.forEach((line, idx) => {
              pdf.text(line, rightX + 3, rightYOffset + 4 + (idx * 6));
            });
            rightYOffset += rInfoBoxHeight + 4;
            rightContentHeight += rInfoBoxHeight + 4;
          }

          if (rightImage) {
            pdf.addImage(rightImage, 'PNG', rightX, rightYOffset, chartWidth, chartHeight);
            rightContentHeight += chartHeight;
          } else {
            pdf.setFillColor(...colors.panel);
            pdf.roundedRect(rightX, rightYOffset, chartWidth, chartHeight, 2, 2, 'F');
            pdf.setDrawColor(...colors.border);
            pdf.setLineWidth(0.5);
            pdf.setLineDash([2, 2]);
            pdf.roundedRect(rightX, rightYOffset, chartWidth, chartHeight, 2, 2, 'D');
            pdf.setLineDash([]);

            pdf.setFontSize(9);
            pdf.setTextColor(...colors.muted);
            pdf.setFont('helvetica', 'italic');
            pdf.text('Chart not available', rightX + (chartWidth / 2), rightYOffset + (chartHeight / 2), { align: 'center' });
            rightContentHeight += chartHeight;
          }
        }

        // Advance yPosition by the taller column content plus padding
        const columnMax = Math.max(leftContentHeight, rightContentHeight);
        yPosition += columnMax + 20;
      }

      // Footer on last page
      pdf.setFillColor(56, 189, 248); // Accent color bar
      pdf.rect(0, pageHeight - 12, pageWidth, 12, 'F');
      
      pdf.setFontSize(8);
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'normal');
      pdf.text('© 2025 CTI Dashboard — AI-Powered Threat Intelligence', pageWidth / 2, pageHeight - 5, { align: 'center' });

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
                    {/* Match the page/section heading used in the PDF content */}
                    <span>Executive Summary</span>
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

                  {/* Sub-options for Forecast info modals */}
                  <div style={{ marginLeft: '1rem', marginTop: 6 }}>
                    <label className="checkbox-label" style={{ marginLeft: '0.5rem' }}>
                      <input
                        type="checkbox"
                        checked={exportOptions.includeCIInfo}
                        onChange={() => handleCheckboxChange('includeCIInfo')}
                      />
                      <span style={{ fontSize: '0.9rem' }}>Include Confidence Interval info</span>
                    </label>

                    <label className="checkbox-label" style={{ marginLeft: '0.5rem' }}>
                      <input
                        type="checkbox"
                        checked={exportOptions.includeSpikeInfo}
                        onChange={() => handleCheckboxChange('includeSpikeInfo')}
                      />
                      <span style={{ fontSize: '0.9rem' }}>Include Spike Risk info</span>
                    </label>
                    
                    <label className="checkbox-label" style={{ marginLeft: '0.5rem' }}>
                      <input
                        type="checkbox"
                        checked={exportOptions.includeConfidenceInfo}
                        onChange={() => handleCheckboxChange('includeConfidenceInfo')}
                      />
                      <span style={{ fontSize: '0.9rem' }}>Include Confidence info</span>
                    </label>
                  </div>

                  

                  <div style={{ marginTop: '1rem', marginBottom: '0.5rem', fontWeight: '600' }}>
                    {/* Match the charts section heading from the page */}
                    AI-Powered Analytics &amp; Insights
                  </div>

                    <div style={{ marginLeft: '1rem' }}>
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={exportOptions.includePredictedThreatTypes}
                          onChange={() => handleCheckboxChange('includePredictedThreatTypes')}
                        />
                        <span>Predicted Threat Types</span>
                      </label>

                      <label className="checkbox-label" style={{ marginLeft: '1.25rem' }}>
                        <input
                          type="checkbox"
                          checked={exportOptions.includePredictedThreatTypesInfo}
                          onChange={() => handleCheckboxChange('includePredictedThreatTypesInfo')}
                        />
                        <span style={{ fontSize: '0.9rem' }}>Include Predicted Threat Types info</span>
                      </label>
                    </div>

                    <div style={{ marginLeft: '1rem', marginTop: 6 }}>
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={exportOptions.includeKeySignals}
                          onChange={() => handleCheckboxChange('includeKeySignals')}
                        />
                        <span>Key Signals</span>
                      </label>

                      <label className="checkbox-label" style={{ marginLeft: '1.25rem' }}>
                        <input
                          type="checkbox"
                          checked={exportOptions.includeKeySignalsInfo}
                          onChange={() => handleCheckboxChange('includeKeySignalsInfo')}
                        />
                        <span style={{ fontSize: '0.9rem' }}>Include Key Signals info</span>
                      </label>
                    </div>

                    <div style={{ marginLeft: '1rem', marginTop: 6 }}>
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={exportOptions.includeRiskMatrix}
                          onChange={() => handleCheckboxChange('includeRiskMatrix')}
                        />
                        <span>Risk Matrix — Confidence vs Impact</span>
                      </label>

                      <label className="checkbox-label" style={{ marginLeft: '1.25rem' }}>
                        <input
                          type="checkbox"
                          checked={exportOptions.includeRiskMatrixInfo}
                          onChange={() => handleCheckboxChange('includeRiskMatrixInfo')}
                        />
                        <span style={{ fontSize: '0.9rem' }}>Include Risk Matrix info</span>
                      </label>
                    </div>
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
