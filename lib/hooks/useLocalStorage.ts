'use client';

import { useEffect, useState } from 'react';

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

	const setValue = (value: T | ((val: T) => T)) => {
		const valueToStore = value instanceof Function ? value(storedValue) : value;
		setStoredValue(valueToStore);
		try {
			localStorage.setItem(key, JSON.stringify(valueToStore));
		} catch {}
	};

	return [storedValue, setValue];
}
