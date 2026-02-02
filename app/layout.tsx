import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import localFont from 'next/font/local';
import { cookies } from 'next/headers';
import TrackingBeacon from './components/TrackingBeacon';
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

	return (
		<html lang="en" className="dark">
			<body className={`${geistSans.variable} ${geistMono.variable} ${kanit.variable} antialiased`}>
				{children}
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
