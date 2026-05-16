'use client';

import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FileText } from 'lucide-react';

export default function ReportsPage() {
  const [dates, setDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDates() {
      try {
        const response = await fetch('/api/reports/dates');
        const data = await response.json();
        setDates(data);
        if (data.length > 0) {
          setSelectedDate(data[0]);
        }
      } catch (error) {
        console.error('Failed to fetch report dates:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchDates();
  }, []);

  useEffect(() => {
    async function fetchContent() {
      if (!selectedDate) return;
      setLoading(true);
      try {
        const response = await fetch(`/api/reports/${selectedDate}`);
        const data = await response.json();
        setContent(data.content || '');
      } catch (error) {
        console.error('Failed to fetch report content:', error);
        setContent('');
      } finally {
        setLoading(false);
      }
    }
    fetchContent();
  }, [selectedDate]);

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="animate-fade-in-up">
        <h1 className="text-3xl font-extrabold text-white">보안 보고서</h1>
        <p className="text-[#94a3b8] mt-1">크롤러 실행 후 자동 생성되는 일일 CVE 보고서</p>
      </div>

      {/* Date Selector */}
      <div className="glass-card p-5 animate-fade-in-up animate-delay-1">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#94a3b8] mb-2">
              보고서 날짜 선택
            </label>
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full sm:w-auto min-w-[200px] px-4 py-2.5 bg-[#0a0e1a] border border-[#2a3455] rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all duration-200"
            >
              {dates.length === 0 ? (
                <option>보고서가 없습니다</option>
              ) : (
                dates.map((date) => (
                  <option key={date} value={date}>{date}</option>
                ))
              )}
            </select>
          </div>
          <div className="text-sm text-[#4a5568]">
            총 <span className="text-white font-semibold">{dates.length}</span>개 보고서
          </div>
        </div>

        {/* Date pills */}
        {dates.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-[#2a3455]">
            {dates.slice(0, 7).map((date) => (
              <button
                key={date}
                onClick={() => setSelectedDate(date)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                  selectedDate === date
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/50'
                    : 'bg-[#0a0e1a] text-[#94a3b8] border border-[#2a3455] hover:border-[#3d4f7a] hover:text-white'
                }`}
              >
                {date}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Report Content */}
      <div className="glass-card p-6 animate-fade-in-up animate-delay-2">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-4">
              <div className="w-10 h-10 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
              <p className="text-[#94a3b8] text-sm">보고서를 불러오는 중...</p>
            </div>
          </div>
        ) : content ? (
          <div className="markdown">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </div>
        ) : (
          <div className="text-center py-16 space-y-4">
            <div className="flex justify-center">
              <FileText size={48} className="text-[#2a3455]" />
            </div>
            <p className="text-[#4a5568]">
              {dates.length === 0
                ? '아직 생성된 보고서가 없습니다. 크롤러를 먼저 실행해주세요.'
                : '보고서를 불러올 수 없습니다.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
