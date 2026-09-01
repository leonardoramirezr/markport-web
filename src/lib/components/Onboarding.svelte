<script lang="ts">
	/** First run: the app asks for a style before it shows anything else. */
	import { app, newStyle } from '$lib/app-state.svelte';
	import { css as defaultCSS } from '$lib/defaults';

	let name = $state('My style');
	let fileInput = $state<HTMLInputElement | null>(null);

	function create(event?: SubmitEvent) {
		event?.preventDefault();
		const clean = name.trim();
		const style = newStyle(app.uniqueName(clean.length > 0 ? clean : 'Style'));
		style.css = defaultCSS;
		app.editing = style;
		app.editingIsNew = true;
	}

	async function importCSS(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (!file) return;
		const style = newStyle(app.uniqueName(file.name.replace(/\.[^.]+$/, '')));
		style.css = await file.text();
		app.editing = style;
		app.editingIsNew = true;
	}
</script>

<main>
	<div class="hero">
		<h1>Markport</h1>
		<p class="tagline">Markdown to PDF with your own styles.</p>
	</div>

	<form class="panel" onsubmit={create}>
		<h2>To get started, define a style</h2>
		<input class="field" bind:value={name} aria-label="Style name" placeholder="Style name" />
		<div class="row">
			<button type="submit" class="btn">Create style</button>
			<button type="button" class="btn secondary" onclick={() => fileInput?.click()}>Import CSS...</button>
		</div>
		<p class="note">
			A style is two files: a CSS sheet and an HTML template with <code>{'{{ title }}'}</code> and
			<code>{'{{ content }}'}</code>. You can edit them anytime.
		</p>
	</form>
</main>

<input bind:this={fileInput} type="file" accept=".css,text/css" hidden onchange={importCSS} />

<style>
	main {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100%;
		padding: 24px;
		background: var(--canvas);
	}

	.hero {
		text-align: center;
		margin-bottom: 34px;
	}

	h1 {
		margin: 0 0 10px;
		font-size: 28px;
		font-weight: 600;
		letter-spacing: -0.5px;
	}

	.tagline {
		margin: 0;
		font-size: 13px;
		color: var(--secondary);
	}

	.panel {
		display: flex;
		flex-direction: column;
		gap: 12px;
		width: min(380px, 100%);
	}

	h2 {
		margin: 0;
		font-size: 12px;
		font-weight: 600;
		color: var(--secondary);
	}

	.row {
		display: flex;
		gap: 10px;
		padding-top: 2px;
	}

	.note {
		margin: 6px 0 0;
		font-size: 11px;
		line-height: 1.45;
		color: var(--faint);
	}

	code {
		font-family: var(--mono);
		font-size: 10.5px;
	}
</style>
