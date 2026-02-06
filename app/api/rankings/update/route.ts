import { NextResponse } from 'next/server';
import { updateRankings } from '@/lib/rankings/rankings';

export async function GET() {
	try {
		await updateRankings(['kenpom', 'evanmiya', 'barttorvik', 'net']);
		return NextResponse.json({ msg: 'successfully updated rankings' });
	} catch (err: any) {
		return NextResponse.json({ error: err.toString() });
	}
}
