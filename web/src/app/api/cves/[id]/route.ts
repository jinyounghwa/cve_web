import { NextRequest, NextResponse } from 'next/server';
import { getRepository } from '@/lib/repository';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const repo = getRepository();

    const cve = repo.findById(params.id);

    if (!cve) {
      return NextResponse.json({ error: 'CVE not found' }, { status: 404 });
    }

    return NextResponse.json(cve);
  } catch (error) {
    console.error('Error fetching CVE detail:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
