import { NextResponse } from 'next/server';
import { getRankings } from '@/lib/rankings/rankings';

export async function GET() {
	const rankings = await getRankings();
	return NextResponse.json(rankings);
}
