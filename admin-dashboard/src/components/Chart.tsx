/**
 * P6-13: Chart.js 래퍼 — Line/Bar 차트 컴포넌트
 */
import React from 'react';
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
  type ChartData,
  type ChartOptions,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

// Chart.js 컴포넌트 등록
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

// ─── 공통 다크 테마 옵션 ────────────────────────────────────────

const DARK_THEME_OPTIONS: ChartOptions<'line'> & ChartOptions<'bar'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: { color: '#9CA3AF' }, // gray-400
    },
    tooltip: {
      backgroundColor: '#1F2937', // gray-800
      titleColor: '#F3F4F6',
      bodyColor: '#D1D5DB',
      borderColor: '#374151',
      borderWidth: 1,
    },
  },
  scales: {
    x: {
      ticks: { color: '#6B7280' },
      grid: { color: '#374151' },
    },
    y: {
      ticks: { color: '#6B7280' },
      grid: { color: '#374151' },
    },
  },
};

// ─── Line Chart ─────────────────────────────────────────────────

export interface LineChartProps {
  title?: string;
  data: ChartData<'line'>;
  height?: number;
  options?: ChartOptions<'line'>;
}

export const LineChart: React.FC<LineChartProps> = ({
  title,
  data,
  height = 300,
  options = {},
}) => {
  const mergedOptions: ChartOptions<'line'> = {
    ...DARK_THEME_OPTIONS,
    ...options,
    plugins: {
      ...DARK_THEME_OPTIONS.plugins,
      ...options.plugins,
      title: title ? { display: true, text: title, color: '#F3F4F6' } : undefined,
    },
  };

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-4" style={{ height }}>
      <Line data={data} options={mergedOptions} />
    </div>
  );
};

// ─── Bar Chart ──────────────────────────────────────────────────

export interface BarChartProps {
  title?: string;
  data: ChartData<'bar'>;
  height?: number;
  options?: ChartOptions<'bar'>;
}

export const BarChart: React.FC<BarChartProps> = ({
  title,
  data,
  height = 300,
  options = {},
}) => {
  const mergedOptions: ChartOptions<'bar'> = {
    ...DARK_THEME_OPTIONS,
    ...options,
    plugins: {
      ...DARK_THEME_OPTIONS.plugins,
      ...options.plugins,
      title: title ? { display: true, text: title, color: '#F3F4F6' } : undefined,
    },
  };

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-4" style={{ height }}>
      <Bar data={data} options={mergedOptions} />
    </div>
  );
};
