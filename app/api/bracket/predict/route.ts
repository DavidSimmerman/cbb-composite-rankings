import { NextRequest, NextResponse } from 'next/server';

const ML_API_URL = process.env.ML_API_URL || 'http://localhost:8100';

export async function GET(request: NextRequest) {
	const teamA = request.nextUrl.searchParams.get('teamA');
	const teamB = request.nextUrl.searchParams.get('teamB');
	const seedA = request.nextUrl.searchParams.get('seedA');
	const seedB = request.nextUrl.searchParams.get('seedB');
	const round = request.nextUrl.searchParams.get('round');

	if (!teamA || !teamB || !seedA || !seedB || !round) {
		return NextResponse.json({ error: 'Missing required params: teamA, teamB, seedA, seedB, round' }, { status: 400 });
	}

	try {
		const response = await fetch(`${ML_API_URL}/predict/tournament`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				team_a_key: teamA,
				team_b_key: teamB,
				seed_a: parseInt(seedA),
				seed_b: parseInt(seedB),
				round_number: parseInt(round),
			}),
		});

		if (!response.ok) {
			const error = await response.text();
			return NextResponse.json({ error: `Tournament prediction error: ${error}` }, { status: response.status });
		}

		return NextResponse.json(await response.json());
	} catch {
		return NextResponse.json({ error: 'Tournament prediction service unavailable' }, { status: 503 });
	}
}
