import { fetchModelPrediction, mapLimit, toStored } from '@/lib/games/model';
import { savePregamePrediction } from '@/lib/games/store';
import { NextRequest, NextResponse } from 'next/server';

interface Item {
	id: string;
	home: string;
	away: string;
	/** ISO tip-off time; the prediction is only saved while this is in the future */
	start: string;
}

// Model picks for scoreboard games that have no saved prediction yet. Each one made before
// tip-off is saved, so it can be shown as the pre-game prediction later.
export async function POST(request: NextRequest) {
	let items: Item[];
	try {
		const body = await request.json();
		items = Array.isArray(body?.games) ? body.games : [];
	} catch {
		return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
	}
	items = items.filter(i => i && typeof i.id === 'string' && i.home && i.away).slice(0, 200);

	const out: Record<string, { homeWinProb: number; spread: number | null }> = {};
	await mapLimit(items, 4, async item => {
		const p = await fetchModelPrediction(item.home, item.away);
		if (!p) return;
		const stored = toStored(item.id, p);
		out[item.id] = { homeWinProb: stored.homeWinProb, spread: stored.spread };
		const start = Date.parse(item.start);
		if (Number.isFinite(start) && start > Date.now()) await savePregamePrediction(stored);
	});

	return NextResponse.json({ predictions: out });
}
