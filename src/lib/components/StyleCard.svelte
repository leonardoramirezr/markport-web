<script lang="ts">
	/** One entry in the style sidebar: a real thumbnail at page size, plus name. */
	import PagePreview from './PagePreview.svelte';
	import { sampleMarkdown } from '$lib/defaults';
	import { parse } from '$lib/page-setup';
	import type { DocStyle } from '$lib/types';

	let {
		style,
		selected,
		width,
		onselect,
		onmenu
	}: {
		style: DocStyle;
		selected: boolean;
		width: number;
		onselect: () => void;
		onmenu: (event: MouseEvent) => void;
	} = $props();

	const page = $derived(parse(style.css));
</script>

<div class="card" class:selected>
	<button
		type="button"
		class="thumb"
		aria-pressed={selected}
		aria-label="Use style {style.name}"
		onclick={onselect}
		oncontextmenu={onmenu}
	>
		<PagePreview {style} markdown={sampleMarkdown} {width} mode="page" />
	</button>
	<div class="meta">
		<span class="name">{style.name}</span>
		<span class="size">{page.label}</span>
		<button type="button" class="more" aria-label="Actions for {style.name}" onclick={onmenu}>
			<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
				<circle cx="3.5" cy="8" r="1.2" />
				<circle cx="8" cy="8" r="1.2" />
				<circle cx="12.5" cy="8" r="1.2" />
			</svg>
		</button>
	</div>
</div>

<style>
	.card {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.thumb {
		display: block;
		padding: 0;
		border: 0;
		border-radius: 4px;
		background: transparent;
		line-height: 0;
		transition: box-shadow 0.15s ease;
	}

	.card.selected .thumb {
		box-shadow: 0 0 0 2px var(--accent);
		border-radius: 5px;
	}

	.meta {
		display: flex;
		align-items: center;
		gap: 5px;
	}

	.name {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
		font-size: 12px;
	}

	.card.selected .name {
		font-weight: 600;
	}

	.size {
		flex: none;
		font-size: 10px;
		color: var(--faint);
	}

	.more {
		flex: none;
		display: grid;
		place-items: center;
		width: 18px;
		height: 18px;
		padding: 0;
		border: 0;
		border-radius: 4px;
		background: transparent;
		color: var(--faint);
		opacity: 0;
	}

	.card:hover .more,
	.more:focus-visible {
		opacity: 1;
	}

	.more:hover {
		background: var(--tint);
		color: var(--label);
	}
</style>
