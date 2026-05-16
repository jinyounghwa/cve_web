import { NextRequest, NextResponse } from 'next/server';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const severity = request.nextUrl.searchParams.get('severity');
    const limitParam = request.nextUrl.searchParams.get('limit');
    // severity 필터 없이 전체 조회 시 기본 50, severity 필터 시 전체 반환(limit=2000)
    const limit = limitParam ? parseInt(limitParam, 10) : (severity ? 2000 : 50);

    const dbPath = process.env.CVE_DB_PATH || path.join(process.cwd(), '..', 'crawler', 'cve.db');

    // Dynamic import to avoid webpack bundling issues
    const Database = require('better-sqlite3');
    const db = new Database(dbPath, { readonly: true });

    let query = 'SELECT * FROM cve';
    const params: any[] = [];

    if (severity) {
      query += ' WHERE severity = ?';
      params.push(severity);
    }

    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);

    const cves = db.prepare(query).all(...params);
    db.close();

    return NextResponse.json(cves);
  } catch (error) {
    console.error('Error fetching CVEs:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
