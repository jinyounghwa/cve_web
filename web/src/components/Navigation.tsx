'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { LayoutDashboard, List, FileText } from 'lucide-react';

function NavLink({ href, children, icon }: { href: string; children: React.ReactNode; icon: React.ReactNode }) {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));

  return (
    <Link
      href={href}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
        isActive
          ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
          : 'text-[#94a3b8] hover:text-white hover:bg-[#1e2745] border border-transparent'
      }`}
    >
      {icon}
      {children}
    </Link>
  );
}

export default function Navigation() {
  return (
    <nav className="flex items-center gap-1">
      <NavLink href="/" icon={<LayoutDashboard size={16} />}>
        대시보드
      </NavLink>
      <NavLink href="/cves" icon={<List size={16} />}>
        CVE 목록
      </NavLink>
      <NavLink href="/reports" icon={<FileText size={16} />}>
        보고서
      </NavLink>
    </nav>
  );
}
