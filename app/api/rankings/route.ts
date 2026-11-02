import { NextResponse } from 'next/server';
import { getRankings } from '@/lib/rankings/rankings';

export async function GET() {
	const rankings = await getRankings();
	// Pages load this in the browser; ratings change a few times a day, so a short cache is safe
	return NextResponse.json(rankings, {
		headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=3600' }
	});
}
