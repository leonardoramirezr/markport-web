/**
 * Self-contained Markdown -> HTML converter (no external dependencies).
 * Covers the useful subset for documents: headings, paragraphs, nested
 * lists, blockquotes, rules, code blocks, GFM tables, and embedded HTML.
 *
 * Direct port of `src/Core/Markdown.swift` from the macOS app.
 */

/** Cursor shared by the block parsers, standing in for Swift's `inout Int`. */
interface Cursor {
	i: number;
}

const isLetter = (ch: string) => /\p{L}/u.test(ch);
const isNumber = (ch: string) => /\p{Nd}/u.test(ch);
const isAlnum = (ch: string) => isLetter(ch) || isNumber(ch);
const isWhitespace = (ch: string) => /\s/.test(ch);
const trim = (text: string) => text.replace(/^[ \t]+|[ \t]+$/g, '');

export function html(from: string): string {
	const normalized = from.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\t/g, '    ');
	let lines = normalized.split('\n');
	// Strips YAML front matter if present.
	if (trim(lines[0] ?? '') === '---') {
		const end = lines.slice(1).findIndex((line) => trim(line) === '---');
		if (end >= 0) lines = lines.slice(end + 2);
	}
	return blocks(lines, { i: 0 }, null);
}

/** First level-1 heading (or the first useful text) for the <title>. */
export function title(from: string): string {
	for (const raw of from.split(/\r\n|\r|\n/)) {
		const line = trim(raw);
		if (line.startsWith('# ')) {
			return trim(inline(line.slice(2)).replace(/<[^>]+>/g, ''));
		}
	}
	return 'Document';
}

// MARK: - Blocks

function blocks(lines: string[], cursor: Cursor, stopIndent: number | null): string {
	let out = '';
	while (cursor.i < lines.length) {
		const line = lines[cursor.i];
		if (trim(line).length === 0) {
			cursor.i += 1;
			continue;
		}
		if (stopIndent !== null && indentOf(line) < stopIndent) break;

		const h = heading(line);
		if (h !== null) {
			out += h;
			cursor.i += 1;
			continue;
		}
		if (isRule(line)) {
			out += '<hr>\n';
			cursor.i += 1;
			continue;
		}
		const fence = fenceMarker(line);
		if (fence !== null) {
			out += codeBlock(lines, cursor, fence);
			continue;
		}
		if (isQuote(line)) {
			out += quote(lines, cursor);
			continue;
		}
		if (listMarker(line) !== null) {
			out += list(lines, cursor);
			continue;
		}
		const rows = table(lines, cursor);
		if (rows !== null) {
			out += rows;
			continue;
		}
		if (isHTMLBlock(line)) {
			out += htmlBlock(lines, cursor);
			continue;
		}
		out += paragraph(lines, cursor, stopIndent);
	}
	return out;
}

function indentOf(line: string): number {
	let n = 0;
	while (n < line.length && line[n] === ' ') n += 1;
	return n;
}

function heading(line: string): string | null {
	const trimmed = trim(line);
	let level = 0;
	for (const ch of trimmed) {
		if (ch === '#') level += 1;
		else break;
	}
	if (level < 1 || level > 6) return null;
	const rest = trimmed.slice(level);
	if (rest.length > 0 && !rest.startsWith(' ')) return null;
	let text = trim(rest);
	while (text.endsWith('#')) text = trim(text.slice(0, -1));
	return `<h${level}>${inline(text)}</h${level}>\n`;
}

function isRule(line: string): boolean {
	const t = trim(line);
	if (t.length < 3) return false;
	const first = t[0];
	if (!'-*_'.includes(first)) return false;
	if (![...t].every((ch) => ch === first || ch === ' ')) return false;
	return [...t].filter((ch) => ch === first).length >= 3;
}

function fenceMarker(line: string): string | null {
	const t = trim(line);
	if (t.startsWith('```')) return '```';
	if (t.startsWith('~~~')) return '~~~';
	return null;
}

