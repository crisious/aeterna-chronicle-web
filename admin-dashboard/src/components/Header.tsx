/**
 * P6-13: 상단 헤더 — 타이틀 + 관리자 정보 + 알림
 */
import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="bg-gray-800 border-b border-gray-700 px-6 py-3 flex items-center justify-between">
      <h1 className="text-lg font-bold text-amber-400">
        ⚙️ Aeterna Chronicle — 운영 대시보드
      </h1>

      <div className="flex items-center gap-4">
        {/* 알림 아이콘 */}
        <button className="relative text-gray-400 hover:text-white transition">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
            3
          </span>
        </button>

        {/* 관리자 프로필 */}
        <div className="flex items-center gap-2 text-sm">
          <div className="w-8 h-8 bg-amber-600 rounded-full flex items-center justify-center text-white font-bold">
            GM
          </div>
          <span className="text-gray-300">GameMaster</span>
        </div>
      </div>
    </header>
  );
};
