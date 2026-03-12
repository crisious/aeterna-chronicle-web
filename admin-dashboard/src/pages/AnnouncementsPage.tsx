/**
 * P6-13: 공지사항 관리 페이지 — CRUD
 */
import React, { useEffect, useState, useCallback } from 'react';
import apiClient from '../api/apiClient';

interface Announcement {
  id: string;
  title: string;
  content: string;
  category: string;
  isPinned: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const CATEGORIES = ['공지', '점검', '이벤트', '업데이트', '긴급'];

export const AnnouncementsPage: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [isNew, setIsNew] = useState(false);

  // 폼 상태
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formCategory, setFormCategory] = useState('공지');
  const [formPinned, setFormPinned] = useState(false);

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/admin/announcements');
      setAnnouncements(res.data.announcements || res.data || []);
    } catch {
      // 연결 실패
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchAnnouncements(); }, [fetchAnnouncements]);

  const openNewForm = () => {
    setIsNew(true);
    setEditing(null);
    setFormTitle('');
    setFormContent('');
    setFormCategory('공지');
    setFormPinned(false);
  };

  const openEditForm = (ann: Announcement) => {
    setIsNew(false);
    setEditing(ann);
    setFormTitle(ann.title);
    setFormContent(ann.content);
    setFormCategory(ann.category);
    setFormPinned(ann.isPinned);
  };

  const handleSave = async () => {
    try {
      const data = {
        title: formTitle,
        content: formContent,
        category: formCategory,
        isPinned: formPinned,
      };

      if (isNew) {
        await apiClient.post('/admin/announcements', data);
      } else if (editing) {
        await apiClient.patch(`/admin/announcements/${editing.id}`, data);
      }

      setEditing(null);
      setIsNew(false);
      void fetchAnnouncements();
    } catch {
      // 실패 처리
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('이 공지를 삭제하시겠습니까?')) return;
    try {
      await apiClient.delete(`/admin/announcements/${id}`);
      void fetchAnnouncements();
    } catch {
      // 실패 처리
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">📢 공지사항 관리</h2>
        <button
          onClick={openNewForm}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded text-sm font-medium transition"
        >
          + 새 공지
        </button>
      </div>

      {/* 공지 목록 */}
      {loading ? (
        <div className="text-gray-500 text-center py-10">로딩 중...</div>
      ) : (
        <div className="space-y-3">
          {announcements.map((ann) => (
            <div
              key={ann.id}
              className="bg-gray-800 border border-gray-700 rounded-lg p-4 flex items-start justify-between"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    ann.category === '긴급' ? 'bg-red-600/30 text-red-400' :
                    ann.category === '점검' ? 'bg-yellow-600/30 text-yellow-400' :
                    'bg-blue-600/30 text-blue-400'
                  }`}>
                    {ann.category}
                  </span>
                  {ann.isPinned && <span className="text-yellow-400 text-xs">📌 고정</span>}
                </div>
                <h3 className="text-white font-medium">{ann.title}</h3>
                <p className="text-sm text-gray-400 mt-1 line-clamp-2">{ann.content}</p>
                <span className="text-xs text-gray-500 mt-2 block">
                  {new Date(ann.createdAt).toLocaleDateString('ko-KR')}
                </span>
              </div>
              <div className="flex gap-2 ml-4">
                <button
                  onClick={() => openEditForm(ann)}
                  className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-xs transition"
                >
                  수정
                </button>
                <button
                  onClick={() => handleDelete(ann.id)}
                  className="px-3 py-1 bg-red-900/50 hover:bg-red-800 text-red-400 rounded text-xs transition"
                >
                  삭제
                </button>
              </div>
            </div>
          ))}
          {announcements.length === 0 && (
            <div className="text-gray-500 text-center py-10">공지사항이 없습니다.</div>
          )}
        </div>
      )}

      {/* 작성/수정 폼 */}
      {(isNew || editing) && (
        <div className="bg-gray-800 border border-amber-700 rounded-lg p-4 space-y-4">
          <h3 className="text-lg font-bold text-amber-400">
            {isNew ? '새 공지 작성' : '공지 수정'}
          </h3>

          <input
            type="text"
            placeholder="제목"
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-500"
          />

          <textarea
            placeholder="내용"
            value={formContent}
            onChange={(e) => setFormContent(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-500 resize-none h-32"
          />

          <div className="flex items-center gap-4">
            <select
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value)}
              className="bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-sm text-white"
            >
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>

            <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={formPinned}
                onChange={(e) => setFormPinned(e.target.checked)}
                className="rounded border-gray-600"
              />
              상단 고정
            </label>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={!formTitle.trim() || !formContent.trim()}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded text-sm font-medium disabled:opacity-50 transition"
            >
              {isNew ? '등록' : '저장'}
            </button>
            <button
              onClick={() => { setEditing(null); setIsNew(false); }}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-sm transition"
            >
              취소
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// authHeaders() 제거 — apiClient의 authInterceptor로 대체 (P10-09)