function codeBlock(lines: string[], cursor: Cursor, fence: string): string {
	const opener = trim(lines[cursor.i]);
	const language = trim(opener.slice(fence.length));
	cursor.i += 1;
	const body: string[] = [];
	while (cursor.i < lines.length) {
		if (trim(lines[cursor.i]).startsWith(fence)) {
			cursor.i += 1;
			break;
		}
		body.push(lines[cursor.i]);
		cursor.i += 1;
	}
	const cls = language.length === 0 ? '' : ` class="language-${escape(language)}"`;
	return `<pre><code${cls}>${escape(body.join('\n'))}</code></pre>\n`;
}

function isQuote(line: string): boolean {
	return trim(line).startsWith('>');
}

function quote(lines: string[], cursor: Cursor): string {
	const inner: string[] = [];
	while (cursor.i < lines.length) {
		const t = trim(lines[cursor.i]);
		if (t.startsWith('>')) {
			let rest = t.slice(1);
			if (rest.startsWith(' ')) rest = rest.slice(1);
			inner.push(rest);
			cursor.i += 1;
		} else if (t.length === 0) {
			break;
		} else {
			inner.push(t);
			cursor.i += 1;
		}
	}
	return '<blockquote>\n' + blocks(inner, { i: 0 }, null) + '</blockquote>\n';
}

// MARK: - Lists

interface Marker {
	indent: number;
	ordered: boolean;
	start: number;
	contentIndent: number;
	rest: string;
}

function listMarker(line: string): Marker | null {
	const ind = indentOf(line);
	const body = line.slice(ind);
	const first = body[0];
	if (first === undefined) return null;

	if ('-*+'.includes(first)) {
		const after = body.slice(1);
		if (after[0] !== ' ') return null;
		const rest = after.replace(/^ +/, '');
		if (rest.length === 0) return null;
		return { indent: ind, ordered: false, start: 1, contentIndent: ind + 2, rest };
	}
	if (isNumber(first)) {
		const digits = body.match(/^\d+/)?.[0] ?? '';
		const after = body.slice(digits.length);
		const sep = after[0];
		if (sep !== '.' && sep !== ')') return null;
		const tail = after.slice(1);
		if (tail[0] !== ' ') return null;
		const rest = tail.replace(/^ +/, '');
		if (rest.length === 0) return null;
		return {
			indent: ind,
			ordered: true,
			start: parseInt(digits, 10) || 1,
			contentIndent: ind + digits.length + 2,
			rest
		};
	}
	return null;
}

function list(lines: string[], cursor: Cursor): string {
	const first = listMarker(lines[cursor.i]);
	if (first === null) return '';
	const baseIndent = first.indent;
	const ordered = first.ordered;
	const items: string[][] = [];
	let loose = false;
	let pendingBlank = false;

	while (cursor.i < lines.length) {
		const line = lines[cursor.i];
		if (trim(line).length === 0) {
			// A blank line only continues the list if the next
			// block still belongs to it.
			let look = cursor.i + 1;
			while (look < lines.length && trim(lines[look]).length === 0) look += 1;
			if (look >= lines.length) {
				cursor.i = lines.length;
				break;
			}
			const next = lines[look];
			const marker = listMarker(next);
			const belongs =
				(marker !== null && marker.indent >= baseIndent && marker.ordered === ordered) ||
				indentOf(next) > baseIndent;
			if (!belongs) break;
			pendingBlank = true;
			cursor.i = look;
			continue;
		}

		const marker = listMarker(line);
		if (marker !== null && marker.indent <= baseIndent) {
			if (marker.ordered !== ordered) break;
			if (pendingBlank) {
				loose = true;
				pendingBlank = false;
			}
			items.push([marker.rest]);
			cursor.i += 1;
			continue;
		}
		if (items.length === 0) break;
		if (indentOf(line) > baseIndent || marker !== null) {
			if (pendingBlank) {
				loose = true;
				items[items.length - 1].push('');
				pendingBlank = false;
			}
			const strip = Math.min(indentOf(line), first.contentIndent);
			items[items.length - 1].push(line.slice(strip));
			cursor.i += 1;
			continue;
		}
		break;
	}

	let out = ordered ? (first.start === 1 ? '<ol>\n' : `<ol start="${first.start}">\n`) : '<ul>\n';
	for (const item of items) {
		let inner = blocks(item, { i: 0 }, null);
		if (!loose) inner = unwrapSingleParagraph(inner);
		out += '<li>' + inner.trim() + '</li>\n';
	}
	out += ordered ? '</ol>\n' : '</ul>\n';
	return out;
}

