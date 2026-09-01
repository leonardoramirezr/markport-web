<script lang="ts">
	import Icon from './Icon.svelte';
	import type { Message } from '$lib/app-state.svelte';

	let { message, ondismiss }: { message: Message; ondismiss: () => void } = $props();

	$effect(() => {
		if (message.isError) return;
		const timer = setTimeout(ondismiss, 6000);
		return () => clearTimeout(timer);
	});
</script>

<div class="toast" role="status" aria-live="polite">
	<span class="glyph" class:error={message.isError}>
		<Icon name={message.isError ? 'warning' : 'check'} size={13} />
	</span>
	<p>{message.text}</p>
	<button type="button" class="close" aria-label="Dismiss" onclick={ondismiss}>
		<Icon name="xmark" size={10} strokeWidth={2} />
	</button>
</div>

<style>
	.toast {
		display: flex;
		align-items: center;
		gap: 10px;
		max-width: 420px;
		padding: 10px 14px;
		border-radius: 9px;
		background: var(--surface);
		box-shadow:
			0 0 0 0.5px var(--hairline),
			0 8px 26px var(--shadow);
		animation: rise 0.18s ease-out;
	}

	.glyph {
		display: grid;
		place-items: center;
		flex: none;
		color: var(--success);
	}

	.glyph.error {
		color: var(--warning);
	}

	p {
		margin: 0;
		font-size: 12px;
		line-height: 1.35;
	}

	.close {
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
	}

	.close:hover {
		background: var(--tint);
		color: var(--label);
	}

	@keyframes rise {
		from {
			opacity: 0;
			transform: translateY(6px);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.toast {
			animation: none;
		}
	}
</style>
