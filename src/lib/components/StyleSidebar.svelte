<script lang="ts">
	/** Left column: every saved style with a real thumbnail of the document. */
	import ContextMenu, { type MenuItem } from './ContextMenu.svelte';
	import Icon from './Icon.svelte';
	import StyleCard from './StyleCard.svelte';
	import { app } from '$lib/app-state.svelte';
	import type { DocStyle } from '$lib/types';

	const CARD_WIDTH = 220;

	let menu = $state<{ x: number; y: number; items: MenuItem[] } | null>(null);
	let renaming = $state<DocStyle | null>(null);
	let renameText = $state('');

	function openMenu(event: MouseEvent, style: DocStyle) {
		event.preventDefault();
		event.stopPropagation();
		menu = {
			x: event.clientX,
			y: event.clientY,
			items: [
				{ label: 'Edit...', action: () => app.edit(style) },
				{ label: 'Duplicate', action: () => void app.duplicate(style) },
				{
					label: 'Rename...',
					action: () => {
						renaming = style;
						renameText = style.name;
					}
				},
				{ label: 'Download style...', action: () => void downloadStyle(style) },
				{ label: 'Delete', action: () => confirmDelete(style), destructive: true, separated: true }
			]
		};
	}

	function confirmDelete(style: DocStyle) {
		if (confirm(`Delete the style "${style.name}"? This cannot be undone.`)) void app.remove(style);
	}

	/** The web answer to "Show in Finder": hand the two files back to the user. */
	async function downloadStyle(style: DocStyle) {
		for (const [name, text] of [
			[`${style.name}.css`, style.css],
			[`${style.name}.html`, style.html]
		]) {
			const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
			const link = document.createElement('a');
			link.href = url;
			link.download = name;
			link.click();
			setTimeout(() => URL.revokeObjectURL(url), 10_000);
			await new Promise((resolve) => setTimeout(resolve, 120));
		}
	}

	async function commitRename(event: SubmitEvent) {
		event.preventDefault();
		const style = renaming;
		renaming = null;
		const clean = renameText.trim();
		if (style && clean.length > 0) await app.save({ ...style, name: clean });
	}
</script>

<aside>
	<header>
		<h2>Styles</h2>
		<button type="button" class="icon-button" title="New style (N)" aria-label="New style" onclick={() => app.startNewStyle()}>
			<Icon name="plus" size={13} />
		</button>
	</header>

	<div class="list">
		{#each app.styles as style (style.id)}
			<StyleCard
				{style}
				selected={style.id === app.selected?.id}
				width={CARD_WIDTH}
				onselect={() => app.select(style.id)}
				onmenu={(event) => openMenu(event, style)}
			/>
		{/each}
	</div>
</aside>

{#if menu}
	<ContextMenu x={menu.x} y={menu.y} items={menu.items} onclose={() => (menu = null)} />
{/if}

{#if renaming}
	<div class="scrim" role="presentation" onpointerdown={(e) => e.target === e.currentTarget && (renaming = null)}>
		<form class="rename" onsubmit={commitRename}>
			<h3>Rename style</h3>
			<!-- svelte-ignore a11y_autofocus -->
			<input class="field" bind:value={renameText} aria-label="Name" autofocus />
			<div class="row">
				<button type="button" class="quiet" onclick={() => (renaming = null)}>Cancel</button>
				<button type="submit" class="btn">Save</button>
			</div>
		</form>
	</div>
{/if}

<style>
	aside {
		display: flex;
		flex-direction: column;
		flex: none;
		width: var(--sidebar-width);
		height: 100%;
		background: var(--sidebar);
		border-right: 1px solid var(--hairline);
	}

	header {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 22px 16px 10px;
	}

	h2 {
		flex: 1;
		margin: 0;
		font-size: 12px;
		font-weight: 600;
		color: var(--secondary);
	}

	.list {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 22px;
		overflow-y: auto;
		padding: 2px 16px 20px;
	}

	.scrim {
		position: fixed;
		inset: 0;
		z-index: 55;
		display: grid;
		place-items: center;
		background: rgba(0, 0, 0, 0.28);
	}

	.rename {
		display: flex;
		flex-direction: column;
		gap: 14px;
		width: 320px;
		padding: 20px;
		border-radius: 12px;
		background: var(--canvas);
		box-shadow: 0 20px 50px var(--shadow);
	}

	.rename h3 {
		margin: 0;
		font-size: 13px;
		font-weight: 600;
	}

	.row {
		display: flex;
		justify-content: flex-end;
		gap: 8px;
	}
</style>
