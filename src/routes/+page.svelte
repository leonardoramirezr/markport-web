<script lang="ts">
	/** RootView: onboarding until a style exists, then the two-column workspace. */
	import DocumentPreview from '$lib/components/DocumentPreview.svelte';
	import EditorPane from '$lib/components/EditorPane.svelte';
	import Onboarding from '$lib/components/Onboarding.svelte';
	import StyleEditor from '$lib/components/StyleEditor.svelte';
	import StyleSidebar from '$lib/components/StyleSidebar.svelte';
	import { app } from '$lib/app-state.svelte';

	let pane = $state<ReturnType<typeof EditorPane> | null>(null);

	$effect(() => {
		void app.load();
	});

	/** The macOS menu shortcuts: New Style, Preview, Export PDF. */
	function onkeydown(event: KeyboardEvent) {
		if (!(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey) return;
		const key = event.key.toLowerCase();
		if (key === 'n') {
			event.preventDefault();
			app.startNewStyle();
		} else if (key === 'p' && app.styles.length > 0) {
			event.preventDefault();
			pane?.flush();
			app.showingPreview = true;
		} else if (key === 'e' && app.styles.length > 0) {
			event.preventDefault();
			pane?.flush();
			void app.exportPDF();
		}
	}
</script>

<svelte:head>
	<title>Markport</title>
</svelte:head>

<svelte:window on:keydown={onkeydown} />

{#if !app.ready}
	<div class="booting"></div>
{:else if app.styles.length === 0}
	<Onboarding />
{:else}
	<div class="workspace">
		<StyleSidebar />
		<EditorPane bind:this={pane} />
	</div>
{/if}

{#if app.editing}
	<StyleEditor
		style={app.editing}
		isNew={app.editingIsNew}
		onclose={() => {
			app.editing = null;
			app.editingIsNew = false;
		}}
	/>
{/if}

{#if app.showingPreview && app.selected}
	<DocumentPreview
		style={app.selected}
		markdown={app.markdown}
		onclose={() => (app.showingPreview = false)}
	/>
{/if}

<style>
	.workspace {
		display: flex;
		height: 100vh;
		height: 100dvh;
	}

	.booting {
		height: 100vh;
		background: var(--canvas);
	}
</style>
