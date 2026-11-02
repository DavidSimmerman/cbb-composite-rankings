import { GoogleAnalytics } from '@next/third-parties/google';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Geist, Geist_Mono, Inter, Space_Grotesk } from 'next/font/google';
import localFont from 'next/font/local';
import { cookies } from 'next/headers';
import PathnameKey from '@/components/PathnameKey';
import { CookieProvider } from './context/CookieContext';
import './globals.css';

const geistSans = Geist({
	variable: '--font-geist-sans',
	subsets: ['latin']
});

const inter = Inter({
	variable: '--font-inter',
	subsets: ['latin']
});

// UI font of the Aurora redesign (header, rankings)
const spaceGrotesk = Space_Grotesk({
	variable: '--font-space-grotesk',
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
	metadataBase: new URL('https://cbbcomposite.com'),
	title: {
		default: 'CBB Composite Rankings — KenPom, EvanMiya, BartTorvik & NET Combined',
		template: '%s | CBB Composite Rankings',
	},
	description:
		'Composite NCAA college basketball rankings combining KenPom, Evan Miya, Bart Torvik, and NET into one unified ranking. AI-powered bracket predictions, March Madness tournament analysis, and game predictions.',
	keywords: [
		'kenpom',
		'kenpom rankings',
		'evan miya',
		'evanmiya',
		'bart torvik',
		'barttorvik',
		'NET rankings',
		'college basketball rankings',
		'ncaa basketball',
		'march madness',
		'ncaa tournament',
		'bracket predictor',
		'bracket ai',
		'bracket suggestions',
		'tournament bracket',
		'college basketball stats',
	],
	openGraph: {
		title: 'CBB Composite Rankings — KenPom, EvanMiya, BartTorvik & NET Combined',
		description:
			'Composite NCAA college basketball rankings combining KenPom, Evan Miya, Bart Torvik, and NET. AI bracket predictions and March Madness analysis.',
		images: [{ url: '/open-graph-image.png', width: 1200, height: 630 }],
		// 5s logo animation (scripts/brand/render-brand-assets.mts); platforms that play og:video show it
		videos: [{ url: 'https://cbbcomposite.com/og-video.mp4', width: 1200, height: 630, type: 'video/mp4' }],
		type: 'website',
		siteName: 'CBB Composite Rankings',
	},
	twitter: {
		card: 'summary_large_image',
		title: 'CBB Composite Rankings — KenPom, EvanMiya, BartTorvik & NET',
		description:
			'Composite NCAA basketball rankings combining KenPom, Evan Miya, Bart Torvik, and NET. AI bracket predictions and tournament analysis.',
		images: [{ url: '/open-graph-image.png', width: 1200, height: 630 }],
	},
};

export default async function RootLayout({
	children
}: Readonly<{
	children: React.ReactNode;
}>) {
	const cookieStore = await cookies();

	return (
		<html lang="en" className="dark">
			<body className={`${geistSans.variable} ${geistMono.variable} ${kanit.variable} ${inter.variable} ${spaceGrotesk.variable} antialiased`}>
				<script
					type="application/ld+json"
					dangerouslySetInnerHTML={{
						__html: JSON.stringify({
							'@context': 'https://schema.org',
							'@type': 'WebSite',
							name: 'CBB Composite Rankings',
							url: 'https://cbbcomposite.com',
							description:
								'Composite NCAA college basketball rankings combining KenPom, EvanMiya, BartTorvik, and NET ratings. AI-powered bracket predictions and March Madness analysis.',
							potentialAction: {
								'@type': 'SearchAction',
								target: 'https://cbbcomposite.com/{team_key}',
								'query-input': 'required name=team_key',
							},
						}),
					}}
				/>
				<CookieProvider cookies={Object.fromEntries(cookieStore.getAll().map(c => [c.name, c.value]))}>
					<TooltipProvider>
						<PathnameKey>{children}</PathnameKey>
					</TooltipProvider>
				</CookieProvider>
				{process.env.NEXT_PUBLIC_GA_ID && <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />}
			</body>
		</html>
	);
}
