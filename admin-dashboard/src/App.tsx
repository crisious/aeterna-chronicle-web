/**
 * P6-13: 어드민 대시보드 — React SPA 루트 컴포넌트
 * React Router 기반 라우팅, Sidebar + Header 레이아웃
 */
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { DashboardPage } from './pages/DashboardPage';
import { UsersPage } from './pages/UsersPage';
import { ReportsPage } from './pages/ReportsPage';
import { AnnouncementsPage } from './pages/AnnouncementsPage';
import { EconomyPage } from './pages/EconomyPage';

/** API 베이스 URL (환경변수 또는 기본값) */
export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000/api';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <div className="flex h-screen bg-gray-900 text-gray-100">
        {/* 사이드바 */}
        <Sidebar />

        {/* 메인 콘텐츠 영역 */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />

          <main className="flex-1 overflow-y-auto p-6">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/announcements" element={<AnnouncementsPage />} />
              <Route path="/economy" element={<EconomyPage />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
};

export default App;
