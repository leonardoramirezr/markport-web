<script lang="ts">
	/** Right column: the Markdown itself, with Preview and Export PDF floating over it. */
	import CodeEditor from './CodeEditor.svelte';
	import Icon from './Icon.svelte';
	import Toast from './Toast.svelte';
	import { app } from '$lib/app-state.svelte';

	let editor = $state<ReturnType<typeof CodeEditor> | null>(null);

	/** Flushes the debounce so an export never misses the last keystrokes. */
	function currentMarkdown(): string {
		const text = editor?.text();
		if (text !== undefined && text !== app.markdown) app.markdownChanged(text);
		return text ?? app.markdown;
	}

	function preview() {
		currentMarkdown();
		app.showingPreview = true;
	}

	function exportPDF() {
		currentMarkdown();
		void app.exportPDF();
	}

	export function flush() {
		currentMarkdown();
	}
</script>

<section>
	<CodeEditor
		bind:this={editor}
		label="Markdown document"
		initialText={app.markdown}
		padding={26}
		fontSize={13.5}
		lineHeight={1.45}
		spellcheck={true}
		onchange={(text) => app.markdownChanged(text)}
	/>

	{#if app.message}
		<div class="toast-slot">
			<Toast message={app.message} ondismiss={() => (app.message = null)} />
		</div>
	{/if}

	<div class="actions">
		<button type="button" class="btn secondary" title="Preview document (P)" onclick={preview}>
			<Icon name="eye" size={13} />
			Preview
		</button>
		<button
			type="button"
			class="btn"
			title="Export to PDF with the selected style (E)"
			disabled={app.isExporting}
			onclick={exportPDF}
		>
			<Icon name="export" size={13} />
			{app.isExporting ? 'Exporting...' : 'Export PDF'}
		</button>
	</div>
</section>

<style>
	section {
		position: relative;
		display: flex;
		flex: 1;
		min-width: 0;
		background: var(--canvas);
	}

	.toast-slot {
		position: absolute;
		right: 22px;
		bottom: 78px;
	}

	.actions {
		position: absolute;
		right: 22px;
		bottom: 22px;
		display: flex;
		gap: 10px;
	}

	.actions .btn {
		box-shadow: 0 4px 14px var(--shadow);
	}
</style>
