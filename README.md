# Markport Web

A web app for exporting Markdown to PDF with custom CSS + HTML styles. No
backend: Svelte 5, Vite and SvelteKit, built as a static site and deployed to
GitHub Pages. Documents and styles never leave the browser.

Use it at **https://leonardoramirezr.github.io/markport-web/**.

## Develop

```bash
npm install
npm run dev      # http://localhost:5173
npm run check    # svelte-check
npm test         # unit tests for the Markdown and @page parsers
npm run build    # static site in build/
npm run preview  # serves that build
```

## Deploy

`.github/workflows/deploy.yml` builds on every push to `main` and publishes to
GitHub Pages. Enable it once, in **Settings → Pages → Build and deployment**, by
setting the source to **GitHub Actions**. Nothing else is needed: the workflow
reads the site's base path from `actions/configure-pages` and passes it to the
build as `BASE_PATH`, so the bundle works from `https://<user>.github.io/<repo>/`.

To reproduce that build locally:

```bash
BASE_PATH=/markport-web npm run build
```

## How it works

The first time you open it, it asks you to define a style. After that the main
screen appears: a style bar on the left (each one with a real thumbnail of the
document at page size) and the Markdown area on the right, with the
**Export PDF** button (⌘E / Ctrl+E).

### A style

A style is three files, stored here as one IndexedDB record:

```
style.css        stylesheet (defines @page, typography, margins…)
template.html    template with {{ title }} and {{ content }}
meta.json        name and date
fonts/           optional assets referenced by the CSS via relative path
```

Because a web page has no folder to compose the document inside, the sheet is
inlined into the rendered document and every relative `url("fonts/sans-400.woff2")`
is rewritten to the bundled file, so the CSS resolves exactly as it did on disk
and the fonts travel into the PDF.

If the template has no `{{ content }}` marker, the content is injected into the
`<body>`; if it links no stylesheet, one is added.

### Typography

- **System font…** lists the families this browser can actually render — a family
  that is not installed measures identically to a fallback, which is how the list
  is filtered. On Chromium, *List system fonts…* asks for the Local Font Access
  permission and shows the full system list instead.
- **Add font…** stores `.woff2/.woff/.otf/.ttf` files in the style and generates
  the corresponding `@font-face` rules.
- The editor warns if the CSS references a family that is neither available nor
  bundled.

### Page size

The CSS's `@page` rules: `size` (A3/A4/A5/Letter/Legal/Tabloid/Executive, explicit
measurements, `landscape`) and `margin` (mm, cm, in, pt, px) drive the page-shaped
previews and the sidebar thumbnails. The exported PDF gets them straight from the
stylesheet, which the browser's own print engine reads.

## Structure

```
src/lib/markdown.ts        Markdown -> HTML
src/lib/page-setup.ts      @page -> paper size and margins
src/lib/renderer.ts        template + content composition, asset resolution
src/lib/fonts.ts           availability detection, @font-face generation
src/lib/storage.ts         IndexedDB
src/lib/app-state.svelte.ts  runes state: styles, draft, export
src/lib/components/        onboarding, sidebar, editor, style editor, previews
tests/                     Markdown and @page parser tests
```

## Implementation notes

- **Custom Markdown** (`src/lib/markdown.ts`): headings, paragraphs, nested
  lists, blockquotes, rules, code blocks, GFM tables, emphasis, links, images
  and embedded HTML. No dependency.
- **PDF export**: the composed document is handed to the browser's print
  engine in an off-screen iframe. It honours `@page`, embeds the bundled
  fonts, and its *Save as PDF* destination produces the paginated file.
- **Previews**: the previews and sidebar thumbnails are live iframes sized in
  points and scaled with a CSS transform, so what you see is the real
  document rather than a picture of it.
- **Editor**: a plain `<textarea>` with a 0.28s debounce, so typing never
  re-renders the previews on every keystroke.
- **Storage**: IndexedDB. Rune state is proxied, so what reaches the database
  is always a `$state.snapshot`.

## License

MIT.
