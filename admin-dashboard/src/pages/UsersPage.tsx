/**
 * P6-13: 유저 관리 페이지 — 검색/상세/밴/제재 이력
 */
import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { DataTable, type Column } from '../components/DataTable';
import { API_BASE } from '../App';

interface UserRow {
  id: string;
  email: string;
  nickname: string;
  role: string;
  isBanned: boolean;
  level: number;
  lastLoginAt: string;
  createdAt: string;
}

interface SanctionRow {
  id: string;
  type: string;
  reason: string;
  isActive: boolean;
  duration: number | null;
  expiresAt: string | null;
  createdAt: string;
}

const USER_COLUMNS: Column<UserRow>[] = [
  { key: 'nickname', label: '닉네임' },
  { key: 'email', label: '이메일' },
  { key: 'level', label: 'Lv' },
  { key: 'role', label: '역할', render: (v) => (
    <span className={`px-2 py-0.5 rounded text-xs ${v === 'admin' ? 'bg-amber-600/30 text-amber-400' : 'bg-gray-700 text-gray-300'}`}>
      {String(v)}
    </span>
  )},
  { key: 'isBanned', label: '상태', render: (v) => (
    <span className={v ? 'text-red-400' : 'text-green-400'}>
      {v ? '🚫 밴' : '✅ 정상'}
    </span>
  )},
  { key: 'lastLoginAt', label: '최종 접속', render: (v) => v ? new Date(String(v)).toLocaleDateString('ko-KR') : '-' },
];

export const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [sanctions, setSanctions] = useState<SanctionRow[]>([]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/admin/users`, {
        params: { search, page, limit: 20 },
        headers: authHeaders(),
      });
      setUsers(res.data.users || []);
      setTotalPages(res.data.totalPages || 1);
    } catch {
      // 연결 실패 시 빈 목록
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => { void fetchUsers(); }, [fetchUsers]);

  // 유저 선택 시 제재 이력 조회
  const handleUserClick = async (user: UserRow) => {
    setSelectedUser(user);
    try {
      const res = await axios.get(`${API_BASE}/admin/sanctions/${user.id}`, {
        headers: authHeaders(),
      });
      setSanctions(res.data.sanctions || []);
    } catch {
      setSanctions([]);
    }
  };

  // 밴 토글
  const handleBanToggle = async () => {
    if (!selectedUser) return;
    try {
      if (selectedUser.isBanned) {
        // 밴 해제: 활성 제재 해제
        const activeSanction = sanctions.find(s => s.isActive && s.type === 'ban');
        if (activeSanction) {
          await axios.post(`${API_BASE}/admin/sanctions/lift`, {
            sanctionId: activeSanction.id,
          }, { headers: authHeaders() });
        }
      } else {
        // 밴: 직접 제재 생성 (7일 기본)
        await axios.post(`${API_BASE}/admin/users/${selectedUser.id}/ban`, {
          reason: '어드민 수동 밴',
        }, { headers: authHeaders() });
      }
      void fetchUsers();
      void handleUserClick(selectedUser);
    } catch {
      // 실패 처리
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white">👥 유저 관리</h2>

      {/* 검색 */}
      <div className="flex gap-3">
        <input
          type="text"
          placeholder="닉네임 또는 이메일 검색..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none"
        />
      </div>

      {/* 유저 테이블 */}
      <DataTable<UserRow>
        columns={USER_COLUMNS}
        data={users}
        loading={loading}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        onRowClick={handleUserClick}
      />

      {/* 유저 상세 패널 */}
      {selectedUser && (
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">
              {selectedUser.nickname} <span className="text-sm text-gray-400">({selectedUser.email})</span>
            </h3>
            <button
              onClick={handleBanToggle}
              className={`px-4 py-1.5 rounded text-sm font-medium transition ${
                selectedUser.isBanned
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-red-600 hover:bg-red-700 text-white'
              }`}
            >
              {selectedUser.isBanned ? '밴 해제' : '밴 처리'}
            </button>
          </div>

          <div className="grid grid-cols-4 gap-4 text-sm">
            <div><span className="text-gray-400">ID:</span> <span className="text-gray-200">{selectedUser.id}</span></div>
            <div><span className="text-gray-400">레벨:</span> <span className="text-gray-200">{selectedUser.level}</span></div>
            <div><span className="text-gray-400">역할:</span> <span className="text-gray-200">{selectedUser.role}</span></div>
            <div><span className="text-gray-400">가입일:</span> <span className="text-gray-200">{new Date(selectedUser.createdAt).toLocaleDateString('ko-KR')}</span></div>
          </div>

          {/* 제재 이력 */}
          <div>
            <h4 className="text-sm font-bold text-gray-300 mb-2">제재 이력</h4>
            {sanctions.length === 0 ? (
              <p className="text-sm text-gray-500">제재 이력 없음</p>
            ) : (
              <div className="space-y-2">
                {sanctions.map((s) => (
                  <div key={s.id} className={`p-2 rounded text-sm border ${s.isActive ? 'border-red-700 bg-red-900/20' : 'border-gray-700 bg-gray-900'}`}>
                    <span className={`font-medium ${s.isActive ? 'text-red-400' : 'text-gray-400'}`}>
                      [{s.type}] {s.isActive ? '활성' : '해제됨'}
                    </span>
                    <span className="text-gray-400 ml-2">{s.reason}</span>
                    <span className="text-gray-500 ml-2 text-xs">
                      {new Date(s.createdAt).toLocaleDateString('ko-KR')}
                      {s.expiresAt && ` → ${new Date(s.expiresAt).toLocaleDateString('ko-KR')}`}
                    </span>
                  </div>
                ))}
              </div>
            )}
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
