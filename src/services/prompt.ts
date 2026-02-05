import type { Renderer } from "../ui/domRenderer.js";

interface TerminalLike {
	addHistory: (line: string) => void;
	run: (line: string) => Promise<void> | void;
	historyUp: () => string | null;
	historyDown: () => string | null;
	autocomplete: (value: string) => string;
}

interface PromptOptions {
	form: HTMLFormElement;
	input: HTMLInputElement;
	terminal: TerminalLike;
	renderer: Renderer;
}

export function createPromptController({
	form,
	input,
	terminal,
	renderer,
}: PromptOptions) {
	function focus(): void {
		input.focus({ preventScroll: true });
	}

	function moveCaretToEnd(): void {
		requestAnimationFrame(() => {
			input.selectionStart = input.selectionEnd = input.value.length;
		});
	}

	form.addEventListener("submit", async (e) => {
		e.preventDefault();
		const line = input.value;
		input.value = "";

		if (line.trim()) {
			terminal.addHistory(line);
			await terminal.run(line);
		}
		renderer.scrollToBottom();
		focus();
	});

	input.addEventListener("keydown", (e) => {
		if (e.altKey || e.ctrlKey || e.metaKey) return;

		if (e.key === "ArrowUp") {
			e.preventDefault();
			const next = terminal.historyUp();
			if (next === null) return;
			input.value = next;
			moveCaretToEnd();
		}

		if (e.key === "ArrowDown") {
			e.preventDefault();
			const next = terminal.historyDown();
			if (next === null) return;
			input.value = next;
			moveCaretToEnd();
		}

		if (e.key === "Tab") {
			if (e.shiftKey) return;
			e.preventDefault();
			input.value = terminal.autocomplete(input.value);
			moveCaretToEnd();
		}
	});

	return { focus };
}
