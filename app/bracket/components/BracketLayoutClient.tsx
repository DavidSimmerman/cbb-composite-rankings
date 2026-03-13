'use client';

import type { BracketPageData } from '@/lib/rankings/profile';
import dynamic from 'next/dynamic';
import type { ReactNode } from 'react';

// Dynamic import to avoid SSR for the provider (uses localStorage)
const DynamicProvider = dynamic(
	() => import('../context/BracketContext').then(mod => ({ default: mod.BracketProvider })),
	{ ssr: false }
);

export default function BracketLayoutClient({ data, children }: { data: BracketPageData; children: ReactNode }) {
	return <DynamicProvider data={data}>{children}</DynamicProvider>;
}
