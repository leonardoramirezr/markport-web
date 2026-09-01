<script lang="ts">
	/**
	 * The style sheet editor: CSS and HTML template side by side with a live
	 * preview of the real document. Port of `StyleEditorView`.
	 */
	import CodeEditor from './CodeEditor.svelte';
	import FontPicker from './FontPicker.svelte';
	import Icon from './Icon.svelte';
	import Modal from './Modal.svelte';
	import PagePreview from './PagePreview.svelte';
	import { app, readAsset } from '$lib/app-state.svelte';
	import { sampleMarkdown } from '$lib/defaults';
	import { declaration, fontFormat, missingFamilies } from '$lib/fonts';
	import { describe, parse } from '$lib/page-setup';
	import type { DocStyle } from '$lib/types';

	let { style, isNew, onclose }: { style: DocStyle; isNew: boolean; onclose: () => void } = $props();

	// The sheet edits a copy taken when it opens; Cancel simply throws it away.
	// svelte-ignore state_referenced_locally
	let draft = $state<DocStyle>({ ...style, assets: { ...style.assets } });
	let tab = $state<'css' | 'html'>('css');
	let showingFonts = $state(false);
	let box = $state({ width: 0, height: 0 });

	let cssEditor = $state<ReturnType<typeof CodeEditor> | null>(null);
	let htmlEditor = $state<ReturnType<typeof CodeEditor> | null>(null);
	let fileInput = $state<HTMLInputElement | null>(null);
	let fontInput = $state<HTMLInputElement | null>(null);

	const page = $derived(parse(draft.css));
	const missing = $derived(missingFamilies(draft.css));
	const previewMarkdown = $derived(app.markdown.trim().length === 0 ? sampleMarkdown : app.markdown);
	const previewWidth = $derived(Math.max(120, box.width - 32));

	/** Pulls whatever is in the text areas right now into the draft. */
	function syncFromEditors() {
		const css = cssEditor?.text();
		const html = htmlEditor?.text();
		if (css !== undefined) draft.css = css;
		if (html !== undefined) draft.html = html;
	}

	async function save() {
		syncFromEditors();
		const name = draft.name.trim();
		try {
			const saved = await app.save({ ...draft, name: name.length > 0 ? name : app.uniqueName('Style') });
			app.select(saved.id);
			onclose();
		} catch (error) {
			// The sheet stays open so nothing typed here is lost.
			app.notify(`Could not save the style: ${error instanceof Error ? error.message : error}`, true);
		}
	}

	function pickFont(family: string) {
		showingFonts = false;
		tab = 'css';
		cssEditor?.insert('\n    ' + declaration(family) + '\n');
		syncFromEditors();
	}

	/** Upload CSS or HTML: replaces the matching tab, like the macOS open panel. */
	async function onUpload(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (!file) return;
		const text = await file.text();
		if (file.name.toLowerCase().endsWith('.css')) {
			tab = 'css';
			draft.css = text;
			cssEditor?.setText(text);
		} else {
			tab = 'html';
			draft.html = text;
			htmlEditor?.setText(text);
		}
	}

	/** Adds font files to the style and writes the matching @font-face rules. */
	async function onAddFonts(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const files = [...(input.files ?? [])];
		input.value = '';
		if (files.length === 0) return;

		const added: string[] = [];
		for (const file of files) {
			const [path, asset] = await readAsset(file);
			draft.assets[path] = asset;
			added.push(path);
		}
		const family = added[0].split('/').pop()?.replace(/\.[^.]+$/, '') ?? 'Custom';
		const faces = added
			.map(
				(path) => `@font-face {
    font-family: "${family}";
    src: url("${path}") format("${fontFormat(path)}");
}`
			)
			.join('\n\n');
		tab = 'css';
		cssEditor?.insert('\n' + faces + '\n');
		syncFromEditors();
	}

	function removeAsset(path: string) {
		delete draft.assets[path];
		draft.assets = { ...draft.assets };
	}
</script>

