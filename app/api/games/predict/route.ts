import { NextRequest, NextResponse } from 'next/server';

const ML_API_URL = process.env.ML_API_URL || 'http://localhost:8100';

export async function GET(request: NextRequest) {
	const homeTeamKey = request.nextUrl.searchParams.get('home');
	const awayTeamKey = request.nextUrl.searchParams.get('away');

	if (!homeTeamKey || !awayTeamKey) {
		return NextResponse.json({ error: 'Missing home and/or away team key params' }, { status: 400 });
	}

	try {
		const response = await fetch(`${ML_API_URL}/predict`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				home_team_key: homeTeamKey,
				away_team_key: awayTeamKey,
			}),
		});

		if (!response.ok) {
			const error = await response.text();
			return NextResponse.json({ error: `Prediction service error: ${error}` }, { status: response.status });
		}

		return NextResponse.json(await response.json());
	} catch {
		return NextResponse.json({ error: 'Prediction service unavailable' }, { status: 503 });
	}
}
