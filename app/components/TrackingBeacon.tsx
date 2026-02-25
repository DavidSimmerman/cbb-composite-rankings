'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

interface TrackingBeaconProps {
	visitorId: string;
	sessionId: string;
	pageUrl: string;
	queryString: string;
	referrer: string;
	geoCity: string;
	geoState: string;
}

export default function TrackingBeacon({
	visitorId,
	sessionId,
	pageUrl,
	queryString,
	referrer,
	geoCity,
	geoState
}: TrackingBeaconProps) {
	const pathname = usePathname();
	const isFirstLoad = useRef(true);

	useEffect(() => {
		if (process.env.NODE_ENV === 'development') return;

		if (isFirstLoad.current) {
			isFirstLoad.current = false;

			if (queryString) {
				window.history.replaceState({}, '', pageUrl);
			}

			const payload = JSON.stringify({ visitorId, sessionId, pageUrl, queryString, referrer, geoCity, geoState });

			if (navigator.sendBeacon) {
				navigator.sendBeacon('/api/track', payload);
			} else {
				fetch('/api/track', {
					method: 'POST',
					body: payload,
					keepalive: true
				}).catch(() => {});
			}
			return;
		}

		const payload = JSON.stringify({
			visitorId,
			sessionId,
			pageUrl: pathname,
			queryString: '',
			referrer: '',
			geoCity,
			geoState
		});

		if (navigator.sendBeacon) {
			navigator.sendBeacon('/api/track', payload);
		} else {
			fetch('/api/track', {
				method: 'POST',
				body: payload,
				keepalive: true
			}).catch(() => {});
		}
	}, [pathname]);

	return null;
}
