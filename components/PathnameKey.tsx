'use client';

import Loading from '@/app/loading';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

export default function NavigationLoader({ children }: { children: React.ReactNode }) {
	const pathname = usePathname();
	const [isNavigating, setIsNavigating] = useState(false);
	const prevPathname = useRef(pathname);

	useEffect(() => {
		if (pathname !== prevPathname.current) {
			prevPathname.current = pathname;
			setIsNavigating(false);
		}
	}, [pathname]);

	useEffect(() => {
		const handleClick = (e: MouseEvent) => {
			const anchor = (e.target as Element).closest('a[href]') as HTMLAnchorElement | null;
			if (!anchor || anchor.target || anchor.download) return;

			try {
				const url = new URL(anchor.href, window.location.href);
				if (url.origin !== window.location.origin) return;
				if (url.pathname === window.location.pathname) return;
				setIsNavigating(true);
			} catch {
				// ignore invalid URLs
			}
		};

		document.addEventListener('click', handleClick, true);
		return () => document.removeEventListener('click', handleClick, true);
	}, []);

	return (
		<>
			{isNavigating && (
				<div className="fixed inset-0 z-50 bg-black">
					<Loading />
				</div>
			)}
			{children}
		</>
	);
}
