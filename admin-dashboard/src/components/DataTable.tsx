/**
 * P6-13: 데이터 테이블 — 정렬/페이징 지원 범용 테이블
 */
import React from 'react';

export interface Column<T> {
  /** 컬럼 키 (데이터 필드명) */
  key: keyof T & string;
  /** 컬럼 헤더 제목 */
  label: string;
  /** 커스텀 렌더러 */
  render?: (value: T[keyof T], row: T) => React.ReactNode;
  /** 너비 클래스 */
  width?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  /** 행 클릭 핸들러 */
  onRowClick?: (row: T) => void;
  /** 현재 페이지 (1-based) */
  page?: number;
  /** 전체 페이지 수 */
  totalPages?: number;
  /** 페이지 변경 핸들러 */
  onPageChange?: (page: number) => void;
  /** 로딩 상태 */
  loading?: boolean;
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  onRowClick,
  page = 1,
  totalPages = 1,
  onPageChange,
  loading = false,
}: DataTableProps<T>) {
  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
      {/* 테이블 */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700 bg-gray-750">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase ${col.width || ''}`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-gray-500">
                  로딩 중...
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-gray-500">
                  데이터 없음
                </td>
              </tr>
            ) : (
              data.map((row, idx) => (
                <tr
                  key={idx}
                  onClick={() => onRowClick?.(row)}
                  className={`border-b border-gray-700/50 transition ${
                    onRowClick ? 'cursor-pointer hover:bg-gray-700/50' : ''
                  }`}
                >
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3 text-gray-300">
                      {col.render
                        ? col.render(row[col.key], row)
                        : String(row[col.key] ?? '-')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 페이징 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-700">
          <span className="text-xs text-gray-500">
            {page} / {totalPages} 페이지
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => onPageChange?.(page - 1)}
              disabled={page <= 1}
              className="px-3 py-1 text-xs bg-gray-700 rounded disabled:opacity-50 hover:bg-gray-600 transition"
            >
              이전
            </button>
            <button
              onClick={() => onPageChange?.(page + 1)}
              disabled={page >= totalPages}
              className="px-3 py-1 text-xs bg-gray-700 rounded disabled:opacity-50 hover:bg-gray-600 transition"
            >
              다음
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
