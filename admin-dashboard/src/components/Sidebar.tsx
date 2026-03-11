/**
 * P6-13: 사이드바 내비게이션 — 페이지 링크 + 활성 상태 표시
 */
import React from 'react';
import { NavLink } from 'react-router-dom';

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { path: '/dashboard', label: '대시보드', icon: '📊' },
  { path: '/users', label: '유저 관리', icon: '👥' },
  { path: '/reports', label: '신고 관리', icon: '🚨' },
  { path: '/announcements', label: '공지사항', icon: '📢' },
  { path: '/economy', label: '경제 지표', icon: '💰' },
];

export const Sidebar: React.FC = () => {
  return (
    <aside className="w-56 bg-gray-800 border-r border-gray-700 flex flex-col">
      {/* 로고 */}
      <div className="px-4 py-5 border-b border-gray-700">
        <div className="text-xl font-bold text-amber-400">Aeterna</div>
        <div className="text-xs text-gray-500">Chronicle Admin</div>
      </div>

      {/* 내비게이션 */}
      <nav className="flex-1 py-4">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 text-sm transition ${
                isActive
                  ? 'bg-amber-600/20 text-amber-400 border-r-2 border-amber-400'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
              }`
            }
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* 하단 서버 상태 */}
      <div className="px-4 py-3 border-t border-gray-700 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 bg-green-500 rounded-full" />
          서버 정상
        </div>
        <div className="mt-1">v6.0 Phase 6</div>
      </div>
    </aside>
  );
};
