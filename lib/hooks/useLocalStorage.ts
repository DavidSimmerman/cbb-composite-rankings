'use client';

import { useCallback, useEffect, useState } from 'react';

const LOCAL_STORAGE_EVENT = 'local-storage-update';

export default function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
	const [storedValue, setStoredValue] = useState<T>(initialValue);

	useEffect(() => {
		try {
			const item = localStorage.getItem(key);
			if (item !== null) {
				setStoredValue(JSON.parse(item));
			}
		} catch {}
	}, [key]);

	useEffect(() => {
		const handler = (e: Event) => {
			const { detail } = e as CustomEvent<{ key: string }>;
			if (detail.key === key) {
				try {
					const item = localStorage.getItem(key);
					if (item !== null) {
						setStoredValue(JSON.parse(item));
					}
				} catch {}
			}
		};

		window.addEventListener(LOCAL_STORAGE_EVENT, handler);
		return () => window.removeEventListener(LOCAL_STORAGE_EVENT, handler);
	}, [key]);

	const setValue = useCallback(
		(value: T | ((val: T) => T)) => {
			setStoredValue(prev => {
				const valueToStore = value instanceof Function ? value(prev) : value;
				try {
					localStorage.setItem(key, JSON.stringify(valueToStore));
				} catch {}
				queueMicrotask(() => window.dispatchEvent(new CustomEvent(LOCAL_STORAGE_EVENT, { detail: { key } })));
				return valueToStore;
			});
		},
		[key]
	);

	return [storedValue, setValue];
}
