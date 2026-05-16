'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { CveRow } from '@/lib/db';
import { 
  ShieldAlert, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  ChevronRight, 
  List, 
  FileText,
  Shield
} from 'lucide-react';

interface SeverityStats {
  severity: string;
  count: number;
}

function StatCard({ title, count, subtitle, type, icon }: {
  title: string; count: number; subtitle: string; type: string; icon: React.ReactNode;
}) {
  const glowClass: Record<string, string> = {
    total: 'glow-blue',
    critical: 'glow-red',
    high: 'glow-orange',
    medium: 'glow-green',
  };

  return (
    <div className={`stat-card ${type} ${glowClass[type] || ''} animate-fade-in-up`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-[#94a3b8]">{title}</span>
        <div className="w-8 h-8 rounded-lg bg-[#0a0e1a] flex items-center justify-center text-[#94a3b8]">
          {icon}
        </div>
      </div>
      <p className="text-3xl font-extrabold text-white">{count.toLocaleString()}</p>
      <p className="text-xs text-[#4a5568] mt-1">{subtitle}</p>
    </div>
  );
}

function SeverityBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-[#94a3b8]">{label}</span>
        <span className="font-semibold text-white">{count} <span className="text-[#4a5568] font-normal">({pct.toFixed(1)}%)</span></span>
      </div>
      <div className="w-full h-2 bg-[#0a0e1a] rounded-full overflow-hidden">
        <div className={`severity-bar ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [recentCves, setRecentCves] = useState<CveRow[]>([]);
  const [stats, setStats] = useState<SeverityStats[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [cvesRes, statsRes] = await Promise.all([
          fetch('/api/cves?limit=10'),
          fetch('/api/stats'),
        ]);
        setRecentCves(await cvesRes.json());
        const statsData = await statsRes.json();
        setStats(statsData.stats);
        setTotalCount(statsData.total);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const statMap: Record<string, number> = {};
  stats.forEach((s) => { statMap[s.severity] = s.count; });

  const severityColor: Record<string, string> = {
    '긴급': 'bg-red-500',
    '높음': 'bg-orange-500',
    '보통': 'bg-yellow-500',
    '낮음': 'bg-green-500',
  };

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
    <div className="space-y-8">
      {/* Page Header */}
      <div className="animate-fade-in-up">
        <h1 className="text-3xl font-extrabold text-white">보안 대시보드</h1>
        <p className="text-[#94a3b8] mt-1">CISA KEV 기반 실시간 보안 취약점 모니터링</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="전체 취약점" count={totalCount} subtitle="누적 CVE 수" type="total"
          icon={<Shield size={16} />}
        />
        <StatCard
          title="긴급" count={statMap['긴급'] || 0} subtitle="즉시 패치 필요" type="critical"
          icon={<ShieldAlert size={16} />}
        />
        <StatCard
          title="높음" count={statMap['높음'] || 0} subtitle="이번 주 내 패치" type="high"
          icon={<AlertTriangle size={16} />}
        />
        <StatCard
          title="보통 / 낮음" count={(statMap['보통'] || 0) + (statMap['낮음'] || 0)} subtitle="다음 배포 시" type="medium"
          icon={<CheckCircle2 size={16} />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Severity Distribution */}
        <div className="glass-card p-6 animate-fade-in-up animate-delay-1">
          <h2 className="text-lg font-bold text-white mb-6">위험도 분포</h2>
          <div className="space-y-5">
            <SeverityBar label="긴급" count={statMap['긴급'] || 0} total={totalCount} color="bg-gradient-to-r from-red-600 to-red-400" />
            <SeverityBar label="높음" count={statMap['높음'] || 0} total={totalCount} color="bg-gradient-to-r from-orange-600 to-orange-400" />
            <SeverityBar label="보통" count={statMap['보통'] || 0} total={totalCount} color="bg-gradient-to-r from-yellow-600 to-yellow-400" />
            <SeverityBar label="낮음" count={statMap['낮음'] || 0} total={totalCount} color="bg-gradient-to-r from-green-600 to-green-400" />
          </div>
        </div>

        {/* Recent CVEs */}
        <div className="lg:col-span-2 glass-card p-6 animate-fade-in-up animate-delay-2">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-white">최근 등록된 취약점</h2>
            <Link href="/cves" className="text-blue-400 hover:text-blue-300 text-sm font-medium flex items-center gap-1 transition-colors">
              전체 보기
              <ChevronRight size={14} />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="cve-table">
              <thead>
                <tr>
                  <th>CVE ID</th>
                  <th>제목</th>
                  <th>위험도</th>
                  <th>발행일</th>
                </tr>
              </thead>
              <tbody>
                {recentCves.map((cve) => (
                  <tr key={cve.id}>
                    <td>
                      <Link href={`/cves/${cve.cve_id}`} className="text-blue-400 hover:text-blue-300 font-mono text-xs transition-colors">
                        {cve.cve_id}
                      </Link>
                    </td>
                    <td className="max-w-[280px] truncate text-[#cbd5e1]">{cve.title}</td>
                    <td>
                      <span className={`severity-pill ${severityToClass(cve.severity)}`}>
                        {cve.severity}
                      </span>
                    </td>
                    <td className="text-[#4a5568] text-xs">{formatDate(cve.published_at)}</td>
                  </tr>
                ))}
                {recentCves.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-[#4a5568]">등록된 CVE가 없습니다</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fade-in-up animate-delay-3">
        <Link href="/cves" className="glass-card p-5 flex items-center gap-4 group cursor-pointer">
          <div className="w-10 h-10 rounded-lg bg-blue-600/20 flex items-center justify-center text-blue-400">
            <List size={20} />
          </div>
          <div>
            <p className="font-semibold text-white group-hover:text-blue-400 transition-colors">CVE 목록 조회</p>
            <p className="text-xs text-[#4a5568]">전체 취약점 목록 및 필터</p>
          </div>
        </Link>
        <Link href="/cves?severity=긴급" className="glass-card p-5 flex items-center gap-4 group cursor-pointer">
          <div className="w-10 h-10 rounded-lg bg-red-600/20 flex items-center justify-center text-red-400">
            <ShieldAlert size={20} />
          </div>
          <div>
            <p className="font-semibold text-white group-hover:text-red-400 transition-colors">긴급 취약점</p>
            <p className="text-xs text-[#4a5568]">즉시 패치가 필요한 항목</p>
          </div>
        </Link>
        <Link href="/reports" className="glass-card p-5 flex items-center gap-4 group cursor-pointer">
          <div className="w-10 h-10 rounded-lg bg-purple-600/20 flex items-center justify-center text-purple-400">
            <FileText size={20} />
          </div>
          <div>
            <p className="font-semibold text-white group-hover:text-purple-400 transition-colors">보고서</p>
            <p className="text-xs text-[#4a5568]">일일 자동 생성 보고서</p>
          </div>
        </Link>
      </div>
    </div>
  );
}

function severityToClass(severity: string): string {
  const map: Record<string, string> = {
    '긴급': 'critical',
    '높음': 'high',
    '보통': 'medium',
    '낮음': 'low',
  };
  return map[severity] || 'medium';
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
