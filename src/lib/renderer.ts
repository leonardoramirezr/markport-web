/**
 * Composition engine. Assembles the style's HTML template with the HTML
 * derived from the Markdown, exactly like `src/Core/Renderer.swift`.
 *
 * The macOS app writes the document inside the style folder so relative
 * paths (`style.css`, `fonts/…`) resolve on disk. A browser has no such
 * folder, so instead the sheet is inlined and every relative `url(…)` is
 * rewritten to a blob URL for the matching bundled asset.
 */
import * as Markdown from './markdown';
import { contentSize, parse, type PageSetup } from './page-setup';
import { templateHTML } from './defaults';
import type { DocStyle } from './types';

const CONTENT_TOKENS = ['{{ content }}', '{{content}}', '{{ contenido }}', '{{contenido}}'];
const TITLE_TOKENS = ['{{ title }}', '{{title}}', '{{ titulo }}', '{{titulo}}'];

/** Assembles the style's HTML template with the HTML derived from the Markdown. */
export function document(markdown: string, style: DocStyle, extraHead = ''): string {
	const content = Markdown.html(markdown);
	const title = Markdown.title(markdown);
	let html = style.html.length === 0 ? templateHTML : style.html;

	let injected = false;
	for (const token of CONTENT_TOKENS) {
		if (!html.includes(token)) continue;
		html = html.split(token).join(content);
		injected = true;
	}
	for (const token of TITLE_TOKENS) {
		html = html.split(token).join(Markdown.escape(title));
	}
	if (!injected) {
		// Template without a marker: inject the content inside the body.
		const body = /<\/body>/i.exec(html);
		const article = `<article class="doc">\n${content}\n</article>`;
		if (body) {
			html = html.slice(0, body.index) + `${article}\n</body>` + html.slice(body.index + body[0].length);
		} else {
			html += `\n${article}\n`;
		}
	}

	// WebKit's print engine drops CSS background colors by default (an
	// ink-saving convention); without this, `html`/`body` backgrounds
	// that render fine on screen turn white in the exported PDF.
	let head =
		'<style id="markport-print-color">html,body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}</style>\n' +
		extraHead;
	const lower = html.toLowerCase();
	if (!lower.includes('rel="stylesheet"') && !lower.includes("rel='stylesheet'") && !lower.includes('<style')) {
		head = '<link rel="stylesheet" href="style.css">\n' + head;
	}
	const headEnd = /<\/head>/i.exec(html);
	if (headEnd) {
		html = html.slice(0, headEnd.index) + head + '\n</head>' + html.slice(headEnd.index + headEnd[0].length);
	} else {
		html = head + '\n' + html;
	}
	return html;
}

/** Screen-only CSS that simulates the `@page` margins in the preview. */
export function previewHead(page: PageSetup): string {
	return `<style id="markport-preview">
@media screen {
  html { background: #fff; }
  body { padding: ${page.top}pt ${page.right}pt ${page.bottom}pt ${page.left}pt; }
}
</style>`;
}

/**
 * Object URLs for a style's bundled assets, created on demand and revoked
 * together. One bag per rendered document keeps the browser from leaking a
 * URL for every keystroke in the editor.
 */
export class AssetURLs {
	private urls: string[] = [];

	constructor(private style: DocStyle) {}

	/** Resolves a relative path (`fonts/x.woff2`) to a usable URL, if bundled. */
	resolve(path: string): string | null {
		const clean = path.replace(/^\.\//, '');
		const asset = this.style.assets[clean];
		if (!asset) return null;
		const url = URL.createObjectURL(new Blob([asset.data], { type: asset.type || 'application/octet-stream' }));
		this.urls.push(url);
		return url;
	}

	release(): void {
		for (const url of this.urls) URL.revokeObjectURL(url);
		this.urls = [];
	}
}

/** Rewrites `url("fonts/…")` references to the bundled asset's blob URL. */
function inlineAssetURLs(css: string, assets: AssetURLs): string {
	return css.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g, (match, quote: string, path: string) => {
		const target = path.trim();
		if (/^(https?:|data:|blob:|#|\/)/i.test(target)) return match;
		const resolved = assets.resolve(target);
		return resolved === null ? match : `url("${resolved}")`;
	});
}

/**
 * A complete, self-contained document ready to drop into an iframe:
 * the stylesheet link is replaced by the style's CSS with its assets
 * resolved, so nothing depends on files sitting next to the page.
 */
export function compose(
	markdown: string,
	style: DocStyle,
	options: { preview?: boolean } = {}
): { html: string; assets: AssetURLs } {
	const page = parse(style.css);
	const assets = new AssetURLs(style);
	const head = options.preview ? previewHead(page) : '';
	let html = document(markdown, style, head);

	const sheet = `<style id="markport-style">\n${inlineAssetURLs(style.css, assets)}\n</style>`;
	const link = /<link[^>]+rel=['"]?stylesheet['"]?[^>]*>/i;
	if (link.test(html)) {
		html = html.replace(link, sheet);
	} else {
		const headEnd = /<\/head>/i.exec(html);
		html = headEnd
			? html.slice(0, headEnd.index) + sheet + '\n</head>' + html.slice(headEnd.index + headEnd[0].length)
			: sheet + '\n' + html;
	}
	// Any remaining relative asset reference (an <img src="…">, a second sheet).
	html = html.replace(/(src|href)=(['"])([^'"]+)\2/g, (match, attr: string, quote: string, value: string) => {
		if (/^(https?:|data:|blob:|mailto:|#|\/)/i.test(value)) return match;
		const resolved = assets.resolve(value);
		return resolved === null ? match : `${attr}=${quote}${resolved}${quote}`;
	});
	return { html, assets };
}

/**
 * Print-ready document. The browser's print engine reads `@page` straight
 * from the stylesheet, which is what gives the PDF the paper size and
 * margins the CSS declares — the job `PageSetup.printInfo` did natively.
 */
export function composeForPrint(markdown: string, style: DocStyle): { html: string; assets: AssetURLs } {
	const page = parse(style.css);
	const box = contentSize(page);
	const composed = compose(markdown, style);
	// Some engines lay a printed iframe out at the viewport width; pinning the
	// screen width to the page's content box keeps the preview and the PDF equal.
	const guard = `<style id="markport-print">@media screen { body { width: ${box.width}pt; } }</style>`;
	return { ...composed, html: composed.html.replace(/<\/head>/i, `${guard}\n</head>`) };
}
