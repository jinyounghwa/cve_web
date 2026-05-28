import { NextRequest, NextResponse } from 'next/server';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const dbPath = process.env.CVE_DB_PATH || path.join(process.cwd(), '..', 'crawler', 'cve.db');

    const { createReadOnlyRepository } = require('shared');
    const repo = createReadOnlyRepository(dbPath);

    const cve = repo.findById(params.id);
    repo.close();

    if (!cve) {
      return NextResponse.json({ error: 'CVE not found' }, { status: 404 });
    }

    return NextResponse.json(cve);
  } catch (error) {
    console.error('Error fetching CVE detail:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
