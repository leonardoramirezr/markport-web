<script lang="ts">
	/** Full-page preview of the document with the selected style, before exporting. */
	import Icon from './Icon.svelte';
	import Modal from './Modal.svelte';
	import PagePreview from './PagePreview.svelte';
	import { parse } from '$lib/page-setup';
	import type { DocStyle } from '$lib/types';

	let { style, markdown, onclose }: { style: DocStyle; markdown: string; onclose: () => void } = $props();

	let box = $state({ width: 0, height: 0 });

	const page = $derived(parse(style.css));
	// Never blow the paper up past its real size, as the macOS sheet did.
	const width = $derived(Math.max(120, Math.min(box.width - 48, page.width * (4 / 3))));
</script>

<Modal width={760} height={860} label="Document preview" {onclose}>
	<header>
		<h2>Preview</h2>
		<span class="name">{style.name}</span>
		<button type="button" class="icon-button" aria-label="Close preview" onclick={onclose}>
			<Icon name="xmark" size={11} strokeWidth={2} />
		</button>
	</header>
	<div class="divider h"></div>
	<div class="stage" bind:clientWidth={box.width} bind:clientHeight={box.height}>
		{#if box.width > 0}
			<PagePreview {style} {markdown} {width} height={box.height - 24} mode="fill" />
		{/if}
	</div>
</Modal>

<style>
	header {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 12px 16px;
	}

	h2 {
		flex: 1;
		margin: 0;
		font-size: 13px;
		font-weight: 600;
	}

	.name {
		font-size: 11px;
		color: var(--faint);
	}

	.stage {
		flex: 1;
		display: flex;
		justify-content: center;
		min-height: 0;
		padding: 12px 0;
		background: var(--sidebar);
	}
</style>
