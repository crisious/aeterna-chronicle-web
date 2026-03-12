/**
 * P6-13: 대시보드 메인 페이지 — KPI 요약 (DAU/MAU/매출/동접)
 */
import React, { useEffect, useState } from 'react';
import apiClient from '../api/apiClient';
import { StatCard } from '../components/StatCard';
import { LineChart } from '../components/Chart';

interface KpiSummary {
  dau: number;
  mau: number;
  revenue: number;
  arpu: number;
  retention_d1: number;
  conversion: number;
}

interface KpiSnapshot {
  date: string;
  metric: string;
  value: number;
}

export const DashboardPage: React.FC = () => {
  const [summary, setSummary] = useState<KpiSummary>({
    dau: 0, mau: 0, revenue: 0, arpu: 0, retention_d1: 0, conversion: 0,
  });
  const [chartData, setChartData] = useState<KpiSnapshot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // KPI 스냅샷 조회 (최근 30일)
        const res = await apiClient.get('/analytics/kpi', {
          params: { startDate: thirtyDaysAgo(), endDate: today() },
        });
        const snapshots: KpiSnapshot[] = res.data.snapshots || [];
        setChartData(snapshots);

        // 최신 값 추출
        const latest: Record<string, number> = {};
        for (const s of snapshots) {
          if (!latest[s.metric] || s.date > (latest[`${s.metric}_date`] as unknown as string || '')) {
            latest[s.metric] = s.value;
          }
        }
        setSummary({
          dau: latest['dau'] || 0,
          mau: latest['mau'] || 0,
          revenue: latest['revenue'] || 0,
          arpu: latest['arpu'] || 0,
          retention_d1: latest['retention_d1'] || 0,
          conversion: latest['conversion'] || 0,
        });
      } catch {
        // API 미연결 시 기본값 유지
      } finally {
        setLoading(false);
      }
    };
    void fetchData();
  }, []);

  // DAU 차트 데이터 구성
  const dauSnapshots = chartData.filter(s => s.metric === 'dau');
  const revenueSnapshots = chartData.filter(s => s.metric === 'revenue');

  const dauChartData = {
    labels: dauSnapshots.map(s => new Date(s.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })),
    datasets: [{
      label: 'DAU',
      data: dauSnapshots.map(s => s.value),
      borderColor: '#3B82F6',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      fill: true,
      tension: 0.3,
    }],
  };

  const revenueChartData = {
    labels: revenueSnapshots.map(s => new Date(s.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })),
    datasets: [{
      label: '매출 (₩)',
      data: revenueSnapshots.map(s => s.value),
      borderColor: '#F59E0B',
      backgroundColor: 'rgba(245, 158, 11, 0.1)',
      fill: true,
      tension: 0.3,
    }],
  };

  if (loading) {
    return <div className="text-gray-500 text-center py-20">로딩 중...</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white">📊 KPI 요약</h2>

      {/* KPI 카드 그리드 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard title="DAU" value={summary.dau} unit="명" icon="👥" />
        <StatCard title="MAU" value={summary.mau} unit="명" icon="📅" />
        <StatCard title="일 매출" value={`₩${summary.revenue.toLocaleString()}`} icon="💰" />
        <StatCard title="ARPU" value={`₩${Math.round(summary.arpu).toLocaleString()}`} icon="📈" />
        <StatCard title="D1 리텐션" value={`${(summary.retention_d1 * 100).toFixed(1)}%`} icon="🔄" />
        <StatCard title="전환율" value={`${(summary.conversion * 100).toFixed(2)}%`} icon="🎯" />
      </div>

      {/* 차트 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LineChart title="DAU 트렌드 (30일)" data={dauChartData} height={320} />
        <LineChart title="매출 트렌드 (30일)" data={revenueChartData} height={320} />
      </div>
    </div>
  );
};

// ─── 유틸 ────────────────────────────────────────────────────────

function today(): string {
  return new Date().toISOString().split('T')[0]!;
}

function thirtyDaysAgo(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().split('T')[0]!;
}

// authHeaders() 제거 — apiClient의 authInterceptor로 대체 (P10-09)
