import { NextResponse } from 'next/server';
import { updateTeamData } from '@/lib/espn/espn-team-data';

export async function GET() {
	try {
		await updateTeamData();
		return NextResponse.json({ msg: 'successfully updated team data' });
	} catch (err: any) {
		return NextResponse.json({ error: err.toString() });
	}
}
