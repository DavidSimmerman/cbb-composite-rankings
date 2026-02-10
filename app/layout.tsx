import { TooltipProvider } from '@/components/ui/tooltip';
import { getRankings } from '@/lib/rankings/rankings';
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import localFont from 'next/font/local';
import { cookies } from 'next/headers';
import TrackingBeacon from './components/TrackingBeacon';
import { RankingsProvider } from './context/RankingsContext';
import './globals.css';

const geistSans = Geist({
	variable: '--font-geist-sans',
	subsets: ['latin']
});

const geistMono = Geist_Mono({
	variable: '--font-geist-mono',
	subsets: ['latin']
});

const kanit = localFont({
	src: [
		{ path: './fonts/Kanit/Kanit-Regular.ttf', weight: '400', style: 'normal' },
		{ path: './fonts/Kanit/Kanit-Italic.ttf', weight: '400', style: 'italic' },
		{ path: './fonts/Kanit/Kanit-Medium.ttf', weight: '500', style: 'normal' },
		{ path: './fonts/Kanit/Kanit-MediumItalic.ttf', weight: '500', style: 'italic' },
		{ path: './fonts/Kanit/Kanit-SemiBold.ttf', weight: '600', style: 'normal' },
		{ path: './fonts/Kanit/Kanit-SemiBoldItalic.ttf', weight: '600', style: 'italic' },
		{ path: './fonts/Kanit/Kanit-Bold.ttf', weight: '700', style: 'normal' },
		{ path: './fonts/Kanit/Kanit-BoldItalic.ttf', weight: '700', style: 'italic' },
		{ path: './fonts/Kanit/Kanit-ExtraBold.ttf', weight: '800', style: 'normal' },
		{ path: './fonts/Kanit/Kanit-ExtraBoldItalic.ttf', weight: '800', style: 'italic' },
		{ path: './fonts/Kanit/Kanit-Black.ttf', weight: '900', style: 'normal' },
		{ path: './fonts/Kanit/Kanit-BlackItalic.ttf', weight: '900', style: 'italic' }
	],
	variable: '--font-kanit-face'
});

export const metadata: Metadata = {
	title: 'CBB Composite Rankings',
	description: 'Composite rankings of the 4 major CBB rankings systems.'
};

export default async function RootLayout({
	children
}: Readonly<{
	children: React.ReactNode;
}>) {
	const cookieStore = await cookies();
	const trackingCookie = cookieStore.get('__tracking')?.value;
	let trackingData: Record<string, string> | null = null;
	if (trackingCookie) {
		try {
			trackingData = JSON.parse(trackingCookie);
		} catch {}
	}

	const isNewSession = trackingCookie ? JSON.parse(trackingCookie).isNewSession : false;

	// This timeout is just to show off the loading animation cuz I think it looks really cool :)
	const [rankings] = await Promise.all([getRankings(), ...(isNewSession ? [new Promise(res => setTimeout(res, 1500))] : [])]);

	return (
		<html lang="en" className="dark">
			<body className={`${geistSans.variable} ${geistMono.variable} ${kanit.variable} antialiased`}>
				<RankingsProvider rankings={rankings}>
					<TooltipProvider>
						<div className="mx-2 md:mx-8 ">{children}</div>
					</TooltipProvider>
				</RankingsProvider>
				{trackingData && (
					<TrackingBeacon
						visitorId={trackingData.visitorId}
						sessionId={trackingData.sessionId}
						pageUrl={trackingData.pageUrl}
						queryString={trackingData.queryString}
						referrer={trackingData.referrer}
						geoCity={trackingData.geoCity}
						geoState={trackingData.geoState}
					/>
				)}
			</body>
		</html>
	);
}