/** Compact lists: `<li><p>x</p></li>` -> `<li>x</li>`. */
function unwrapSingleParagraph(source: string): string {
	const trimmed = source.trim();
	if (!trimmed.startsWith('<p>')) return source;
	const close = trimmed.indexOf('</p>');
	if (close < 0) return source;
	const head = trimmed.slice(3, close);
	if (head.includes('<p>')) return source;
	return head + trimmed.slice(close + 4);
}

// MARK: - Tables

function table(lines: string[], cursor: Cursor): string | null {
	if (cursor.i + 1 >= lines.length) return null;
	const header = trim(lines[cursor.i]);
	const divider = trim(lines[cursor.i + 1]);
	if (!header.includes('|') || divider.length === 0) return null;
	const dividerCells = splitRow(divider);
	if (dividerCells.length === 0) return null;
	const valid = dividerCells.every((cell) => {
		const c = trim(cell);
		return c.length > 0 && [...c].every((ch) => ch === '-' || ch === ':') && c.includes('-');
	});
	if (!valid) return null;

	const aligns = dividerCells.map((cell) => {
		const c = trim(cell);
		if (c.startsWith(':') && c.endsWith(':')) return ' style="text-align:center"';
		if (c.endsWith(':')) return ' style="text-align:right"';
		if (c.startsWith(':')) return ' style="text-align:left"';
		return '';
	});

	let out = '<table>\n<thead>\n<tr>';
	splitRow(header).forEach((cell, n) => {
		out += `<th${aligns[n] ?? ''}>${inline(trim(cell))}</th>`;
	});
	out += '</tr>\n</thead>\n<tbody>\n';
	cursor.i += 2;
	while (cursor.i < lines.length) {
		const row = trim(lines[cursor.i]);
		if (!row.includes('|') || row.length === 0) break;
		out += '<tr>';
		splitRow(row).forEach((cell, n) => {
			out += `<td${aligns[n] ?? ''}>${inline(trim(cell))}</td>`;
		});
		out += '</tr>\n';
		cursor.i += 1;
	}
	return out + '</tbody>\n</table>\n';
}

function splitRow(row: string): string[] {
	let line = row;
	if (line.startsWith('|')) line = line.slice(1);
	if (line.endsWith('|') && !line.endsWith('\\|')) line = line.slice(0, -1);
	const cells: string[] = [];
	let current = '';
	let escaped = false;
	for (const ch of line) {
		if (escaped) {
			current += ch;
			escaped = false;
			continue;
		}
		if (ch === '\\') {
			escaped = true;
			current += ch;
			continue;
		}
		if (ch === '|') {
			cells.push(current);
			current = '';
			continue;
		}
		current += ch;
	}
	cells.push(current);
	return cells;
}

// MARK: - Embedded HTML and paragraphs

const blockTags = new Set([
	'div', 'section', 'article', 'header', 'footer', 'aside', 'nav', 'table',
	'figure', 'figcaption', 'blockquote', 'pre', 'ul', 'ol', 'dl', 'hr', 'p',
	'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'main', 'form', 'details', 'iframe', 'svg'
]);

function isHTMLBlock(line: string): boolean {
	const t = trim(line);
	if (!t.startsWith('<') || t.length <= 1) return false;
	if (t.startsWith('<!--')) return true;
	const name = t.slice(1).replace(/^\/+/, '').match(/^[\p{L}\p{Nd}]*/u)?.[0] ?? '';
	return blockTags.has(name.toLowerCase());
}

function htmlBlock(lines: string[], cursor: Cursor): string {
	const out: string[] = [];
	while (cursor.i < lines.length && trim(lines[cursor.i]).length > 0) {
		out.push(lines[cursor.i]);
		cursor.i += 1;
	}
	return out.join('\n') + '\n';
}

