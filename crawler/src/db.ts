import Database from 'better-sqlite3';
import path from 'path';

const dbPath = process.env.CVE_DB_PATH || path.join(__dirname, '..', 'cve.db');
export const db: Database.Database = new Database(dbPath);

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS cve (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    cve_id      TEXT UNIQUE NOT NULL,
    title       TEXT,
    severity    TEXT,
    published_at TEXT,
    detail_url  TEXT,
    raw_solution TEXT,
    kor_summary TEXT,
    created_at  TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_severity ON cve(severity);
  CREATE INDEX IF NOT EXISTS idx_published ON cve(published_at);
  CREATE INDEX IF NOT EXISTS idx_created ON cve(created_at);
`);
