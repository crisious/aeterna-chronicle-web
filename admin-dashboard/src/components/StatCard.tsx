/**
 * P6-13: 통계 카드 — KPI 요약 수치 표시
 */
import React from 'react';

export interface StatCardProps {
  /** 카드 제목 */
  title: string;
  /** 메인 수치 */
  value: string | number;
  /** 단위 (원, 명, % 등) */
  unit?: string;
  /** 전일 대비 변동 (양수=증가, 음수=감소) */
  change?: number;
  /** 아이콘 이모지 */
  icon?: string;
  /** 배경 색상 클래스 */
  color?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  unit = '',
  change,
  icon = '📈',
  color = 'bg-gray-800',
}) => {
  const changeColor = change !== undefined
    ? change >= 0 ? 'text-green-400' : 'text-red-400'
    : '';
  const changeSymbol = change !== undefined
    ? change >= 0 ? '▲' : '▼'
    : '';

  return (
    <div className={`${color} rounded-lg p-4 border border-gray-700`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-400">{title}</span>
        <span className="text-xl">{icon}</span>
      </div>
      <div className="text-2xl font-bold text-white">
        {typeof value === 'number' ? value.toLocaleString() : value}
        {unit && <span className="text-sm text-gray-400 ml-1">{unit}</span>}
      </div>
      {change !== undefined && (
        <div className={`text-xs mt-1 ${changeColor}`}>
          {changeSymbol} {Math.abs(change).toFixed(1)}% 전일 대비
        </div>
      )}
    </div>
  );
};