function paragraph(lines: string[], cursor: Cursor, stopIndent: number | null): string {
	const parts: string[] = [];
	while (cursor.i < lines.length) {
		const line = lines[cursor.i];
		if (trim(line).length === 0) break;
		if (stopIndent !== null && indentOf(line) < stopIndent) break;
		if (parts.length > 0) {
			if (
				heading(line) !== null ||
				isRule(line) ||
				fenceMarker(line) !== null ||
				isQuote(line) ||
				listMarker(line) !== null ||
				isHTMLBlock(line)
			)
				break;
		}
		let text = trim(line);
		if (line.endsWith('  ') || line.endsWith('\\')) {
			if (text.endsWith('\\')) text = text.slice(0, -1);
			text += '<br>';
		}
		parts.push(text);
		cursor.i += 1;
	}
	if (parts.length === 0) return '';
	return `<p>${inline(parts.join('\n'))}</p>\n`;
}

// MARK: - Inline

export function escape(text: string): string {
	let out = '';
	for (const ch of text) {
		switch (ch) {
			case '&': out += '&amp;'; break;
			case '<': out += '&lt;'; break;
			case '>': out += '&gt;'; break;
			case '"': out += '&quot;'; break;
			default: out += ch;
		}
	}
	return out;
}

/** In regular text we preserve entities that are already written (&nbsp; &amp; ...). */
function escapeText(text: string): string {
	const chars = [...text];
	let out = '';
	let k = 0;
	while (k < chars.length) {
		const ch = chars[k];
		if (ch === '&') {
			let j = k + 1;
			let name = '';
			while (j < chars.length && chars[j] !== ';' && name.length < 10 && (isAlnum(chars[j]) || chars[j] === '#')) {
				name += chars[j];
				j += 1;
			}
			if (j < chars.length && chars[j] === ';' && name.length > 0) {
				out += '&' + name + ';';
				k = j + 1;
				continue;
			}
			out += '&amp;';
		} else if (ch === '<') {
			out += '&lt;';
		} else if (ch === '>') {
			out += '&gt;';
		} else {
			out += ch;
		}
		k += 1;
	}
	return out;
}

export function inline(text: string): string {
	const chars = [...text];
	let out = '';
	let buffer = '';
	let i = 0;

	const flush = () => {
		if (buffer.length > 0) {
			out += escapeText(buffer);
			buffer = '';
		}
	};

	while (i < chars.length) {
		const ch = chars[i];

		// Escapes
		if (ch === '\\' && i + 1 < chars.length && '\\`*_{}[]()#+-.!|~<>'.includes(chars[i + 1])) {
			buffer += chars[i + 1];
			i += 2;
			continue;
		}

		// Inline code
		if (ch === '`') {
			let run = 0;
			while (i + run < chars.length && chars[i + run] === '`') run += 1;
			const close = findRun(chars, i + run, '`', run);
			if (close !== null) {
				flush();
				const code = trim(chars.slice(i + run, close).join(''));
				out += `<code>${escape(code)}</code>`;
				i = close + run;
				continue;
			}
		}

		// Image
		if (ch === '!' && chars[i + 1] === '[') {
			const link = parseLink(chars, i + 1);
			if (link !== null) {
				flush();
				out +=
					`<img src="${escape(link.url)}" alt="${escape(link.text)}"` +
					(link.title.length === 0 ? '' : ` title="${escape(link.title)}"`) +
					'>';
				i = link.end;
				continue;
			}
		}

		// Link
		if (ch === '[') {
			const link = parseLink(chars, i);
			if (link !== null) {
				flush();
				out +=
					`<a href="${escape(link.url)}"` +
					(link.title.length === 0 ? '' : ` title="${escape(link.title)}"`) +
					`>${inline(link.text)}</a>`;
				i = link.end;
				continue;
			}
		}

		// Autolink and inline HTML
		if (ch === '<') {
			const close = chars.indexOf('>', i);
			if (close >= 0) {
				const content = chars.slice(i + 1, close).join('');
				if (content.startsWith('http://') || content.startsWith('https://')) {
					flush();
					out += `<a href="${escape(content)}">${escape(content)}</a>`;
					i = close + 1;
					continue;
				}
				if (content.includes('@') && !content.includes(' ')) {
					flush();
					out += `<a href="mailto:${escape(content)}">${escape(content)}</a>`;
					i = close + 1;
					continue;
				}
				const name = content.replace(/^\/+/, '').match(/^[\p{L}\p{Nd}]*/u)?.[0] ?? '';
				if (name.length > 0 || content.startsWith('!--')) {
					flush();
					out += '<' + content + '>';
					i = close + 1;
					continue;
				}
			}
		}

		// Emphasis
		if (ch === '*' || ch === '_' || ch === '~') {
			let run = 0;
			while (i + run < chars.length && chars[i + run] === ch) run += 1;
			const usable = ch === '~' ? Math.min(run, 2) : Math.min(run, 3);
			const close = canOpen(chars, i, usable, ch) ? findCloser(chars, i + usable, ch, usable) : null;
			if (close !== null) {
				flush();
				const innerText = inline(chars.slice(i + usable, close).join(''));
				if (ch === '~') {
					out += usable === 2 ? `<del>${innerText}</del>` : `~${innerText}~`;
				} else if (usable === 3) {
					out += `<strong><em>${innerText}</em></strong>`;
				} else if (usable === 2) {
					out += `<strong>${innerText}</strong>`;
				} else {
					out += `<em>${innerText}</em>`;
				}
				i = close + usable;
				continue;
			}
		}

		buffer += ch;
		i += 1;
	}
	flush();
	return out;
}

