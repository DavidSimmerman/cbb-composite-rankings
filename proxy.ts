import { NextRequest, NextResponse } from 'next/server';

export async function proxy(request: NextRequest) {
	const response = NextResponse.next();

	let visitorId = request.cookies.get('visitor_id')?.value;
	if (!visitorId) {
		visitorId = crypto.randomUUID();
		response.cookies.set('visitor_id', visitorId, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'lax',
			maxAge: 60 * 60 * 24 * 365 * 2,
			path: '/'
		});
	}

	const pageUrl = request.nextUrl.pathname;
	const queryString = request.nextUrl.search || '';

	const referer = request.headers.get('referer') || '';
	const host = request.headers.get('host') || '';
	const referrer = referer && !referer.includes(host) ? referer : '';

	const ip =
		request.headers.get('cf-connecting-ip') ||
		request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
		request.headers.get('x-real-ip') ||
		'';

	let geoCity = request.headers.get('cf-ipcity') || '';
	let geoState = request.headers.get('cf-region') || '';

	if (!geoCity && ip) {
		const rawIp = ip.replace(/^::ffff:/, '');
		const isPrivateIp =
			rawIp === '127.0.0.1' ||
			rawIp === '::1' ||
			rawIp.startsWith('192.168.') ||
			rawIp.startsWith('10.') ||
			rawIp.startsWith('172.');
		if (!isPrivateIp) {
			try {
				const controller = new AbortController();
				const timeout = setTimeout(() => controller.abort(), 350);
				const geoRes = await fetch(`http://ip-api.com/json/${rawIp}?fields=city,regionName`, {
					signal: controller.signal
				});
				clearTimeout(timeout);
				if (geoRes.ok) {
					const geoData = await geoRes.json();
					geoCity = geoData.city || '';
					geoState = geoData.regionName || '';
				}
			} catch {}
		}
	}

	let sessionId = request.cookies.get('session_id')?.value;
	const isNewSession = !sessionId;
	if (!sessionId) {
		sessionId = crypto.randomUUID();
	}

	response.cookies.set('session_id', sessionId, {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'lax',
		maxAge: 60 * 20,
		path: '/'
	});

	const trackingPayload = JSON.stringify({
		visitorId,
		sessionId,
		pageUrl,
		queryString,
		referrer,
		geoCity,
		geoState,
		isNewSession
	});

	response.cookies.set('__tracking', trackingPayload, {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'lax',
		maxAge: 10,
		path: '/'
	});

	return response;
}

export const config = {
	matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)']
};
