import { NextResponse } from 'next/server';
import { getRepository } from '@/lib/repository';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const repo = getRepository();
    const { total, stats } = repo.getStats();

    return NextResponse.json({ stats, total });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
