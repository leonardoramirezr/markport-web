/**
 * Fonts available to the browser and verification of the ones a CSS uses.
 * Port of `src/Core/SystemFonts.swift`.
 *
 * AppKit can simply list `NSFontManager.availableFontFamilies`. A web page
 * cannot, so availability is measured: a family that is not installed falls
 * back to a known face and renders at exactly the fallback's width. Chromium
 * browsers can additionally hand over the real list through the Local Font
 * Access API, which `queryLocalFamilies()` uses when the user asks for it.
 */

export const generic = new Set([
	'serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui',
	'ui-serif', 'ui-sans-serif', 'ui-monospace', 'ui-rounded', 'math', 'emoji',
	'fangsong', 'inherit', 'initial', 'unset', 'revert', '-apple-system',
	'blinkmacsystemfont', '-webkit-body'
]);

/** Families worth offering everywhere, checked one by one before being listed. */
const CANDIDATES = [
	'Arial', 'Arial Black', 'Arial Narrow', 'Avenir', 'Avenir Next', 'Baskerville',
	'Big Caslon', 'Bookman Old Style', 'Cambria', 'Candara', 'Century Gothic',
	'Charter', 'Comic Sans MS', 'Consolas', 'Constantia', 'Copperplate',
	'Corbel', 'Courier New', 'DejaVu Sans', 'DejaVu Sans Mono', 'DejaVu Serif',
	'Didot', 'Franklin Gothic Medium', 'Futura', 'Garamond', 'Geneva', 'Georgia',
	'Gill Sans', 'Helvetica', 'Helvetica Neue', 'Hoefler Text', 'Impact',
	'Iowan Old Style', 'JetBrains Mono', 'Lato', 'Liberation Mono',
	'Liberation Sans', 'Liberation Serif', 'Lucida Console', 'Lucida Grande',
	'Menlo', 'Merriweather', 'Monaco', 'Noto Sans', 'Noto Serif', 'Open Sans',
	'Optima', 'Palatino', 'Palatino Linotype', 'PT Sans', 'PT Serif', 'Roboto',
	'Roboto Mono', 'Rockwell', 'SF Mono', 'SF Pro Text', 'Segoe UI', 'Source Code Pro',
	'Source Sans Pro', 'Tahoma', 'Times New Roman', 'Trebuchet MS', 'Ubuntu',
	'Ubuntu Mono', 'Verdana', 'Zapfino'
];

const MONOSPACED = new Set([
	'consolas', 'courier new', 'dejavu sans mono', 'jetbrains mono', 'liberation mono',
	'lucida console', 'menlo', 'monaco', 'roboto mono', 'sf mono', 'source code pro',
	'ubuntu mono'
]);

const SERIF = new Set([
	'baskerville', 'big caslon', 'bookman old style', 'cambria', 'charter', 'constantia',
	'dejavu serif', 'didot', 'garamond', 'georgia', 'hoefler text', 'iowan old style',
	'liberation serif', 'merriweather', 'noto serif', 'palatino', 'palatino linotype',
	'pt serif', 'rockwell', 'times new roman'
]);

const PROBE = 'MMMWWWiiilll0Oo—@#%&áé 019';
const FALLBACKS = ['monospace', 'serif', 'sans-serif'];
const availability = new Map<string, boolean>();
let context: CanvasRenderingContext2D | null | undefined;

function measure(family: string, fallback: string): number {
	if (context === undefined) context = window.document.createElement('canvas').getContext('2d');
	if (!context) return 0;
	context.font = `72px ${family}, ${fallback}`;
	return context.measureText(PROBE).width;
}

