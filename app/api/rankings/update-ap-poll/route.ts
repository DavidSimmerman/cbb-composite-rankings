import { NextResponse } from 'next/server';
import { updateApPollRankings } from '@/lib/espn/ap-poll';

export async function GET() {
	try {
		await updateApPollRankings();
		return NextResponse.json({ msg: 'successfully updated AP poll rankings' });
	} catch (err: any) {
		return NextResponse.json({ error: err.toString() });
	}
}
