import React, { useRef, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartOptions,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { LedgerCalculationResult } from '../types';
import { formatDateDisplay, formatCurrency } from '../utils/formatters';

// Register necessary Chart.js modules
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface TrendChartProps {
  ledger: LedgerCalculationResult;
  onCanvasReady?: (canvas: HTMLCanvasElement | null) => void;
}

export const TrendChart: React.FC<TrendChartProps> = ({ ledger, onCanvasReady }) => {
  const chartRef = useRef<ChartJS<'line'>>(null);

  // Pass canvas to parent for PDF export whenever chart renders
  useEffect(() => {
    if (chartRef.current && chartRef.current.canvas) {
      onCanvasReady?.(chartRef.current.canvas);
    } else {
      onCanvasReady?.(null);
    }
  });

  // Sort chronological ascending for visual timeline progression (oldest -> newest)
  const chronologicalRows = [...ledger.displayRows].sort((a, b) => {
    const dateDiff = a.date.localeCompare(b.date);
    if (dateDiff !== 0) return dateDiff;
    return a.createdAt.localeCompare(b.createdAt);
  });

  const labels = chronologicalRows.map((t) => formatDateDisplay(t.date));
  const balances = chronologicalRows.map((t) => t.runningBalance);

  // Fallback if no rows
  const chartLabels = labels.length > 0 ? labels : ['Belum ada transaksi'];
  const chartData = balances.length > 0 ? balances : [ledger.openingBalance || 0];

  const data = {
    labels: chartLabels,
    datasets: [
      {
        label: 'Saldo Kumulatif (Rp)',
        data: chartData,
        borderColor: '#2563eb', // Blue 600
        backgroundColor: (context: { chart: { ctx: CanvasRenderingContext2D } }) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 300);
          gradient.addColorStop(0, 'rgba(37, 99, 235, 0.28)');
          gradient.addColorStop(1, 'rgba(37, 99, 235, 0.01)');
          return gradient;
        },
        fill: true,
        tension: 0.35,
        pointBackgroundColor: '#2563eb',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };

  // Fix 4: animation is explicitly disabled to guarantee instant, reliable canvas snapshot for PDF
  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false, // Critical Fix 4: Prevents blank/corrupted canvas base64
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: '#0f172a',
        titleFont: { size: 12, weight: 'bold' },
        bodyFont: { size: 12 },
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          label: (context) => `Saldo: ${formatCurrency(Number(context.raw) || 0)}`,
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: { size: 11 },
          color: '#94a3b8',
          maxRotation: 45,
          minRotation: 0,
        },
      },
      y: {
        grid: {
          color: 'rgba(226, 232, 240, 0.6)',
        },
        ticks: {
          font: { size: 11 },
          color: '#94a3b8',
          callback: (value) => {
            const num = Number(value);
            if (Math.abs(num) >= 1000000) {
              return `Rp ${(num / 1000000).toFixed(1)} jt`;
            }
            if (Math.abs(num) >= 1000) {
              return `Rp ${(num / 1000).toFixed(0)} rb`;
            }
            return `Rp ${num}`;
          },
        },
      },
    },
  };

  return (
    <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200">
            Grafik Tren Saldo Kumulatif
          </h3>
          <p className="text-xs text-slate-400 dark:text-zinc-400">
            Perkembangan saldo kas dari waktu ke waktu berdasarkan transaksi
          </p>
        </div>
        <div className="flex items-center space-x-2 text-xs font-semibold px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
          <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
          <span>Live Calculation</span>
        </div>
      </div>

      <div className="h-64 w-full relative">
        <Line ref={chartRef} data={data} options={options} />
      </div>
    </div>
  );
};
