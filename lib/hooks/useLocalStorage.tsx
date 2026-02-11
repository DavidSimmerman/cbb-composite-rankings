'use client';

import { useCallback, useSyncExternalStore } from 'react';

const store = new Map<string, unknown>();
const listeners = new Map<string, Set<() => void>>();

function notify(key: string) {
	listeners.get(key)?.forEach(cb => cb());
}

function subscribe(key: string, callback: () => void) {
	if (!listeners.has(key)) listeners.set(key, new Set());
	listeners.get(key)!.add(callback);
	return () => {
		listeners.get(key)?.delete(callback);
	};
}

function getStoreValue<T>(key: string, initialValue: T): T {
	if (!store.has(key)) {
		try {
			const item = localStorage.getItem(key);
			store.set(key, item !== null ? JSON.parse(item) : initialValue);
		} catch {
			store.set(key, initialValue);
		}
	}
	return store.get(key) as T;
}

type SetValue<T> = (value: T | ((prev: T) => T)) => void;

export default function useLocalStorage<T>(key: string, initialValue: T): [T, SetValue<T>] {
	const value = useSyncExternalStore(
		useCallback((cb) => subscribe(key, cb), [key]),
		() => getStoreValue(key, initialValue),
		() => initialValue
	);

	const setValue: SetValue<T> = useCallback(
		(newValue) => {
			const prev = getStoreValue(key, initialValue);
			const resolved = newValue instanceof Function ? newValue(prev) : newValue;
			store.set(key, resolved);
			try {
				localStorage.setItem(key, JSON.stringify(resolved));
			} catch {}
			notify(key);
		},
		[key, initialValue]
	);

	return [value, setValue];
}