export function normalize(name: string): string {
	return name.replace(/^[\s"';]+|[\s"';]+$/g, '').toLowerCase();
}

/** True when the family renders with its own metrics rather than a fallback's. */
export function isAvailable(name: string): boolean {
	const clean = normalize(name);
	if (clean.length === 0 || generic.has(clean)) return true;
	if (typeof window === 'undefined') return true;

	const cached = availability.get(clean);
	if (cached !== undefined) return cached;

	const quoted = `"${clean.replace(/"/g, '')}"`;
	let found = false;
	for (const fallback of FALLBACKS) {
		if (measure(quoted, fallback) !== measure('"__markport_missing__"', fallback)) {
			found = true;
			break;
		}
	}
	availability.set(clean, found);
	return found;
}

/** Installed families the picker can offer, sorted like Finder does. */
export function families(): string[] {
	return CANDIDATES.filter(isAvailable).sort((a, b) =>
		a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
	);
}

/**
 * The browser's real font list, when it exposes one. Requires a user gesture
 * and a permission prompt, so it is only called from the picker's button.
 */
export async function queryLocalFamilies(): Promise<string[] | null> {
	const query = (window as unknown as { queryLocalFonts?: () => Promise<{ family: string }[]> }).queryLocalFonts;
	if (typeof query !== 'function') return null;
	try {
		const fonts = await query.call(window);
		const unique = [...new Set(fonts.map((font) => font.family))];
		return unique.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
	} catch {
		return null;
	}
}

/** Families referenced in the CSS that are neither installed nor bundled via @font-face. */
export function missingFamilies(css: string): string[] {
	const { body, bundled } = stripFontFaces(css);
	const missing: string[] = [];
	const seen = new Set<string>();
	for (const declaration of declarationsNamed('font-family', body)) {
		for (const token of declaration.split(',')) {
			const name = token.replace(/^[\s"']+|[\s"']+$/g, '');
			if (name.length === 0 || name.startsWith('var(') || name.startsWith('--')) continue;
			const key = normalize(name);
			if (seen.has(key)) continue;
			seen.add(key);
			if (bundled.has(key) || isAvailable(name)) continue;
			missing.push(name);
		}
	}
	return missing;
}

/** Families declared with @font-face (files that ship with the style). */
function stripFontFaces(css: string): { body: string; bundled: Set<string> } {
	let body = '';
	let rest = css;
	const bundled = new Set<string>();
	for (;;) {
		const start = rest.toLowerCase().indexOf('@font-face');
		if (start < 0) break;
		body += rest.slice(0, start);
		const open = rest.indexOf('{', start + 10);
		if (open < 0) {
			rest = rest.slice(start + 10);
			break;
		}
		let depth = 0;
		let end = rest.length;
		for (let i = open; i < rest.length; i += 1) {
			if (rest[i] === '{') depth += 1;
			if (rest[i] === '}') {
				depth -= 1;
				if (depth === 0) {
					end = i + 1;
					break;
				}
			}
		}
		for (const declaration of declarationsNamed('font-family', rest.slice(open, end))) {
			bundled.add(normalize(declaration));
		}
		rest = rest.slice(end);
	}
	return { body: body + rest, bundled };
}

function declarationsNamed(property: string, css: string): string[] {
	const results: string[] = [];
	const pattern = new RegExp(property, 'gi');
	let match: RegExpExecArray | null;
	while ((match = pattern.exec(css)) !== null) {
		const after = css.slice(match.index + property.length);
		const colon = after.search(/\S/);
		if (colon < 0 || after[colon] !== ':') continue;
		const tail = after.slice(colon + 1);
		const terminator = tail.search(/[;}]/);
		results.push(terminator < 0 ? tail : tail.slice(0, terminator));
	}
	return results;
}

/** Declaration ready to paste into the CSS. */
export function declaration(family: string): string {
	const key = normalize(family);
	let fallback: string;
	if (MONOSPACED.has(key)) {
		fallback = 'Menlo, "Courier New", monospace';
	} else if (key.includes('serif') || SERIF.has(key)) {
		fallback = 'Georgia, "Times New Roman", serif';
	} else {
		fallback = '"Helvetica Neue", Helvetica, Arial, sans-serif';
	}
	return `font-family: "${family}", ${fallback};`;
}

/** The `format(…)` hint that matches a font file's extension. */
export function fontFormat(path: string): string {
	switch (path.split('.').pop()?.toLowerCase()) {
		case 'woff2': return 'woff2';
		case 'woff': return 'woff';
		case 'otf': return 'opentype';
		default: return 'truetype';
	}
}
