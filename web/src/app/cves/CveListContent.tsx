'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import type { CveRow } from '@/lib/db';

const SEVERITIES = ['전체', '긴급', '높음', '보통', '낮음'];
const PAGE_SIZE = 20;

function severityToClass(severity: string): string {
  const map: Record<string, string> = {
    '긴급': 'critical',
    '높음': 'high',
    '보통': 'medium',
    '낮음': 'low',
  };
  return map[severity] || 'medium';
}

export default function CveListContent({ severity: selectedSeverity }: { severity: string }) {
  const router = useRouter();

  const [cves, setCves] = useState<CveRow[]>([]);
  const [filtered, setFiltered] = useState<CveRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    async function fetchCves() {
      setLoading(true);
      try {
        // severity 필터 시 API에서 자동으로 최대 2000건 반환
        const url = selectedSeverity
          ? `/api/cves?severity=${encodeURIComponent(selectedSeverity)}`
          : '/api/cves?limit=2000';
        const response = await fetch(url);
        const data = await response.json();
        setCves(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Failed to fetch CVEs:', error);
        setCves([]);
      } finally {
        setLoading(false);
      }
    }
    fetchCves();
  }, [selectedSeverity]);


  // Client-side search filter
  useEffect(() => {
    let result = cves;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = cves.filter(c =>
        c.cve_id.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        c.raw_solution?.toLowerCase().includes(q)
      );
    }
    setFiltered(result);
    setPage(1);
  }, [cves, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginatedCves = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const setSeverity = useCallback((severity: string) => {
    if (severity && severity !== '전체') {
      router.push(`/cves?severity=${encodeURIComponent(severity)}`);
    } else {
      router.push('/cves');
    }
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
          <p className="text-[#94a3b8] text-sm">데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="animate-fade-in-up">
        <h1 className="text-3xl font-extrabold text-white">CVE 취약점 목록</h1>
        <p className="text-[#94a3b8] mt-1">
          {selectedSeverity ? `위험도: ${selectedSeverity} — ` : ''}
          총 {filtered.length}건 (전체 {cves.length}건 중)
        </p>
      </div>

      {/* Search + Filter */}
      <div className="glass-card p-5 animate-fade-in-up animate-delay-1">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4a5568]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="CVE ID, 제목, 해결책으로 검색..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-input pl-10"
            />
          </div>

          {/* Severity Filter */}
          <div className="flex gap-2 flex-wrap">
            {SEVERITIES.map((severity) => {
              const isActive = severity === '전체' ? !selectedSeverity : selectedSeverity === severity;
              return (
                <button
                  key={severity}
                  onClick={() => setSeverity(severity)}
                  className={`btn-ghost text-xs ${isActive ? 'active' : ''}`}
                >
                  {severity === '전체' && '📋 '}
                  {severity === '긴급' && '🔴 '}
                  {severity === '높음' && '🟠 '}
                  {severity === '보통' && '🟡 '}
                  {severity === '낮음' && '🟢 '}
                  {severity}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* CVE Table */}
      <div className="glass-card animate-fade-in-up animate-delay-2">
        <div className="overflow-x-auto">
          <table className="cve-table">
            <thead>
              <tr>
                <th>CVE ID</th>
                <th>제목</th>
                <th>위험도</th>
                <th>발행일</th>
                <th>등록일</th>
              </tr>
            </thead>
            <tbody>
              {paginatedCves.map((cve) => (
                <tr key={cve.id}>
                  <td>
                    <Link href={`/cves/${cve.cve_id}`} className="text-blue-400 hover:text-blue-300 font-mono text-xs transition-colors">
                      {cve.cve_id}
                    </Link>
                  </td>
                  <td className="max-w-[300px] truncate text-[#cbd5e1] text-sm">{cve.title}</td>
                  <td>
                    <span className={`severity-pill ${severityToClass(cve.severity)}`}>
                      {cve.severity}
                    </span>
                  </td>
                  <td className="text-[#4a5568] text-xs">{formatDate(cve.published_at)}</td>
                  <td className="text-[#4a5568] text-xs">{formatDate(cve.created_at)}</td>
                </tr>
              ))}
              {paginatedCves.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-[#4a5568]">
                    {search ? `"${search}" 검색 결과가 없습니다.` : '등록된 CVE가 없습니다.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#2a3455]">
            <p className="text-xs text-[#4a5568]">
              {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, filtered.length)} / {filtered.length}건
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="btn-ghost text-xs disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ← 이전
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                const pageNum = start + i;
                if (pageNum > totalPages) return null;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`btn-ghost text-xs ${page === pageNum ? 'active' : ''}`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="btn-ghost text-xs disabled:opacity-30 disabled:cursor-not-allowed"
              >
                다음 →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
  } catch {
    return dateStr;
  }
}
