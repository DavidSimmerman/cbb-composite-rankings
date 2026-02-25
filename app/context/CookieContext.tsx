'use client';

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from 'react';

const CookieContext = createContext<Record<string, string>>({});

export function CookieProvider({ cookies, children }: { cookies: Record<string, string>; children: React.ReactNode }) {
	return <CookieContext.Provider value={cookies}>{children}</CookieContext.Provider>;
}

const listeners = new Map<string, Set<() => void>>();
const store = new Map<string, string>();

function subscribe(key: string, listener: () => void) {
	if (!listeners.has(key)) listeners.set(key, new Set());
	listeners.get(key)!.add(listener);
	return () => {
		listeners.get(key)!.delete(listener);
	};
}

function setCookieValue(key: string, value: string, maxAge = 60 * 60 * 24 * 365) {
	store.set(key, value);
	document.cookie = `${key}=${encodeURIComponent(value)};path=/;max-age=${maxAge}`;
	listeners.get(key)?.forEach(l => l());
}

function parse<T>(raw: string, defaultValue: T): T {
	try {
		return JSON.parse(raw);
	} catch {
		return defaultValue;
	}
}

export function useCookie<T>(key: string, defaultValue: T, maxAge?: number): [T, (value: T) => void] {
	const serverCookies = useContext(CookieContext);
	const initial = serverCookies[key] ?? JSON.stringify(defaultValue);

	if (!store.has(key)) store.set(key, initial);

	const raw = useSyncExternalStore(
		cb => subscribe(key, cb),
		() => store.get(key) ?? initial,
		() => initial
	);

	const value = useMemo(() => parse<T>(raw, defaultValue), [raw]);
	const setValue = useCallback((v: T) => setCookieValue(key, JSON.stringify(v), maxAge), [key, maxAge]);

	return [value, setValue];
}
