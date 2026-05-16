'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { CveRow } from '@/lib/db';
import { 
  ShieldAlert, 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle,
  Briefcase,
  ChevronLeft,
  Info,
  ExternalLink,
  ClipboardList,
  FileText,
  ShieldCheck,
  Globe
} from 'lucide-react';

function severityToClass(severity: string): string {
  const map: Record<string, string> = {
    '긴급': 'critical',
    '높음': 'high',
    '보통': 'medium',
    '낮음': 'low',
  };
  return map[severity] || 'medium';
}

function getSeverityIcon(severity: string, size = 14) {
  const map: Record<string, any> = { 
    '긴급': <ShieldAlert size={size} className="text-red-500" />, 
    '높음': <AlertTriangle size={size} className="text-orange-500" />, 
    '보통': <AlertCircle size={size} className="text-yellow-500" />, 
    '낮음': <CheckCircle size={size} className="text-green-500" /> 
  };
  return map[severity] || <Info size={size} />;
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
              <span className={`severity-pill lg ${severityToClass(cve.severity)} flex items-center gap-1.5`}>
                {getSeverityIcon(cve.severity, 18)} {cve.severity}
              </span>
              {isRansomware && (
                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-1.5">
                  <ShieldAlert size={12} /> 랜섬웨어 캠페인 활용
                </span>
              )}
              {pastDue && (
                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center gap-1.5">
                  <AlertTriangle size={12} /> 패치 기한 초과
                </span>
              )}
            </div>
            <p className="text-[#cbd5e1] text-lg leading-relaxed">{cve.title}</p>
            {(cve.vendor_project || cve.product) && (
              <p className="text-[#94a3b8] text-sm flex items-center gap-1.5">
                <Briefcase size={14} />
                {[cve.vendor_project, cve.product].filter(Boolean).join(' / ')}
              </p>
            )}
          </div>
          <Link href="/cves" className="btn-ghost text-sm flex items-center gap-2 shrink-0">
            <ChevronLeft size={16} />
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
              <Info size={14} />
              기본 정보
            </h2>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-[#4a5568] mb-1">CVE ID</p>
                <p className="font-mono text-white">{cve.cve_id}</p>
              </div>
              <div>
                <p className="text-xs text-[#4a5568] mb-1">위험도</p>
                <span className={`severity-pill ${severityToClass(cve.severity)} flex items-center gap-1.5`}>
                  {getSeverityIcon(cve.severity)} {cve.severity}
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
                  <p className={`font-semibold flex items-center gap-1.5 ${pastDue ? 'text-red-400' : 'text-yellow-400'}`}>
                    {formatDate(cve.due_date)}
                    {pastDue && <AlertTriangle size={14} />}
                  </p>
                </div>
              )}
              {cve.ransomware_use && (
                <div>
                  <p className="text-xs text-[#4a5568] mb-1">랜섬웨어 캠페인</p>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1.5 ${
                    isRansomware
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                  }`}>
                    {isRansomware ? <ShieldAlert size={12} /> : null}
                    {isRansomware ? '활용 확인됨' : '미확인'}
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
              <ExternalLink size={14} />
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
                  <ExternalLink size={14} /> NVD 원문 보기
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
                  <ClipboardList size={14} /> CISA KEV 참고
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
                <FileText size={14} />
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
              <ShieldCheck size={14} />
              해결 방법 (원문)
            </h2>
            <div className="bg-[#0a0e1a] rounded-lg p-4 border border-[#2a3455]">
              <p className="text-[#cbd5e1] leading-7 whitespace-pre-wrap text-sm">
                {cve.raw_solution || '(해결책 정보가 없습니다)'}
              </p>
            </div>
            <p className="text-xs text-[#4a5568] mt-3 flex items-center gap-1.5">
              <Info size={12} />
              이 정보를 바탕으로 Claude Code 에이전트가 구체적인 패치 가이드를 생성합니다.
            </p>
          </div>

          {/* Korean Summary */}
          {cve.kor_summary && (
            <div className="glass-card p-6">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[#94a3b8] mb-4 flex items-center gap-2">
                <Globe size={14} /> 한국어 요약
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
