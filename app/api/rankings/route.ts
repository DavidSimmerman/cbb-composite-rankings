import { NextResponse } from 'next/server';
import { fetchRankings } from '@/lib/rankings';

export async function GET() {
	const rankings = await fetchRankings();
	return NextResponse.json(rankings);
}
