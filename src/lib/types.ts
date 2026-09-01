/**
 * A style = the browser equivalent of the macOS app's style folder:
 * `style.css`, `template.html`, `meta.json` and the relative resources
 * (e.g. `fonts/`) that the CSS references.
 */
export interface DocStyle {
	id: string;
	name: string;
	css: string;
	html: string;
	updatedAt: number;
	/** Relative path (`fonts/sans-400.woff2`) -> file contents. */
	assets: Record<string, StyleAsset>;
}

export interface StyleAsset {
	name: string;
	type: string;
	data: ArrayBuffer;
}
