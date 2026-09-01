/**
 * Styles the app ships with, read from `src/lib/styles/<slug>/` at build time
 * (style.css + template.html + meta.json, the same layout as a saved style).
 * `load()` in app-state seeds IndexedDB with these the first time the app runs.
 */
export interface PredefinedStyle {
	name: string;
	css: string;
	html: string;
}

const cssFiles = import.meta.glob('./styles/*/style.css', {
	eager: true,
	query: '?raw',
	import: 'default'
}) as Record<string, string>;

const htmlFiles = import.meta.glob('./styles/*/template.html', {
	eager: true,
	query: '?raw',
	import: 'default'
}) as Record<string, string>;

const metaFiles = import.meta.glob('./styles/*/meta.json', {
	eager: true,
	import: 'default'
}) as Record<string, { name: string }>;

function slug(path: string): string {
	return path.split('/').at(-2) ?? path;
}

export const predefinedStyles: PredefinedStyle[] = Object.entries(cssFiles)
	.map(([path, css]) => {
		const id = slug(path);
		return {
			name: metaFiles[`./styles/${id}/meta.json`]?.name ?? id,
			css,
			html: htmlFiles[`./styles/${id}/template.html`] ?? ''
		};
	})
	.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
