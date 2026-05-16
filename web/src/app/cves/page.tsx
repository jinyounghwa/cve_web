import { Suspense } from 'react';
import CveListContent from './CveListContent';

export default function CveListPage({
  searchParams,
}: {
  searchParams: { severity?: string };
}) {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
          <p className="text-[#94a3b8] text-sm">데이터를 불러오는 중...</p>
        </div>
      </div>
    }>
      <CveListContent severity={searchParams.severity || ''} />
    </Suspense>
  );
}