function canOpen(chars: string[], i: number, run: number, char: string): boolean {
	const next = i + run < chars.length ? chars[i + run] : undefined;
	if (next === undefined || isWhitespace(next)) return false;
	if (char !== '_') return true;
	// `_` doesn't break inside words (snake_case).
	const prev = i > 0 ? chars[i - 1] : undefined;
	if (prev !== undefined && isAlnum(prev)) return false;
	return true;
}

function findRun(chars: string[], from: number, char: string, length: number): number | null {
	let i = from;
	while (i < chars.length) {
		if (chars[i] === char) {
			let run = 0;
			while (i + run < chars.length && chars[i + run] === char) run += 1;
			if (run === length) return i;
			i += run;
		} else {
			i += 1;
		}
	}
	return null;
}

function findCloser(chars: string[], from: number, char: string, length: number): number | null {
	let i = from;
	while (i < chars.length) {
		if (chars[i] === '\\') {
			i += 2;
			continue;
		}
		if (chars[i] === char) {
			let run = 0;
			while (i + run < chars.length && chars[i + run] === char) run += 1;
			const prev = i > 0 ? chars[i - 1] : undefined;
			const closes = run >= length && prev !== undefined && !isWhitespace(prev);
			if (closes) {
				if (char === '_') {
					const after = i + run < chars.length ? chars[i + run] : undefined;
					if (after !== undefined && isAlnum(after)) {
						i += run;
						continue;
					}
				}
				return i;
			}
			i += run;
		} else {
			i += 1;
		}
	}
	return null;
}

interface Link {
	text: string;
	url: string;
	title: string;
	end: number;
}

function parseLink(chars: string[], from: number): Link | null {
	if (chars[from] !== '[') return null;
	let depth = 0;
	let i = from;
	let close = -1;
	while (i < chars.length) {
		if (chars[i] === '\\') {
			i += 2;
			continue;
		}
		if (chars[i] === '[') depth += 1;
		if (chars[i] === ']') {
			depth -= 1;
			if (depth === 0) {
				close = i;
				break;
			}
		}
		i += 1;
	}
	if (close <= from || close + 1 >= chars.length || chars[close + 1] !== '(') return null;

	let j = close + 2;
	let depthParen = 1;
	let target = '';
	while (j < chars.length) {
		if (chars[j] === '\\' && j + 1 < chars.length) {
			target += chars[j + 1];
			j += 2;
			continue;
		}
		if (chars[j] === '(') depthParen += 1;
		if (chars[j] === ')') {
			depthParen -= 1;
			if (depthParen === 0) break;
		}
		target += chars[j];
		j += 1;
	}
	if (j >= chars.length) return null;

	let url = trim(target);
	let linkTitle = '';
	const quoted = url.indexOf(' "');
	if (quoted >= 0 && url.endsWith('"')) {
		linkTitle = url.slice(quoted + 2, -1);
		url = trim(url.slice(0, quoted));
	}
	if (url.startsWith('<') && url.endsWith('>')) url = url.slice(1, -1);
	return { text: chars.slice(from + 1, close).join(''), url, title: linkTitle, end: j + 1 };
}

export const Markdown = { html, title, inline, escape };
