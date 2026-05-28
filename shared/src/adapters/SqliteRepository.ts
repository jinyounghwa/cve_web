// ============================================================================
// 커네빈 Complicated 영역 — SQLite 어댑터
// ICveRepository 인터페이스의 SQLite 구현
// ============================================================================

import Database from 'better-sqlite3';
import type { ICveRepository } from '../ports/ICveRepository';
import type { CveRow, CveStats, SeverityStats, UpsertParams } from '../types';

const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS cve (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    cve_id          TEXT UNIQUE NOT NULL,
    title           TEXT,
    severity        TEXT,
    published_at    TEXT,
    detail_url      TEXT,
    raw_solution    TEXT,
    kor_summary     TEXT,
    vendor_project  TEXT,
    product         TEXT,
    due_date        TEXT,
    description     TEXT,
    ransomware_use  TEXT,
    notes           TEXT,
    cwes            TEXT,
    created_at      TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_severity ON cve(severity);
  CREATE INDEX IF NOT EXISTS idx_published ON cve(published_at);
  CREATE INDEX IF NOT EXISTS idx_created ON cve(created_at);
  CREATE INDEX IF NOT EXISTS idx_cve_id ON cve(cve_id);
`;

const UPSERT_SQL = `
  INSERT INTO cve (cve_id, title, severity, published_at, detail_url, raw_solution, kor_summary,
                   vendor_project, product, due_date, description, ransomware_use, notes, cwes, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  ON CONFLICT(cve_id) DO UPDATE SET
    title = excluded.title,
    severity = excluded.severity,
    published_at = excluded.published_at,
    raw_solution = excluded.raw_solution,
    vendor_project = excluded.vendor_project,
    product = excluded.product,
    due_date = excluded.due_date,
    description = excluded.description,
    ransomware_use = excluded.ransomware_use,
    notes = excluded.notes,
    cwes = excluded.cwes
`;

export class SqliteRepository implements ICveRepository {
  private db: Database.Database;

  constructor(dbPath: string, options?: { readonly?: boolean }) {
    const readOnly = options?.readonly ?? false;
    this.db = new Database(dbPath, { readonly: readOnly });

    if (!readOnly) {
      this.db.pragma('journal_mode = WAL');
      this.initSchema();
    }
  }

  private initSchema(): void {
    this.db.exec(SCHEMA_SQL);
  }

  findAll(limit: number): CveRow[] {
    return this.db
      .prepare('SELECT * FROM cve ORDER BY created_at DESC LIMIT ?')
      .all(limit) as CveRow[];
  }

  findBySeverity(severity: string, limit: number): CveRow[] {
    return this.db
      .prepare('SELECT * FROM cve WHERE severity = ? ORDER BY created_at DESC LIMIT ?')
      .all(severity, limit) as CveRow[];
  }

  findBySeverities(severities: string[], limit: number): CveRow[] {
    const placeholders = severities.map(() => '?').join(',');
    return this.db
      .prepare(`SELECT * FROM cve WHERE severity IN (${placeholders}) ORDER BY created_at DESC LIMIT ?`)
      .all(...severities, limit) as CveRow[];
  }

  findById(cveId: string): CveRow | undefined {
    return this.db
      .prepare('SELECT * FROM cve WHERE cve_id = ?')
      .get(cveId) as CveRow | undefined;
  }

  getStats(): CveStats {
    const total = (this.db.prepare('SELECT COUNT(*) as count FROM cve').get() as any).count;
    const stats = this.db
      .prepare('SELECT severity, COUNT(*) as count FROM cve GROUP BY severity ORDER BY severity DESC')
      .all() as SeverityStats[];
    return { total, stats };
  }

  count(): number {
    return (this.db.prepare('SELECT COUNT(*) as count FROM cve').get() as any).count;
  }

  upsert(item: UpsertParams): { isNew: boolean } {
    const exists = this.db.prepare('SELECT id FROM cve WHERE cve_id = ?').get(item.cveId);
    this.db.prepare(UPSERT_SQL).run(
      item.cveId, item.title, item.severity, item.publishedAt, item.detailUrl,
      item.rawSolution, item.korSummary, item.vendorProject, item.product,
      item.dueDate, item.description, item.ransomwareUse, item.notes, item.cwes
    );
    return { isNew: !exists };
  }

  upsertMany(items: UpsertParams[]): { newCount: number; updateCount: number } {
    let newCount = 0;
    let updateCount = 0;

    const insertMany = this.db.transaction(() => {
      for (const item of items) {
        const result = this.upsert(item);
        if (result.isNew) newCount++;
        else updateCount++;
      }
    });

    insertMany();
    return { newCount, updateCount };
  }

  close(): void {
    this.db.close();
  }
}
