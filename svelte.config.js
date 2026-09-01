import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

// On GitHub Pages a project site is served from /<repo>, so the build needs
// that prefix. The workflow exports BASE_PATH; local builds stay at the root.
const base = process.env.BASE_PATH ?? '';

/** @type {import('@sveltejs/kit').Config} */
export default {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter({
			pages: 'build',
			assets: 'build',
			// Pages has no server-side rewrite: 404.html catches deep links.
			fallback: '404.html',
			precompress: false,
			strict: true
		}),
		paths: { base, relative: false },
		appDir: 'app'
	}
};
