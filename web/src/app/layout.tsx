import type { Metadata } from 'next';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import { Shield } from 'lucide-react';
import './globals.css';

export const metadata: Metadata = {
  title: 'CVE Security Agent',
  description: '보안 취약점을 자동으로 감지하고 기록하는 시스템',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div className="flex flex-col min-h-screen">
          {/* Header */}
          <header className="sticky top-0 z-50 bg-[#0a0e1a]/80 backdrop-blur-xl border-b border-[#2a3455]">
            <div className="max-w-7xl mx-auto px-6 py-3">
              <div className="flex items-center justify-between">
                <Link href="/" className="flex items-center gap-3 group">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                    <Shield size={20} className="text-white" strokeWidth={2.5} />
                  </div>
                  <div>
                    <span className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors">
                      CVE Agent
                    </span>
                    <span className="hidden sm:inline ml-2 text-xs text-[#4a5568] font-mono">v1.0</span>
                  </div>
                </Link>

                <Navigation />

                {/* Status indicator */}
                <div className="hidden md:flex items-center gap-2 text-xs text-[#4a5568]">
                  <span className="pulse-dot w-2 h-2 rounded-full bg-green-500 inline-block" />
                  <span>시스템 활성</span>
                </div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1">
            <div className="max-w-7xl mx-auto px-6 py-8">{children}</div>
          </main>

          {/* Footer */}
          <footer className="border-t border-[#2a3455] mt-auto">
            <div className="max-w-7xl mx-auto px-6 py-5">
              <div className="flex items-center justify-between text-xs text-[#4a5568]">
                <p>© 2026 CVE Security Agent — 보안 취약점을 자동으로 감지하고, 기록하고, AI가 직접 패치한다</p>
                <p>Data from <a href="https://www.cisa.gov/known-exploited-vulnerabilities-catalog" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-400">CISA KEV</a></p>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
