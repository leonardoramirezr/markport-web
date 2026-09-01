<script lang="ts">
	/**
	 * Font picker limited to families the browser can actually render:
	 * what you pick here will exist when the document is printed.
	 */
	import Modal from './Modal.svelte';
	import { families, queryLocalFamilies } from '$lib/fonts';

	let { onpick, onclose }: { onpick: (family: string) => void; onclose: () => void } = $props();

	let query = $state('');
	let installed = $state<string[]>([]);
	let full = $state(false);

	$effect(() => {
		installed = families();
	});

	const filtered = $derived.by(() => {
		const q = query.trim().toLowerCase();
		return q.length === 0 ? installed : installed.filter((family) => family.toLowerCase().includes(q));
	});

	/** Chromium can hand over the real system list, behind a permission prompt. */
	async function loadAll() {
		const local = await queryLocalFamilies();
		if (local === null) return;
		installed = local;
		full = true;
	}
</script>

<Modal width={460} height={560} label="Choose a font" {onclose}>
	<div class="search">
		<!-- svelte-ignore a11y_autofocus -->
		<input bind:value={query} placeholder="Search available fonts" aria-label="Search fonts" autofocus />
		<span class="count">{filtered.length}</span>
	</div>
	<div class="divider h"></div>

	<div class="list">
		{#each filtered as family (family)}
			<button type="button" onclick={() => onpick(family)}>
				<span class="label">{family}</span>
				<span class="specimen" style:font-family={'"' + family + '"'}>Aa Bb Cc 0123</span>
			</button>
		{:else}
			<p class="empty">No family matches “{query}”.</p>
		{/each}
	</div>

	<div class="divider h"></div>
	<footer>
		{#if full}
			<span>Listing every font installed on this device.</span>
		{:else}
			<span>Families detected in this browser.</span>
			<button type="button" class="quiet" onclick={loadAll}>List system fonts...</button>
		{/if}
	</footer>
</Modal>

<style>
	.search {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 13px 16px;
	}

	.search input {
		flex: 1;
		border: 0;
		background: transparent;
		font-size: 13px;
	}

	.search input:focus {
		outline: none;
	}

	.count {
		font-size: 11px;
		color: var(--faint);
	}

	.list {
		flex: 1;
		overflow-y: auto;
		padding: 6px 8px;
	}

	.list button {
		display: flex;
		flex-direction: column;
		gap: 2px;
		width: 100%;
		padding: 7px 10px;
		border: 0;
		border-radius: 6px;
		background: transparent;
		text-align: left;
	}

	.list button:hover,
	.list button:focus-visible {
		background: var(--tint);
		outline: none;
	}

	.label {
		font-size: 11px;
		color: var(--secondary);
	}

	.specimen {
		font-size: 19px;
	}

	.empty {
		padding: 20px;
		text-align: center;
		font-size: 12px;
		color: var(--faint);
	}

	footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		padding: 10px 14px;
		font-size: 11px;
		color: var(--faint);
	}
</style>
