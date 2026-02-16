import { TooltipProvider } from '@/components/ui/tooltip';
import { Geist, Geist_Mono } from 'next/font/google';
import localFont from 'next/font/local';
import { cookies } from 'next/headers';
import RankingsLoader from './components/RankingsLoader';
import TrackingBeacon from './components/TrackingBeacon';
import { CookieProvider } from './context/CookieContext';
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

export const metadata = {
	title: 'CBB Composite Rankings',
	description: 'Composite college basketball rankings from KenPom, EvanMiya, BartTorvik, and NET',
	openGraph: {
		title: 'CBB Composite Rankings',
		description: 'Composite college basketball rankings from KenPom, EvanMiya, BartTorvik, and NET',
		images: [{ url: '/open-graph-image.png', width: 1200, height: 630 }],
		type: 'website'
	},
	twitter: {
		card: 'summary_large_image',
		title: 'CBB Composite Rankings',
		description: 'Composite college basketball rankings',
		images: [{ url: '/open-graph-image.png', width: 1200, height: 630 }]
	}
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

	return (
		<html lang="en" className="dark">
			<body className={`${geistSans.variable} ${geistMono.variable} ${kanit.variable} antialiased`}>
				<CookieProvider cookies={Object.fromEntries(cookieStore.getAll().map(c => [c.name, c.value]))}>
					<RankingsLoader isNewSession={trackingCookie ? JSON.parse(trackingCookie).isNewSession : false}>
						<TooltipProvider>
							<div className="">{children}</div>
						</TooltipProvider>
					</RankingsLoader>
				</CookieProvider>
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
