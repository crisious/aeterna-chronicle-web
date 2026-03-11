/**
 * P6-13: 경제 지표 페이지 — 인플레이션 지표, 화폐 유통량
 */
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { StatCard } from '../components/StatCard';
import { LineChart, BarChart } from '../components/Chart';
import { API_BASE } from '../App';

interface EconomyMetrics {
  inflation: {
    totalCirculating: number;
    totalSunk: number;
    index: number;
  };
  totalGold: number;
  totalDiamond: number;
}

interface KpiSnapshot {
  date: string;
  metric: string;
  value: number;
}

export const EconomyPage: React.FC = () => {
  const [metrics, setMetrics] = useState<EconomyMetrics | null>(null);
  const [revenueData, setRevenueData] = useState<KpiSnapshot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [economyRes, revenueRes] = await Promise.all([
          axios.get(`${API_BASE}/analytics/economy`, { headers: authHeaders() }),
          axios.get(`${API_BASE}/analytics/revenue`, {
            params: { startDate: ninetyDaysAgo(), endDate: today() },
            headers: authHeaders(),
          }),
        ]);
        setMetrics(economyRes.data);
        setRevenueData(revenueRes.data.series || []);
      } catch {
        // API 미연결
      } finally {
        setLoading(false);
      }
    };
    void fetchData();
  }, []);

  if (loading) {
    return <div className="text-gray-500 text-center py-20">로딩 중...</div>;
  }

  // 인플레이션 지수 색상
  const inflationIndex = metrics?.inflation.index ?? 0;
  const inflationColor = inflationIndex > 2 ? 'text-red-400'
    : inflationIndex > 1.5 ? 'text-yellow-400'
    : 'text-green-400';

  // 매출 차트
  const revenueChartData = {
    labels: revenueData.map(s => new Date(s.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })),
    datasets: [{
      label: '일일 매출 (₩)',
      data: revenueData.map(s => s.value),
      backgroundColor: 'rgba(245, 158, 11, 0.6)',
      borderColor: '#F59E0B',
      borderWidth: 1,
    }],
  };

  // 화폐 유통량 차트
  const currencyChartData = {
    labels: ['골드 유통량', '골드 소모량 (30일)', '다이아 보유량'],
    datasets: [{
      label: '화폐량',
      data: [
        metrics?.totalGold ?? 0,
        metrics?.inflation.totalSunk ?? 0,
        metrics?.totalDiamond ?? 0,
      ],
      backgroundColor: [
        'rgba(234, 179, 8, 0.6)',   // 골드
        'rgba(239, 68, 68, 0.6)',    // 소모
        'rgba(59, 130, 246, 0.6)',   // 다이아
      ],
      borderColor: ['#EAB308', '#EF4444', '#3B82F6'],
      borderWidth: 1,
    }],
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white">💰 경제 지표</h2>

      {/* KPI 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="인플레이션 지수"
          value={inflationIndex === Infinity ? '∞' : inflationIndex.toFixed(2)}
          icon="📊"
          color={inflationIndex > 1.5 ? 'bg-red-900/30' : 'bg-gray-800'}
        />
        <StatCard
          title="골드 유통량"
          value={metrics?.totalGold ?? 0}
          unit="G"
          icon="🪙"
        />
        <StatCard
          title="골드 소모량 (30일)"
          value={metrics?.inflation.totalSunk ?? 0}
          unit="G"
          icon="🔥"
        />
        <StatCard
          title="다이아 보유량"
          value={metrics?.totalDiamond ?? 0}
          unit="💎"
          icon="💎"
        />
      </div>

      {/* 인플레이션 경고 */}
      {inflationIndex > 1.5 && (
        <div className={`p-3 rounded-lg border ${
          inflationIndex > 2 ? 'border-red-700 bg-red-900/20' : 'border-yellow-700 bg-yellow-900/20'
        }`}>
          <span className={`text-sm font-medium ${inflationColor}`}>
            ⚠️ 인플레이션 경고: 지수 {inflationIndex.toFixed(2)} — 
            {inflationIndex > 2 ? '골드 소모 컨텐츠 긴급 투입 필요' : '골드 소모 컨텐츠 점검 권장'}
          </span>
        </div>
      )}

      {/* 차트 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BarChart title="일일 매출 (90일)" data={revenueChartData} height={350} />
        <BarChart title="화폐 유통 현황" data={currencyChartData} height={350} />
      </div>
    </div>
  );
};

function today(): string {
  return new Date().toISOString().split('T')[0]!;
}

function ninetyDaysAgo(): string {
  const d = new Date();
  d.setDate(d.getDate() - 90);
  return d.toISOString().split('T')[0]!;
}

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('admin_token') || '';
  return token ? { Authorization: `Bearer ${token}` } : {};
}
