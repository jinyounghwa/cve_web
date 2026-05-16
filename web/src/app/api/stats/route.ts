import { NextResponse } from 'next/server';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const dbPath = process.env.CVE_DB_PATH || path.join(process.cwd(), '..', 'crawler', 'cve.db');

    // Dynamic import to avoid webpack bundling issues
    const Database = require('better-sqlite3');
    const db = new Database(dbPath, { readonly: true });

    const stats = db
      .prepare('SELECT severity, COUNT(*) as count FROM cve GROUP BY severity ORDER BY severity DESC')
      .all() as any[];

    const total = (db.prepare('SELECT COUNT(*) as count FROM cve').get() as any).count;

    db.close();

    return NextResponse.json({ stats, total });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
