/**
 * 어드민 대시보드 Vite 엔트리.
 * 루트 엘리먼트 누락 시 빈 화면으로 실패하지 않고 즉시 원인을 드러낸다.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Admin dashboard root element not found.');
}

createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
