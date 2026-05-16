import { NextRequest, NextResponse } from 'next/server';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const dbPath = process.env.CVE_DB_PATH || path.join(process.cwd(), '..', 'crawler', 'cve.db');

    // Dynamic import to avoid webpack bundling issues
    const Database = require('better-sqlite3');
    const db = new Database(dbPath, { readonly: true });

    const cve = db.prepare('SELECT * FROM cve WHERE cve_id = ?').get(params.id);
    db.close();

    if (!cve) {
      return NextResponse.json({ error: 'CVE not found' }, { status: 404 });
    }

    return NextResponse.json(cve);
  } catch (error) {
    console.error('Error fetching CVE detail:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
