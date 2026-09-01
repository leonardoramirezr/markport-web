<script lang="ts">
	/**
	 * Plain-text editor, the web counterpart of `CodeTextView` (NSTextView).
	 * Changes are reported debounced (0.28s in the macOS app) so typing never
	 * re-renders the previews on every keystroke.
	 */
	let {
		initialText = '',
		mono = true,
		padding = 14,
		fontSize = 13,
		lineHeight = 1.45,
		spellcheck = false,
		label,
		onchange
	}: {
		initialText?: string;
		mono?: boolean;
		padding?: number;
		fontSize?: number;
		lineHeight?: number;
		spellcheck?: boolean;
		label: string;
		onchange: (text: string) => void;
	} = $props();

	let area = $state<HTMLTextAreaElement | null>(null);
	let timer: ReturnType<typeof setTimeout> | null = null;

	function schedule() {
		if (timer !== null) clearTimeout(timer);
		timer = setTimeout(() => onchange(area?.value ?? ''), 280);
	}

	/** Current contents, without waiting for the debounce to fire. */
	export function text(): string {
		return area?.value ?? initialText;
	}

	export function setText(value: string) {
		if (!area) return;
		area.value = value;
		onchange(value);
	}

	/** Pastes at the caret, like `EditorController.insert`. */
	export function insert(value: string) {
		if (!area) return;
		const start = area.selectionStart ?? area.value.length;
		const end = area.selectionEnd ?? start;
		area.value = area.value.slice(0, start) + value + area.value.slice(end);
		const caret = start + value.length;
		area.setSelectionRange(caret, caret);
		area.focus();
		onchange(area.value);
	}

	export function focus() {
		area?.focus();
	}

	function onkeydown(event: KeyboardEvent) {
		if (event.key !== 'Tab' || event.metaKey || event.ctrlKey || event.altKey) return;
		event.preventDefault();
		insert('    ');
	}
</script>

<textarea
	bind:this={area}
	aria-label={label}
	class:mono
	{spellcheck}
	autocomplete="off"
	autocapitalize="off"
	style:padding="{padding}px"
	style:font-size="{fontSize}px"
	style:line-height={lineHeight}
	oninput={schedule}
	onblur={() => onchange(area?.value ?? '')}
	{onkeydown}>{initialText}</textarea
>

<style>
	textarea {
		flex: 1;
		width: 100%;
		height: 100%;
		border: 0;
		resize: none;
		background: transparent;
		color: var(--label);
		tab-size: 4;
	}

	textarea.mono {
		font-family: var(--mono);
	}

	textarea:focus {
		outline: none;
	}
</style>