<Modal width={1000} height={660} label={isNew ? 'New style' : `Edit style ${style.name}`} onclose={onclose}>
	<header>
		<input class="name" bind:value={draft.name} aria-label="Style name" placeholder="Style name" />

		<div class="segmented" role="tablist" aria-label="Style files">
			{#each ['css', 'html'] as const as value (value)}
				<button
					type="button"
					role="tab"
					aria-selected={tab === value}
					class:active={tab === value}
					onclick={() => {
						syncFromEditors();
						tab = value;
					}}
				>
					{value.toUpperCase()}
				</button>
			{/each}
		</div>

		<div class="spacer"></div>
		<button type="button" class="quiet" onclick={onclose}>Cancel</button>
		<button type="button" class="btn" onclick={save}>Save</button>
	</header>
	<div class="divider h"></div>

	<div class="columns">
		<div class="editor">
			<div class="panes">
				<div class="pane" class:hidden={tab !== 'css'}>
					<CodeEditor
						bind:this={cssEditor}
						label="Style sheet"
						initialText={draft.css}
						onchange={(text) => (draft.css = text)}
					/>
				</div>
				<div class="pane" class:hidden={tab !== 'html'}>
					<CodeEditor
						bind:this={htmlEditor}
						label="HTML template"
						initialText={draft.html}
						onchange={(text) => (draft.html = text)}
					/>
				</div>
			</div>

			<div class="divider h"></div>
			<footer>
				{#if missing.length > 0}
					<p class="warning">
						<span class="glyph"><Icon name="warning" size={11} /></span>
						Not available in this browser: {missing.join(', ')}. The PDF will use a substitute font.
					</p>
				{/if}
				{#if Object.keys(draft.assets).length > 0}
					<p class="assets">
						{#each Object.keys(draft.assets) as path (path)}
							<span class="chip">
								{path}
								<button type="button" aria-label="Remove {path}" onclick={() => removeAsset(path)}>
									<Icon name="xmark" size={9} strokeWidth={2} />
								</button>
							</span>
						{/each}
					</p>
				{/if}
				<div class="tools">
					<button
						type="button"
						class="quiet"
						onclick={() => {
							syncFromEditors();
							showingFonts = true;
						}}
					>
						<Icon name="text" size={12} />
						System font...
					</button>
					<button type="button" class="quiet" onclick={() => fileInput?.click()}>Upload file...</button>
					<button type="button" class="quiet" onclick={() => fontInput?.click()}>Add font...</button>
					<span class="page">{describe(page)}</span>
				</div>
			</footer>
		</div>

		<div class="divider v"></div>

		<div class="preview">
			<div class="preview-head">
				<h3>Preview</h3>
				<button type="button" class="icon-button" aria-label="Refresh preview" onclick={syncFromEditors}>
					<Icon name="refresh" size={12} />
				</button>
			</div>
			<div class="stage" bind:clientWidth={box.width} bind:clientHeight={box.height}>
				{#if box.width > 0}
					<PagePreview
						style={draft}
						markdown={previewMarkdown}
						width={previewWidth}
						height={box.height - 16}
						mode="fill"
					/>
				{/if}
			</div>
		</div>
	</div>
</Modal>

<input bind:this={fileInput} type="file" accept=".css,.html,.htm,text/css,text/html" hidden onchange={onUpload} />
<input
	bind:this={fontInput}
	type="file"
	accept=".woff2,.woff,.otf,.ttf,font/woff2,font/woff,font/otf,font/ttf"
	multiple
	hidden
	onchange={onAddFonts}
/>

{#if showingFonts}
	<FontPicker onpick={pickFont} onclose={() => (showingFonts = false)} />
{/if}

<style>
	header {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px 18px;
	}

	.name {
		width: 240px;
		border: 0;
		border-radius: 6px;
		padding: 4px 6px;
		background: transparent;
		font-size: 15px;
		font-weight: 600;
	}

	.name:hover {
		background: var(--tint);
	}

	.name:focus {
		outline: none;
		background: var(--tint);
	}

	.segmented {
		display: flex;
		gap: 2px;
		padding: 2px;
		border-radius: 7px;
		background: var(--tint);
	}

	.segmented button {
		width: 62px;
		padding: 4px 0;
		border: 0;
		border-radius: 5px;
		background: transparent;
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.3px;
		color: var(--secondary);
	}

	.segmented button.active {
		background: var(--canvas);
		color: var(--label);
		box-shadow: 0 1px 3px var(--shadow);
	}

	.spacer {
		flex: 1;
	}

	.columns {
		display: flex;
		flex: 1;
		min-height: 0;
	}

	.editor {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-width: 0;
	}

	.panes {
		position: relative;
		flex: 1;
		min-height: 0;
	}

	.pane {
		display: flex;
		position: absolute;
		inset: 0;
	}

	.pane.hidden {
		visibility: hidden;
		pointer-events: none;
	}

	footer {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 12px 14px;
	}

	.warning {
		display: flex;
		align-items: flex-start;
		gap: 6px;
		margin: 0;
		font-size: 11px;
		color: var(--secondary);
	}

	.glyph {
		flex: none;
		color: var(--warning);
		line-height: 1;
	}

	.assets {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin: 0;
	}

	.chip {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		padding: 2px 4px 2px 8px;
		border-radius: 5px;
		background: var(--tint);
		font-family: var(--mono);
		font-size: 10.5px;
	}

	.chip button {
		display: grid;
		place-items: center;
		width: 15px;
		height: 15px;
		padding: 0;
		border: 0;
		border-radius: 4px;
		background: transparent;
		color: var(--faint);
	}

	.chip button:hover {
		background: var(--tint-strong);
		color: var(--label);
	}

	.tools {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.page {
		margin-left: auto;
		font-size: 10px;
		color: var(--faint);
	}

	.preview {
		display: flex;
		flex-direction: column;
		flex: none;
		width: 360px;
		background: var(--sidebar);
	}

	.preview-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 14px 16px 10px;
	}

	.preview-head h3 {
		margin: 0;
		font-size: 11px;
		font-weight: 600;
		color: var(--secondary);
	}

	.stage {
		flex: 1;
		display: flex;
		justify-content: center;
		min-height: 0;
		padding: 0 16px 16px;
	}

	@media (max-width: 900px) {
		.preview,
		.columns > .divider.v {
			display: none;
		}
	}
</style>
