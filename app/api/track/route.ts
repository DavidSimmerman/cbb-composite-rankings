import { NextRequest, NextResponse } from 'next/server';
import { PostgresService } from '@/lib/database';

const db = PostgresService.getInstance();

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { visitorId, sessionId, pageUrl, queryString, referrer, geoCity, geoState } = body;

		await db.query(
			`INSERT INTO page_views (visitor_id, session_id, page_url, referrer, query_string, geo_state, geo_city)
			 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
			[visitorId, sessionId, pageUrl, referrer || null, queryString || null, geoState || null, geoCity || null]
		);

		return NextResponse.json({ ok: true });
	} catch (err) {
		console.error('Tracking error:', err);
		return NextResponse.json({ error: 'Internal error' }, { status: 500 });
	}
}
