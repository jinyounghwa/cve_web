import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: { date: string } }) {
  try {
    const reportPath = path.join(process.cwd(), '..', 'crawler', 'cve-report', `CVE-Report-${params.date}.md`);

    if (!fs.existsSync(reportPath)) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    const content = fs.readFileSync(reportPath, 'utf-8');
    return NextResponse.json({ content });
  } catch (error) {
    console.error('Error fetching report content:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
