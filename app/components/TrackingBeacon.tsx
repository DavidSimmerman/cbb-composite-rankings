'use client';

import { useEffect } from 'react';

interface TrackingBeaconProps {
	visitorId: string;
	pageUrl: string;
	queryString: string;
	referrer: string;
	geoCity: string;
	geoState: string;
}

export default function TrackingBeacon({ visitorId, pageUrl, queryString, referrer, geoCity, geoState }: TrackingBeaconProps) {
	useEffect(() => {
		if (queryString) {
			window.history.replaceState({}, '', pageUrl);
		}

		const payload = JSON.stringify({ visitorId, pageUrl, queryString, referrer, geoCity, geoState });

		if (navigator.sendBeacon) {
			navigator.sendBeacon('/api/track', payload);
		} else {
			fetch('/api/track', {
				method: 'POST',
				body: payload,
				keepalive: true
			}).catch(() => {});
		}
	}, []);

	return null;
}
