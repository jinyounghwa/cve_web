// ============================================================================
// Web API — DB Repository 싱글톤 관리
// 커네빈 Complicated: 요청마다 커넥션을 생성하지 않고 싱글톤으로 재사용
// ============================================================================

import path from 'path';
import type { ICveRepository } from 'shared';

let _repo: ICveRepository | undefined = undefined;

/**
 * 읽기 전용 Repository 싱글톤을 반환합니다.
 * 첫 호출 시 생성, 이후 재사용. 커넥션을 요청마다 생성하지 않습니다.
 */
export function getRepository(): ICveRepository {
  if (!_repo) {
    const dbPath = process.env.CVE_DB_PATH || path.join(process.cwd(), '..', 'crawler', 'cve.db');
    const { createReadOnlyRepository } = require('shared');
    _repo = createReadOnlyRepository(dbPath);
  }
  return _repo!;
}
