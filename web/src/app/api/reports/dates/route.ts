import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const reportDir = path.join(process.cwd(), '..', 'crawler', 'cve-report');

    if (!fs.existsSync(reportDir)) {
      return NextResponse.json([]);
    }

    const files = fs.readdirSync(reportDir);
    const dates = files
      .filter((file) => file.startsWith('CVE-Report-') && file.endsWith('.md'))
      .map((file) => file.replace('CVE-Report-', '').replace('.md', ''))
      .sort()
      .reverse();

    return NextResponse.json(dates);
  } catch (error) {
    console.error('Error fetching report dates:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
