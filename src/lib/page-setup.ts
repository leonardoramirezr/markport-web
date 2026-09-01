/**
 * Reads the user's CSS `@page` rule so the app knows the paper size and
 * margins the stylesheet declares — used for the page-shaped previews,
 * the sidebar thumbnails, and the print stylesheet handed to the browser.
 *
 * Port of `src/Core/PageSetup.swift` (NSPrintInfo is replaced by CSS,
 * since the browser's own print engine consumes `@page` directly).
 */

export interface PageSetup {
	/** Paper size in points (1pt = 1/72"). */
	width: number;
	height: number;
	top: number;
	right: number;
	bottom: number;
	left: number;
	landscape: boolean;
	label: string;
}

export const A4: PageSetup = {
	width: 595.28,
	height: 841.89,
	top: 56.7,
	right: 56.7,
	bottom: 56.7,
	left: 56.7,
	landscape: false,
	label: 'A4'
};

export const namedSizes: Record<string, [number, number]> = {
	a3: [841.89, 1190.55],
	a4: [595.28, 841.89],
	a5: [419.53, 595.28],
	letter: [612, 792],
	legal: [612, 1008],
	tabloid: [792, 1224],
	executive: [521.86, 756]
};

/** Content box in points, i.e. the paper minus its margins. */
export function contentSize(page: PageSetup): { width: number; height: number } {
	return {
		width: Math.max(72, page.width - page.left - page.right),
		height: Math.max(72, page.height - page.top - page.bottom)
	};
}

/** Reads the first `@page { ... }` block from the CSS. */
export function parse(css: string): PageSetup {
	const setup: PageSetup = { ...A4 };
	const block = firstAtPageBlock(css);
	if (block === null) return setup;

	const declarations: Record<string, string> = {};
	for (const chunk of block.split(';')) {
		const colon = chunk.indexOf(':');
		if (colon < 0) continue;
		const name = chunk.slice(0, colon).trim();
		const value = chunk.slice(colon + 1).trim();
		if (name.length === 0) continue;
		declarations[name.toLowerCase()] = value;
	}

	const size = declarations['size'];
	if (size !== undefined) {
		const tokens = size.toLowerCase().split(/\s+/).filter((t) => t.length > 0);
		const lengths: number[] = [];
		let named: [number, number] | null = null;
		let landscape = false;
		let label = '';
		for (const token of tokens) {
			if (token === 'landscape') {
				landscape = true;
				continue;
			}
			if (token === 'portrait') continue;
			const match = namedSizes[token];
			if (match !== undefined) {
				named = match;
				label = token[0].toUpperCase() + token.slice(1);
				continue;
			}
			const value = length(token);
			if (value !== null) lengths.push(value);
		}
		if (lengths.length >= 2) {
			setup.width = lengths[0];
			setup.height = lengths[1];
			setup.label = 'Custom';
		} else if (lengths.length === 1) {
			setup.width = lengths[0];
			setup.height = lengths[0];
			setup.label = 'Custom';
		} else if (named !== null) {
			setup.width = named[0];
			setup.height = named[1];
			setup.label = label;
		}
		if (landscape) {
			setup.landscape = true;
			const [w, h] = [setup.width, setup.height];
			setup.width = Math.max(w, h);
			setup.height = Math.min(w, h);
		}
	}

	const margin = declarations['margin'];
	if (margin !== undefined) {
		const values = margin
			.split(/\s+/)
			.filter((t) => t.length > 0)
			.map((t) => length(t.toLowerCase()))
			.filter((n): n is number => n !== null);
		if (values.length === 1) {
			setup.top = setup.right = setup.bottom = setup.left = values[0];
		} else if (values.length === 2) {
			setup.top = setup.bottom = values[0];
			setup.right = setup.left = values[1];
		} else if (values.length === 3) {
			setup.top = values[0];
			setup.right = setup.left = values[1];
			setup.bottom = values[2];
		} else if (values.length >= 4) {
			setup.top = values[0];
			setup.right = values[1];
			setup.bottom = values[2];
			setup.left = values[3];
		}
	}
	for (const side of ['top', 'right', 'bottom', 'left'] as const) {
		const raw = declarations[`margin-${side}`];
		if (raw === undefined) continue;
		const value = length(raw.toLowerCase());
		if (value !== null) setup[side] = value;
	}
	return setup;
}

function firstAtPageBlock(css: string): string | null {
	const start = css.toLowerCase().indexOf('@page');
	if (start < 0) return null;
	const open = css.indexOf('{', start + 5);
	if (open < 0) return null;
	let depth = 0;
	for (let i = open; i < css.length; i += 1) {
		if (css[i] === '{') depth += 1;
		if (css[i] === '}') {
			depth -= 1;
			if (depth === 0) return css.slice(open + 1, i);
		}
	}
	return null;
}

const units: [string, number][] = [
	['mm', 72 / 25.4],
	['cm', 72 / 2.54],
	['in', 72],
	['pt', 1],
	['px', 0.75],
	['pc', 12],
	['q', 72 / 101.6]
];

/** Converts a CSS length to points. */
export function length(token: string): number | null {
	const text = token.trim().toLowerCase();
	for (const [suffix, factor] of units) {
		if (!text.endsWith(suffix)) continue;
		const value = Number(text.slice(0, -suffix.length));
		if (!Number.isFinite(value) || text.slice(0, -suffix.length).trim() === '') return null;
		return value * factor;
	}
	const value = Number(text);
	// No unit -> CSS px.
	return text !== '' && Number.isFinite(value) ? value : null;
}

/** `A4 · 595×842 pt`, as shown under each style card. */
export function describe(page: PageSetup): string {
	return `${page.label} · ${Math.round(page.width)}×${Math.round(page.height)} pt`;
}
