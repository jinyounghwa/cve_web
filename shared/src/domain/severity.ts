// ============================================================================
// 커네빈 Clear 영역 — 위험도 산출
// 인과관계가 명확하고 예측 가능 → 트랜잭션 스크립트 패턴, 직접 함수 호출
// ============================================================================

/**
 * 복합 기반 위험도 산출:
 * - 랜섬웨어 활용 + 기한 초과 → 긴급
 * - 랜섬웨어 활용 (Known) → 높음
 * - 기한 초과 → 높음
 * - 기한 7일 이내 → 보통
 * - 최근 30일 내 추가 → 보통
 * - 그 외 → 낮음
 */
export function calcSeverity(dueDate: string, dateAdded: string, ransomwareUse: string): string {
  const now = new Date();
  const isRansomware = ransomwareUse === 'Known';

  let dueOverdue = false;
  let dueSoon = false;
  if (dueDate) {
    const due = new Date(dueDate);
    if (!isNaN(due.getTime())) {
      const diffDays = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      dueOverdue = diffDays < 0;
      dueSoon = diffDays <= 7;
    }
  }

  let recentlyAdded = false;
  if (dateAdded) {
    const added = new Date(dateAdded);
    if (!isNaN(added.getTime())) {
      recentlyAdded = (now.getTime() - added.getTime()) / (1000 * 60 * 60 * 24) <= 30;
    }
  }

  if (isRansomware && dueOverdue) return '긴급';
  if (isRansomware) return '높음';
  if (dueOverdue) return '높음';
  if (dueSoon) return '보통';
  if (recentlyAdded) return '보통';
  return '낮음';
}
