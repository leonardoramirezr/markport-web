<script lang="ts">
	import type { Snippet } from 'svelte';

	/** A sheet: the web stand-in for SwiftUI's `.sheet(item:)`. */
	let {
		width = 1000,
		height = 660,
		label,
		onclose,
		children
	}: {
		width?: number;
		height?: number;
		label: string;
		onclose: () => void;
		children: Snippet;
	} = $props();

	function onkeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			event.stopPropagation();
			onclose();
		}
	}
</script>

<svelte:window on:keydown={onkeydown} />

<div class="scrim" role="presentation" onpointerdown={(e) => e.target === e.currentTarget && onclose()}>
	<div
		class="sheet"
		role="dialog"
		aria-modal="true"
		aria-label={label}
		style:width="min({width}px, calc(100vw - 32px))"
		style:height="min({height}px, calc(100vh - 32px))"
	>
		{@render children()}
	</div>
</div>

<style>
	.scrim {
		position: fixed;
		inset: 0;
		z-index: 50;
		display: grid;
		place-items: center;
		background: rgba(0, 0, 0, 0.28);
		backdrop-filter: blur(1.5px);
		animation: fade 0.14s ease-out;
	}

	.sheet {
		display: flex;
		flex-direction: column;
		overflow: hidden;
		border-radius: 12px;
		background: var(--canvas);
		box-shadow: 0 22px 60px var(--shadow);
		animation: rise 0.16s ease-out;
	}

	@keyframes fade {
		from {
			opacity: 0;
		}
	}

	@keyframes rise {
		from {
			opacity: 0;
			transform: translateY(8px) scale(0.99);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.scrim,
		.sheet {
			animation: none;
		}
	}
</style>
