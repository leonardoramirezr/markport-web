import { describe, expect, it } from 'vitest';
import * as Markdown from '../src/lib/markdown';

describe('blocks', () => {
	it('renders headings and strips closing hashes', () => {
		expect(Markdown.html('# Title')).toBe('<h1>Title</h1>\n');
		expect(Markdown.html('### Deep ###')).toBe('<h3>Deep</h3>\n');
		expect(Markdown.html('#NotAHeading')).toBe('<p>#NotAHeading</p>\n');
	});

	it('joins wrapped lines into one paragraph', () => {
		expect(Markdown.html('one\ntwo\n\nthree')).toBe('<p>one\ntwo</p>\n<p>three</p>\n');
	});

	it('keeps a hard break for a trailing backslash or two spaces', () => {
		expect(Markdown.html('one\\\ntwo')).toBe('<p>one<br>\ntwo</p>\n');
	});

	it('renders rules, quotes and fenced code', () => {
		expect(Markdown.html('---')).toBe('<hr>\n');
		expect(Markdown.html('> quoted')).toBe('<blockquote>\n<p>quoted</p>\n</blockquote>\n');
		expect(Markdown.html('```js\nlet a = 1 < 2;\n```')).toBe(
			'<pre><code class="language-js">let a = 1 &lt; 2;</code></pre>\n'
		);
	});

	it('drops YAML front matter', () => {
		expect(Markdown.html('---\ntitle: x\n---\n# Hi')).toBe('<h1>Hi</h1>\n');
	});

	it('nests lists and keeps tight items compact', () => {
		expect(Markdown.html('- one\n- two')).toBe('<ul>\n<li>one</li>\n<li>two</li>\n</ul>\n');
		expect(Markdown.html('- one\n  - nested')).toBe(
			'<ul>\n<li>one\n<ul>\n<li>nested</li>\n</ul></li>\n</ul>\n'
		);
	});

	it('honours the start of an ordered list', () => {
		expect(Markdown.html('3. three')).toBe('<ol start="3">\n<li>three</li>\n</ol>\n');
	});

	it('renders GFM tables with alignment', () => {
		const table = Markdown.html('| a | b |\n| :-- | --: |\n| 1 | 2 |');
		expect(table).toContain('<th style="text-align:left">a</th>');
		expect(table).toContain('<td style="text-align:right">2</td>');
	});

	it('leaves a line that is not a divider as a paragraph', () => {
		expect(Markdown.html('| a | b |\nplain')).toBe('<p>| a | b |\nplain</p>\n');
	});

	it('passes embedded HTML blocks through untouched', () => {
		expect(Markdown.html('<div class="x">\nraw\n</div>')).toBe('<div class="x">\nraw\n</div>\n');
	});
});

describe('inline', () => {
	it('handles emphasis, strong and strikethrough', () => {
		expect(Markdown.inline('*a* **b** ***c*** ~~d~~')).toBe(
			'<em>a</em> <strong>b</strong> <strong><em>c</em></strong> <del>d</del>'
		);
	});

	it('does not break snake_case words', () => {
		expect(Markdown.inline('some_long_name')).toBe('some_long_name');
	});

	it('escapes text but preserves written entities', () => {
		expect(Markdown.inline('a & b &amp; c < d')).toBe('a &amp; b &amp; c &lt; d');
	});

	it('renders links, images and autolinks', () => {
		expect(Markdown.inline('[t](https://x.dev "hi")')).toBe('<a href="https://x.dev" title="hi">t</a>');
		expect(Markdown.inline('![alt](a.png)')).toBe('<img src="a.png" alt="alt">');
		expect(Markdown.inline('<https://x.dev>')).toBe('<a href="https://x.dev">https://x.dev</a>');
		expect(Markdown.inline('<ada@example.com>')).toBe('<a href="mailto:ada@example.com">ada@example.com</a>');
	});

	it('honours backslash escapes and inline code', () => {
		expect(Markdown.inline('\\*not em\\*')).toBe('*not em*');
		expect(Markdown.inline('`a < b`')).toBe('<code>a &lt; b</code>');
	});
});

describe('title', () => {
	it('takes the first level-1 heading', () => {
		expect(Markdown.title('intro\n\n# Ada **Lovelace**')).toBe('Ada Lovelace');
	});

	it('falls back to Document', () => {
		expect(Markdown.title('## only h2')).toBe('Document');
	});
});
