import { NextRequest, NextResponse } from 'next/server';
import { getRepository } from '@/lib/repository';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const severity = request.nextUrl.searchParams.get('severity');
    const limitParam = request.nextUrl.searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : (severity ? 2000 : 50);

    const repo = getRepository();

    const cves = severity
      ? repo.findBySeverity(severity, limit)
      : repo.findAll(limit);

    return NextResponse.json(cves);
  } catch (error) {
    console.error('Error fetching CVEs:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
