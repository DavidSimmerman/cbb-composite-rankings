import { NextResponse } from 'next/server';
import { updateEspnStats } from '@/lib/espn/espn-stats';

export async function GET() {
	try {
		await updateEspnStats();
		return NextResponse.json({ msg: 'successfully updated espn stats' });
	} catch (err: any) {
		return NextResponse.json({ error: err.toString() });
	}
}
