<script lang="ts">
	/** Line icons standing in for the SF Symbols the macOS app uses. */
	const paths: Record<string, string> = {
		plus: 'M8 3v10M3 8h10',
		xmark: 'M4 4l8 8M12 4l-8 8',
		eye: 'M1.5 8S3.9 3.5 8 3.5 14.5 8 14.5 8 12.1 12.5 8 12.5 1.5 8 1.5 8z M8 10a2 2 0 100-4 2 2 0 000 4z',
		export: 'M8 2v8M4.5 7l3.5 3.5L11.5 7M2.5 13h11',
		refresh: 'M13 8a5 5 0 11-1.6-3.7M13 2.5V5h-2.5',
		text: 'M3 4h10M6.5 4v8M4.5 12h4',
		warning: 'M8 2l6 11H2L8 2zM8 6.5v3.2M8 11.4v.1',
		check: 'M2.5 8.5l3.5 3.5L13.5 4',
		trash: 'M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.7 9h5.6l.7-9',
		copy: 'M5.5 5.5V3.5h7v7h-2M3.5 5.5h7v7h-7z',
		pencil: 'M11.5 2.5l2 2-8 8-2.7.7.7-2.7 8-8z',
		file: 'M4 2h5l3 3v9H4V2zM9 2v3h3'
	};

	let { name, size = 14, strokeWidth = 1.5 }: { name: string; size?: number; strokeWidth?: number } = $props();
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 16 16"
	fill="none"
	stroke="currentColor"
	stroke-width={strokeWidth}
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
>
	<path d={paths[name] ?? ''} />
</svg>
