import { NextResponse } from 'next/server';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const dbPath = process.env.CVE_DB_PATH || path.join(process.cwd(), '..', 'crawler', 'cve.db');

    const { createReadOnlyRepository } = require('shared');
    const repo = createReadOnlyRepository(dbPath);

    const { total, stats } = repo.getStats();
    repo.close();

    return NextResponse.json({ stats, total });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
