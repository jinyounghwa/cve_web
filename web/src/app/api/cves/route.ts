import { NextRequest, NextResponse } from 'next/server';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const severity = request.nextUrl.searchParams.get('severity');
    const limitParam = request.nextUrl.searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : (severity ? 2000 : 50);

    const dbPath = process.env.CVE_DB_PATH || path.join(process.cwd(), '..', 'crawler', 'cve.db');

    // shared 패키지에서 Repository 생성 (동적 require로 webpack 번들링 회피)
    const { createReadOnlyRepository } = require('shared');
    const repo = createReadOnlyRepository(dbPath);

    const cves = severity
      ? repo.findBySeverity(severity, limit)
      : repo.findAll(limit);

    repo.close();

    return NextResponse.json(cves);
  } catch (error) {
    console.error('Error fetching CVEs:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
