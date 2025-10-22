import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const LossBySectorBarChart = () => {
  // Sample data for loss by sector
  const data = {
    labels: [
      'Finance & Insurance',
      'Healthcare',
      'Education',
      'Retail & E-Commerce',
      'Manufacturing',
      'Energy & Utilities',
      'Technology & SaaS',
      'Transportation & Logistics'
    ],
    datasets: [
      {
        label: 'Average Loss ($M)',
        data: [4.2, 3.8, 1.2, 2.9, 2.1, 3.5, 2.8, 1.9],
        backgroundColor: [
          '#ef4444', // Finance - Red (highest risk)
          '#f59e0b', // Healthcare - Orange
          '#22c55e', // Education - Green
          '#ef4444', // Retail - Red
          '#f59e0b', // Manufacturing - Orange
          '#ef4444', // Energy - Red
          '#38bdf8', // Technology - Blue
          '#22c55e', // Transportation - Green
        ],
        borderColor: [
          '#dc2626',
          '#d97706',
          '#16a34a',
          '#dc2626',
          '#d97706',
          '#dc2626',
          '#0284c7',
          '#16a34a',
        ],
        borderWidth: 1,
        borderRadius: 4,
        borderSkipped: false,
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false, // Hide legend since we're using colors to indicate risk
      },
      title: {
        display: false,
      },
      tooltip: {
        backgroundColor: '#111827',
        titleColor: '#e5e7eb',
        bodyColor: '#e5e7eb',
        borderColor: '#1f2937',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          label: function(context) {
            return `Average Loss: $${context.parsed.y}M`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: '#94a3b8',
          font: {
            size: 10
          },
          maxRotation: 45,
          minRotation: 0
        },
        border: {
          display: false
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: '#1f2937',
          drawBorder: false,
        },
        ticks: {
          color: '#94a3b8',
          font: {
            size: 10
          },
          callback: function(value) {
            return '$' + value + 'M';
          }
        },
        border: {
          display: false
        }
      }
    },
    interaction: {
      intersect: false,
      mode: 'index'
    }
  };

  return (
    <>
      <div className="chart-header">
        <h3 className="chart-title">Loss by Sector</h3>
      </div>
      <div className="chart-content">
        <div className="chart-container" style={{ height: '280px', width: '100%' }}>
          <Bar data={data} options={options} />
        </div>
      </div>
    </>
  );
};

export default LossBySectorBarChart;



