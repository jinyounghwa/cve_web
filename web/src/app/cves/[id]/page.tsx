'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { CveRow } from '@/lib/db';

function severityToClass(severity: string): string {
  const map: Record<string, string> = {
    '긴급': 'critical',
    '높음': 'high',
    '보통': 'medium',
    '낮음': 'low',
  };
  return map[severity] || 'medium';
}

function severityIcon(severity: string): string {
  const map: Record<string, string> = { '긴급': '🔴', '높음': '🟠', '보통': '🟡', '낮음': '🟢' };
  return map[severity] || '⚪';
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

function isPastDue(dateStr?: string): boolean {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

export default function CveDetailPage({ params }: { params: { id: string } }) {
  const [cve, setCve] = useState<CveRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound404, setNotFound404] = useState(false);

  useEffect(() => {
    async function fetchCve() {
      try {
        const response = await fetch(`/api/cves/${params.id}`);
        if (!response.ok) {
          setNotFound404(true);
        } else {
          setCve(await response.json());
        }
      } catch (error) {
        console.error('Failed to fetch CVE:', error);
        setNotFound404(true);
      } finally {
        setLoading(false);
      }
    }
    fetchCve();
  }, [params.id]);

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

  if (notFound404 || !cve) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="text-center space-y-4 animate-fade-in-up">
          <div className="text-6xl font-bold gradient-text">404</div>
          <p className="text-lg text-[#94a3b8]">CVE를 찾을 수 없습니다.</p>
          <Link href="/cves" className="btn-primary inline-block">
            CVE 목록으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  const pastDue = isPastDue(cve.due_date);
  const isRansomware = cve.ransomware_use === 'Known';

  return (
    <div className="space-y-6 max-w-5xl animate-fade-in-up">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-[#4a5568]">
        <Link href="/" className="hover:text-blue-400 transition-colors">홈</Link>
        <span>/</span>
        <Link href="/cves" className="hover:text-blue-400 transition-colors">CVE 목록</Link>
        <span>/</span>
        <span className="text-[#94a3b8]">{cve.cve_id}</span>
      </nav>

      {/* Header */}
      <div className="glass-card p-6">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-mono text-2xl font-extrabold text-white">{cve.cve_id}</span>
              <span className={`severity-pill lg ${severityToClass(cve.severity)}`}>
                {severityIcon(cve.severity)} {cve.severity}
              </span>
              {isRansomware && (
                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                  🔴 랜섬웨어 캠페인 활용
                </span>
              )}
              {pastDue && (
                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30">
                  ⚠️ 패치 기한 초과
                </span>
              )}
            </div>
            <p className="text-[#cbd5e1] text-lg leading-relaxed">{cve.title}</p>
            {(cve.vendor_project || cve.product) && (
              <p className="text-[#94a3b8] text-sm flex items-center gap-1.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>
                {[cve.vendor_project, cve.product].filter(Boolean).join(' / ')}
              </p>
            )}
          </div>
          <Link href="/cves" className="btn-ghost text-sm flex items-center gap-2 shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
            목록으로
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Info Cards */}
        <div className="space-y-6">
          {/* Basic Info */}
          <div className="glass-card p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[#94a3b8] mb-4 flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
              기본 정보
            </h2>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-[#4a5568] mb-1">CVE ID</p>
                <p className="font-mono text-white">{cve.cve_id}</p>
              </div>
              <div>
                <p className="text-xs text-[#4a5568] mb-1">위험도</p>
                <span className={`severity-pill ${severityToClass(cve.severity)}`}>
                  {severityIcon(cve.severity)} {cve.severity}
                </span>
              </div>
              {cve.vendor_project && (
                <div>
                  <p className="text-xs text-[#4a5568] mb-1">벤더</p>
                  <p className="text-[#cbd5e1]">{cve.vendor_project}</p>
                </div>
              )}
              {cve.product && (
                <div>
                  <p className="text-xs text-[#4a5568] mb-1">제품</p>
                  <p className="text-[#cbd5e1]">{cve.product}</p>
                </div>
              )}
              {cve.cwes && (
                <div>
                  <p className="text-xs text-[#4a5568] mb-1">CWE 분류</p>
                  <p className="font-mono text-cyan-400 text-sm">{cve.cwes}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-[#4a5568] mb-1">발행 일자</p>
                <p className="text-[#cbd5e1]">{formatDate(cve.published_at)}</p>
              </div>
              {cve.due_date && (
                <div>
                  <p className="text-xs text-[#4a5568] mb-1">CISA 패치 기한</p>
                  <p className={`font-semibold ${pastDue ? 'text-red-400' : 'text-yellow-400'}`}>
                    {formatDate(cve.due_date)}
                    {pastDue && <span className="ml-1 text-xs font-normal"> ⚠️ 기한 초과</span>}
                  </p>
                </div>
              )}
              {cve.ransomware_use && (
                <div>
                  <p className="text-xs text-[#4a5568] mb-1">랜섬웨어 캠페인</p>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                    isRansomware
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                  }`}>
                    {isRansomware ? '🔴 활용 확인됨' : '미확인'}
                  </span>
                </div>
              )}
              <div>
                <p className="text-xs text-[#4a5568] mb-1">DB 등록</p>
                <p className="text-[#cbd5e1]">{formatDate(cve.created_at)}</p>
              </div>
            </div>
          </div>

          {/* References */}
          <div className="glass-card p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[#94a3b8] mb-4 flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
              참고 자료
            </h2>
            <div className="space-y-3">
              {cve.detail_url ? (
                <a
                  href={cve.detail_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-blue-400 hover:text-blue-300 font-medium text-sm transition-colors"
                >
                  🔗 NVD 원문 보기
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                </a>
              ) : (
                <p className="text-[#4a5568] text-sm">참고 링크가 없습니다.</p>
              )}
              {cve.notes && cve.notes !== cve.detail_url && (
                <a
                  href={cve.notes.startsWith('http') ? cve.notes : `https://${cve.notes}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-purple-400 hover:text-purple-300 font-medium text-sm transition-colors"
                >
                  📋 CISA KEV 참고
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Right: Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          {cve.description && (
            <div className="glass-card p-6">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[#94a3b8] mb-4 flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
                취약점 설명
              </h2>
              <div className="bg-[#0a0e1a] rounded-lg p-4 border border-[#2a3455]">
                <p className="text-[#cbd5e1] leading-7 text-sm">{cve.description}</p>
              </div>
            </div>
          )}

          {/* Raw Solution */}
          <div className="glass-card p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[#94a3b8] mb-4 flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              해결 방법 (원문)
            </h2>
            <div className="bg-[#0a0e1a] rounded-lg p-4 border border-[#2a3455]">
              <p className="text-[#cbd5e1] leading-7 whitespace-pre-wrap text-sm">
                {cve.raw_solution || '(해결책 정보가 없습니다)'}
              </p>
            </div>
            <p className="text-xs text-[#4a5568] mt-3 flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
              이 정보를 바탕으로 Claude Code 에이전트가 구체적인 패치 가이드를 생성합니다.
            </p>
          </div>

          {/* Korean Summary */}
          {cve.kor_summary && (
            <div className="glass-card p-6">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[#94a3b8] mb-4 flex items-center gap-2">
                🇰🇷 한국어 요약
              </h2>
              <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/20">
                <p className="text-[#cbd5e1] leading-7 text-sm">{cve.kor_summary}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
