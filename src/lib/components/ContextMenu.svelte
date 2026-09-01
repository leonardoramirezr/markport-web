<script lang="ts">
	/** Small floating menu, the stand-in for SwiftUI's `.contextMenu`. */
	export interface MenuItem {
		label: string;
		action: () => void;
		destructive?: boolean;
		separated?: boolean;
	}

	let { x, y, items, onclose }: { x: number; y: number; items: MenuItem[]; onclose: () => void } = $props();

	let menu = $state<HTMLDivElement | null>(null);
	/** Set once the menu has been measured, so it never spills off screen. */
	let placed = $state<{ left: number; top: number } | null>(null);

	$effect(() => {
		if (!menu) return;
		const box = menu.getBoundingClientRect();
		placed = {
			left: Math.max(8, Math.min(x, window.innerWidth - box.width - 8)),
			top: Math.max(8, Math.min(y, window.innerHeight - box.height - 8))
		};
		menu.querySelector('button')?.focus();
	});

	function choose(item: MenuItem) {
		onclose();
		item.action();
	}
</script>

<svelte:window
	on:keydown={(event) => event.key === 'Escape' && onclose()}
	on:resize={onclose}
	on:blur={onclose}
/>

<div class="scrim" role="presentation" onpointerdown={onclose} oncontextmenu={(e) => e.preventDefault()}></div>
<div
	bind:this={menu}
	class="menu"
	role="menu"
	style:left="{placed?.left ?? x}px"
	style:top="{placed?.top ?? y}px"
	style:visibility={placed ? "visible" : "hidden"}
>
	{#each items as item (item.label)}
		{#if item.separated}
			<div class="rule" role="separator"></div>
		{/if}
		<button type="button" role="menuitem" class:destructive={item.destructive} onclick={() => choose(item)}>
			{item.label}
		</button>
	{/each}
</div>

<style>
	.scrim {
		position: fixed;
		inset: 0;
		z-index: 60;
	}

	.menu {
		position: fixed;
		z-index: 61;
		min-width: 168px;
		padding: 5px;
		border-radius: 8px;
		background: var(--surface);
		box-shadow:
			0 0 0 0.5px var(--hairline),
			0 10px 30px var(--shadow);
	}

	button {
		display: block;
		width: 100%;
		padding: 6px 10px;
		border: 0;
		border-radius: 5px;
		background: transparent;
		text-align: left;
		font-size: 13px;
	}

	button:hover,
	button:focus-visible {
		background: var(--accent);
		color: #fff;
		outline: none;
	}

	button.destructive {
		color: #c0392b;
	}

	button.destructive:hover,
	button.destructive:focus-visible {
		background: #c0392b;
		color: #fff;
	}

	.rule {
		height: 1px;
		margin: 5px 4px;
		background: var(--hairline);
	}
</style>
