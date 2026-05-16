import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-[80vh]">
      <div className="text-center space-y-6 animate-fade-in-up">
        <div className="text-8xl font-bold gradient-text">404</div>
        <p className="text-xl text-[#94a3b8]">페이지를 찾을 수 없습니다.</p>
        <Link href="/" className="btn-primary inline-block">
          홈으로 돌아가기
        </Link>
      </div>
    </div>
  );
}
