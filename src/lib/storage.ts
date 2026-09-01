/**
 * Persistence layer. The macOS app keeps each style as a folder under
 * `~/Library/Application Support/Markport/Styles/`; on the web the same
 * records live in IndexedDB, which is the only store that can hold the
 * binary font files a style bundles.
 */
import type { DocStyle } from './types';

const DB_NAME = 'markport';
const DB_VERSION = 1;
const STYLES = 'styles';
const PREFS = 'prefs';

let handle: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
	if (handle) return handle;
	handle = new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION);
		request.onupgradeneeded = () => {
			const db = request.result;
			if (!db.objectStoreNames.contains(STYLES)) db.createObjectStore(STYLES, { keyPath: 'id' });
			if (!db.objectStoreNames.contains(PREFS)) db.createObjectStore(PREFS);
		};
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
	return handle;
}

function run<T>(store: string, mode: IDBTransactionMode, body: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
	return open().then(
		(db) =>
			new Promise<T>((resolve, reject) => {
				const tx = db.transaction(store, mode);
				const request = body(tx.objectStore(store));
				request.onsuccess = () => resolve(request.result);
				request.onerror = () => reject(request.error);
			})
	);
}

export async function loadStyles(): Promise<DocStyle[]> {
	const rows = await run<DocStyle[]>(STYLES, 'readonly', (s) => s.getAll() as IDBRequest<DocStyle[]>);
	return rows
		.map((row) => ({ ...row, assets: row.assets ?? {} }))
		.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
}

export function putStyle(style: DocStyle): Promise<unknown> {
	return run(STYLES, 'readwrite', (s) => s.put({ ...style }));
}

export function deleteStyle(id: string): Promise<unknown> {
	return run(STYLES, 'readwrite', (s) => s.delete(id));
}

export function readPref<T>(key: string): Promise<T | undefined> {
	return run<T | undefined>(PREFS, 'readonly', (s) => s.get(key) as IDBRequest<T | undefined>);
}

export function writePref(key: string, value: unknown): Promise<unknown> {
	return run(PREFS, 'readwrite', (s) => s.put(value, key));
}
