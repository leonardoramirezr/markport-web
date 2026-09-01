/**
 * Application state, the web counterpart of `AppState` + `StyleStore`.
 * Svelte 5 runes replace `@Published`; IndexedDB replaces the styles folder.
 */
import { browser } from '$app/environment';
import * as defaults from './defaults';
import { predefinedStyles } from './predefined-styles';
import { composeForPrint } from './renderer';
import { deleteStyle, loadStyles, putStyle, readPref, writePref } from './storage';
import type { DocStyle, StyleAsset } from './types';

export interface Message {
	id: number;
	text: string;
	isError: boolean;
}

const DRAFT_KEY = 'draft.md';
const SELECTED_KEY = 'selectedStyle';

export function newStyle(name: string, css: string = defaults.css, html: string = defaults.templateHTML): DocStyle {
	return {
		id: crypto.randomUUID(),
		name,
		css,
		html,
		updatedAt: Date.now(),
		assets: {}
	};
}

class AppState {
	styles = $state<DocStyle[]>([]);
	selectedStyleID = $state<string | null>(null);
	/** Draft being edited in the style sheet; `null` closes the editor. */
	editing = $state<DocStyle | null>(null);
	editingIsNew = $state(false);
	showingPreview = $state(false);
	isExporting = $state(false);
	message = $state<Message | null>(null);
	markdown = $state(defaults.welcomeMarkdown);
	/** False until IndexedDB has answered, so the onboarding never flashes. */
	ready = $state(false);

	private saveTimer: ReturnType<typeof setTimeout> | null = null;
	private messageSeq = 0;
	private printFrame: { frame: HTMLIFrameElement; assets: { release(): void } } | null = null;

	get selected(): DocStyle | null {
		const match = this.styles.find((style) => style.id === this.selectedStyleID);
		return match ?? this.styles[0] ?? null;
	}

	async load(): Promise<void> {
		if (!browser) return;
		try {
			this.styles = await loadStyles();
			// Fresh install, empty IndexedDB: seed the bundled presets instead of
			// sending the user through onboarding.
			if (this.styles.length === 0) {
				for (const preset of predefinedStyles) {
					await this.save(newStyle(preset.name, preset.css, preset.html));
				}
			}
			this.selectedStyleID = (await readPref<string>(SELECTED_KEY)) ?? null;
			this.markdown = (await readPref<string>(DRAFT_KEY)) ?? defaults.welcomeMarkdown;
		} catch (error) {
			this.notify(describe(error), true);
		}
		this.ready = true;
	}

	/** Debounced, like the 1s draft write in the macOS app. */
	markdownChanged(value: string): void {
		this.markdown = value;
		if (this.saveTimer !== null) clearTimeout(this.saveTimer);
		this.saveTimer = setTimeout(() => void writePref(DRAFT_KEY, value), 1000);
	}

	select(id: string): void {
		this.selectedStyleID = id;
		void writePref(SELECTED_KEY, id);
	}

	uniqueName(base: string): string {
		let candidate = base;
		let n = 2;
		while (this.styles.some((style) => style.name.toLowerCase() === candidate.toLowerCase())) {
			candidate = `${base} ${n}`;
			n += 1;
		}
		return candidate;
	}

	async save(style: DocStyle): Promise<DocStyle> {
		// IndexedDB structured-clones what it stores, and a rune proxy is not
		// cloneable: the snapshot is what actually reaches the database.
		const copy: DocStyle = { ...$state.snapshot(style), updatedAt: Date.now() };
		await putStyle(copy);
		const index = this.styles.findIndex((item) => item.id === copy.id);
		if (index >= 0) this.styles[index] = copy;
		else this.styles.push(copy);
		this.styles.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
		return copy;
	}

	async remove(style: DocStyle): Promise<void> {
		await deleteStyle(style.id);
		this.styles = this.styles.filter((item) => item.id !== style.id);
		if (this.selectedStyleID === style.id) this.select(this.styles[0]?.id ?? '');
	}

	async duplicate(style: DocStyle): Promise<DocStyle> {
		// Carries over the resources (fonts, images) of the original style.
		const copy: DocStyle = {
			...style,
			id: crypto.randomUUID(),
			name: this.uniqueName(`${style.name} copy`),
			assets: { ...style.assets }
		};
		try {
			return await this.save(copy);
		} catch (error) {
			this.notify(`Could not duplicate the style: ${describe(error)}`, true);
			throw error;
		}
	}

	startNewStyle(): void {
		this.editing = newStyle(this.uniqueName('Style'));
		this.editingIsNew = true;
	}

	edit(style: DocStyle): void {
		this.editing = { ...style, assets: { ...style.assets } };
		this.editingIsNew = false;
	}

	notify(text: string, isError = false): void {
		this.messageSeq += 1;
		this.message = { id: this.messageSeq, text, isError };
	}

	/**
	 * Export to PDF. A web page cannot write a PDF the way `NSPrintOperation`
	 * does, so the composed document is handed to the browser's own print
	 * engine — it honours `@page`, embeds the bundled fonts, and its
	 * "Save as PDF" destination produces the same paginated file.
	 */
	async exportPDF(): Promise<void> {
		const style = this.selected;
		if (!style) return;
		if (this.markdown.trim().length === 0) {
			this.notify('There is no Markdown to export.', true);
			return;
		}
		this.isExporting = true;
		// A previous export may still be parked on the page waiting for its
		// dialog; a new one supersedes it.
		this.discardPrintFrame();
		const { html, assets } = composeForPrint(this.markdown, style);
		const frame = window.document.createElement('iframe');
		frame.setAttribute('aria-hidden', 'true');
		frame.style.cssText = 'position:fixed;right:0;bottom:0;width:1px;height:1px;opacity:0;border:0;';
		try {
			await new Promise<void>((resolve, reject) => {
				frame.onload = () => resolve();
				frame.onerror = () => reject(new Error('the document could not be composed'));
				frame.srcdoc = html;
				window.document.body.appendChild(frame);
			});
			const view = frame.contentWindow;
			if (!view) throw new Error('the print view could not be opened');
			// Wait for @font-face and system fonts, as WebRenderer does.
			await frame.contentDocument?.fonts?.ready;
			view.focus();
			view.print();
			this.notify('Sent to the browser’s print dialog — choose “Save as PDF”.');
		} catch (error) {
			this.notify(`Could not generate the PDF: ${describe(error)}`, true);
		} finally {
			this.isExporting = false;
			// Safari keeps painting the print job from the live frame, so the
			// teardown waits until the dialog has had a chance to take over.
			this.printFrame = { frame, assets };
			setTimeout(() => this.discardPrintFrame(), 60_000);
		}
	}

	private discardPrintFrame(): void {
		this.printFrame?.frame.remove();
		this.printFrame?.assets.release();
		this.printFrame = null;
	}
}

export async function readAsset(file: File, folder = 'fonts'): Promise<[string, StyleAsset]> {
	const path = folder.length > 0 ? `${folder}/${file.name}` : file.name;
	return [path, { name: file.name, type: file.type, data: await file.arrayBuffer() }];
}

function describe(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

export const app = new AppState();
