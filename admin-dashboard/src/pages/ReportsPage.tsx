/**
 * P6-13: 신고 관리 페이지 — 신고 큐 + 검토 UI
 */
import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { DataTable, type Column } from '../components/DataTable';
import { API_BASE } from '../App';

interface ReportRow {
  id: string;
  reporterId: string;
  targetId: string;
  type: string;
  description: string;
  status: string;
  action: string | null;
  reviewNote: string | null;
  createdAt: string;
}

type SanctionAction = 'warn' | 'mute_1h' | 'mute_24h' | 'ban_7d' | 'ban_30d' | 'ban_permanent';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-600/30 text-yellow-400',
  reviewing: 'bg-blue-600/30 text-blue-400',
  resolved: 'bg-green-600/30 text-green-400',
  dismissed: 'bg-gray-600/30 text-gray-400',
};

const TYPE_LABELS: Record<string, string> = {
  harassment: '괴롭힘',
  cheating: '치팅',
  botting: '봇 사용',
  inappropriate_name: '부적절한 이름',
  spam: '스팸',
  other: '기타',
};

const ACTION_OPTIONS: { value: SanctionAction; label: string }[] = [
  { value: 'warn', label: '경고' },
  { value: 'mute_1h', label: '1시간 뮤트' },
  { value: 'mute_24h', label: '24시간 뮤트' },
  { value: 'ban_7d', label: '7일 밴' },
  { value: 'ban_30d', label: '30일 밴' },
  { value: 'ban_permanent', label: '영구 밴' },
];

const REPORT_COLUMNS: Column<ReportRow>[] = [
  { key: 'type', label: '유형', render: (v) => TYPE_LABELS[String(v)] || String(v) },
  { key: 'targetId', label: '대상 ID', render: (v) => (
    <span className="font-mono text-xs">{String(v).slice(0, 8)}...</span>
  )},
  { key: 'description', label: '내용', render: (v) => (
    <span className="truncate max-w-xs block">{String(v)}</span>
  )},
  { key: 'status', label: '상태', render: (v) => (
    <span className={`px-2 py-0.5 rounded text-xs ${STATUS_COLORS[String(v)] || ''}`}>
      {String(v)}
    </span>
  )},
  { key: 'createdAt', label: '접수일', render: (v) => new Date(String(v)).toLocaleDateString('ko-KR') },
];

export const ReportsPage: React.FC = () => {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ReportRow | null>(null);
  const [reviewAction, setReviewAction] = useState<SanctionAction | ''>('');
  const [reviewNote, setReviewNote] = useState('');

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/admin/reports`, {
        params: { status: statusFilter, page, limit: 20 },
        headers: authHeaders(),
      });
      setReports(res.data.reports || []);
      setTotalPages(res.data.totalPages || 1);
    } catch {
      // 연결 실패
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => { void fetchReports(); }, [fetchReports]);

  // 신고 검토 제출
  const handleReview = async (dismiss: boolean) => {
    if (!selectedReport) return;
    try {
      await axios.patch(
        `${API_BASE}/admin/reports/${selectedReport.id}/review`,
        {
          action: dismiss ? null : (reviewAction || null),
          reviewNote: reviewNote || undefined,
        },
        { headers: authHeaders() },
      );
      setSelectedReport(null);
      setReviewAction('');
      setReviewNote('');
      void fetchReports();
    } catch {
      // 실패 처리
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white">🚨 신고 관리</h2>

      {/* 상태 필터 탭 */}
      <div className="flex gap-2">
        {['pending', 'reviewing', 'resolved', 'dismissed'].map((s) => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`px-3 py-1.5 rounded text-sm transition ${
              statusFilter === s
                ? 'bg-amber-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            {s === 'pending' ? '대기 중' : s === 'reviewing' ? '검토 중' : s === 'resolved' ? '처리됨' : '기각'}
          </button>
        ))}
      </div>

      {/* 신고 목록 */}
      <DataTable<ReportRow>
        columns={REPORT_COLUMNS}
        data={reports}
        loading={loading}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        onRowClick={(row) => { setSelectedReport(row); setReviewAction(''); setReviewNote(''); }}
      />

      {/* 검토 패널 */}
      {selectedReport && selectedReport.status === 'pending' && (
        <div className="bg-gray-800 rounded-lg border border-amber-700 p-4 space-y-4">
          <h3 className="text-lg font-bold text-amber-400">신고 검토</h3>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">신고 유형:</span>{' '}
              <span className="text-white">{TYPE_LABELS[selectedReport.type] || selectedReport.type}</span>
            </div>
            <div>
              <span className="text-gray-400">대상 ID:</span>{' '}
              <span className="font-mono text-white">{selectedReport.targetId}</span>
            </div>
          </div>

          <div className="text-sm">
            <span className="text-gray-400">내용:</span>
            <p className="mt-1 text-white bg-gray-900 rounded p-2">{selectedReport.description}</p>
          </div>

          {/* 제재 선택 */}
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-400">제재 조치:</label>
            <select
              value={reviewAction}
              onChange={(e) => setReviewAction(e.target.value as SanctionAction)}
              className="bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-sm text-white"
            >
              <option value="">-- 선택 --</option>
              {ACTION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* 검토 메모 */}
          <textarea
            placeholder="검토 메모 (선택)"
            value={reviewNote}
            onChange={(e) => setReviewNote(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-500 resize-none h-20"
          />

          {/* 버튼 */}
          <div className="flex gap-3">
            <button
              onClick={() => handleReview(false)}
              disabled={!reviewAction}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium disabled:opacity-50 transition"
            >
              제재 적용
            </button>
            <button
              onClick={() => handleReview(true)}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm font-medium transition"
            >
              기각
            </button>
            <button
              onClick={() => setSelectedReport(null)}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded text-sm transition"
            >
              취소
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('admin_token') || '';
  return token ? { Authorization: `Bearer ${token}` } : {};
}
