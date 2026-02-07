import {
	type FileSystem,
	listHome as listHomeFs,
	resolveHomeItem as resolveHomeItemFs,
} from "../data/fs.js";
import type { Profile } from "../data/profile";
import type { ThemeController } from "../services/theme";
import type { Renderer } from "../ui/domRenderer";
import type { Commands } from "./commands";

type TextSeg = { type: "text"; text: string };
type SpanSeg = { type: "span"; className: string; text: string };
type LinkSeg = { type: "link"; href: string; text?: string };
export type Segment = TextSeg | SpanSeg | LinkSeg;

interface Completion {
	kind: string;
	baseInput: string;
	phase: string;
	prefix: string;
	matchesKey: string;
	values: string[];
	index: number;
	lastValue: string | null;
}

export interface Context {
	profile: Profile;
	fs: FileSystem;
	theme: ThemeController;
	openUrl: (href: string | URL) => void;
	printLine: (content: string | Segment[], className?: string) => void;
	printPre: (text: string, className?: string) => void;
	seg: { t: typeof t; s: typeof s; l: typeof l };
	listHome: () => string[];
	resolveHomeItem: (
		name: string,
	) => ReturnType<typeof resolveHomeItemFs> | null;
	clear: () => void;
}

const t = (text: string): TextSeg => ({ type: "text", text });
const s = (className: string, text: string): SpanSeg => ({
	type: "span",
	className,
	text,
});
const l = (href: string, text?: string | undefined): LinkSeg => ({
	type: "link",
	href,
	text,
});

export function createTerminal({
	renderer,
	profile,
	fs,
	commands,
	openUrl,
	theme,
}: {
	renderer: Renderer;
	profile: Profile;
	fs: FileSystem;
	commands: Commands;
	openUrl: (href: string | URL) => void;
	theme: ThemeController;
}) {
	const state: {
		history: string[];
		historyIndex: number;
		completion: Completion | null;
		hasRunCommand: boolean;
		hasBooted: boolean;
	} = {
		history: [],
		historyIndex: -1,
		completion: null,
		hasRunCommand: false,
		hasBooted: false,
	};

	function boot() {
		state.hasBooted = true;
		renderIntro();
	}

	function renderIntro() {
		renderer.clear();
		printBanner();
		printLine(
			[t("Type "), s("accent", "help"), t(" to see commands.")],
			"muted",
		);
		renderer.scrollToBottom();
	}

	function refreshIntroIfPristine() {
		if (!state.hasBooted || state.hasRunCommand) return;
		renderIntro();
	}

	function maxLineLength(lines: string[]) {
		return lines.reduce(
			(max, line) => Math.max(max, Array.from(line).length),
			0,
		);
	}

	function printBanner() {
		const artLines = profile.nameAsciiArt ?? [];
		const artWidth = maxLineLength(artLines);
		const availableColumns = renderer.getColumns();

		if (artLines.length > 0 && artWidth <= availableColumns) {
			printPre(artLines.join("\n"), "accent");
			printLine(profile.role, "muted");
			return;
		}

		printBoxBanner();
	}

	function printBoxBanner() {
		const name = String(profile.name);
		const role = String(profile.role);

		const contentWidth = Math.max(name.length, role.length, 10);
		const innerWidth = clamp(contentWidth + 2, 30, 54);

		const top = `┌${"─".repeat(innerWidth + 2)}┐`;
		const bottom = `└${"─".repeat(innerWidth + 2)}┘`;
		const line = (text: string) => `│  ${text.padEnd(innerWidth, " ")}│`;

		const banner = [top, line(name), line(role), bottom].join("\n");
		printPre(banner, "ok");
	}

	function clamp(n: number, min: number, max: number) {
		return Math.max(min, Math.min(max, n));
	}

	function printLine(content: string | Segment[], className = "ok") {
		const segments = Array.isArray(content) ? content : [t(String(content))];
		renderer.printLine(segments, className);
	}

	function printPre(text: string, className = "ok") {
		renderer.printPre(String(text), className);
	}

	function printCmd(cmd: string) {
		printLine([s("cmd", "$"), t(" "), s("cmd", cmd)], "cmd");
	}

	function listHome() {
		return listHomeFs(fs);
	}

	function resolveHomeItem(name: string) {
		return resolveHomeItemFs(fs, name);
	}

	function buildContext(): Context {
		return {
			profile,
			fs,
			theme,
			openUrl,
			printLine,
			printPre,
			seg: { t, s, l },
			listHome,
			resolveHomeItem,
			clear: renderer.clear,
		};
	}

	async function run(inputLine: string) {
		const line = inputLine.trim();
		if (!line) return;
		state.hasRunCommand = true;

		printCmd(line);

		const parsed = tokeniseWithMeta(line);
		const [cmd, ...args] = parsed.tokens;
		const command = commands.get(cmd);

		if (!command) {
			printLine([t("Command not found: "), s("error", cmd)], "error");
			printLine([t("Try: "), s("accent", "help")], "muted");
			return;
		}

		try {
			await command.execute(buildContext(), args);
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			printLine([s("error", "Error:"), t(" "), t(message)], "error");
		}
	}

	function tokeniseWithMeta(line: string) {
		const tokens: string[] = [];
		let cur = "";
		let quote: "'" | '"' | null = null;
		let escaping = false;

		for (let i = 0; i < line.length; i++) {
			const ch = line[i];

			if (escaping) {
				cur += ch;
				escaping = false;
				continue;
			}

			if (ch === "\\") {
				escaping = true;
				continue;
			}

			if (quote) {
				if (ch === quote) {
					quote = null;
					continue;
				}
				cur += ch;
				continue;
			}

			if (ch === '"' || ch === "'") {
				quote = ch;
				continue;
			}

			if (/\s/.test(ch)) {
				if (cur) {
					tokens.push(cur);
					cur = "";
				}
				continue;
			}

			cur += ch;
		}

		if (escaping) cur += "\\";
		if (cur) tokens.push(cur);

		return {
			tokens,
			endsWithWhitespace: /\s$/.test(line),
			unterminatedQuote: quote,
		};
	}

	function addHistory(line: string) {
		state.history.push(line);
		state.historyIndex = state.history.length;
	}

	function historyUp() {
		if (state.history.length === 0) return null;
		state.historyIndex = Math.max(0, state.historyIndex - 1);
		return state.history[state.historyIndex] ?? "";
	}

	function historyDown() {
		if (state.history.length === 0) return null;
		state.historyIndex = Math.min(state.history.length, state.historyIndex + 1);
		return state.history[state.historyIndex] ?? "";
	}

	function autocomplete(current: string) {
		const parsed = tokeniseWithMeta(current);

		if (state.completion?.phase === "menu") {
			const c = state.completion;
			const i = c.values.indexOf(current);
			if (i !== -1) {
				const nextIndex = (i + 1) % c.values.length;
				c.index = nextIndex;
				c.lastValue = c.values[nextIndex];
				return c.lastValue;
			}
			state.completion = null;
		}

		const { tokens, endsWithWhitespace } = parsed;

		if (tokens.length === 0) return "";

		const commandNames = Array.from(commands.keys()).sort() as string[];

		if (tokens.length === 1 && !endsWithWhitespace) {
			const prefix = tokens[0];
			const matches = commandNames.filter((c) => c.startsWith(prefix));
			return (
				applyMatches("cmd", current, prefix, matches, (choice) => choice) ??
				current
			);
		}

		const cmdName = tokens[0];
		const command = commands.get(cmdName);
		if (!command?.complete) return current;

		const args = tokens.slice(1);
		const prefix = endsWithWhitespace ? "" : (args[args.length - 1] ?? "");

		const argIndex = endsWithWhitespace
			? args.length
			: Math.max(0, args.length - 1);

		const req = {
			line: current,
			tokens,
			args,
			endsWithWhitespace,
			argIndex,
			prefix,
		};

		const candidates = command.complete(buildContext(), req) || [];

		return (
			applyMatches(
				`arg:${cmdName}`,
				current,
				prefix,
				candidates,
				(choice: string) => {
					const baseTokens = endsWithWhitespace ? tokens : tokens.slice(0, -1);
					return [...baseTokens, quoteIfNeeded(choice)].join(" ");
				},
			) ?? current
		);
	}

	function quoteIfNeeded(value: string) {
		return /\s/.test(value) ? `"${value.replace(/"/g, '\\"')}"` : value;
	}

	function longestCommonPrefix(items: string[]) {
		if (items.length === 0) return "";
		let p = items[0];
		for (let i = 1; i < items.length; i++) {
			const s = items[i];
			let j = 0;
			while (j < p.length && j < s.length && p[j] === s[j]) j++;
			p = p.slice(0, j);
			if (p === "") break;
		}
		return p;
	}

	function makeMatchesKey(matches: string[]) {
		return matches.join("\0");
	}

	function applyMatches(
		kind: string,
		current: string,
		prefix: string,
		matches: string[],
		buildValue: (choice: string) => string,
	) {
		if (matches.length === 0) {
			state.completion = null;
			return null;
		}

		if (matches.length === 1) {
			state.completion = null;
			return buildValue(matches[0]);
		}

		const matchesKey = makeMatchesKey(matches);
		const common = longestCommonPrefix(matches);

		if (common.length > prefix.length) {
			const nextValue = buildValue(common);
			state.completion = {
				phase: "armed",
				kind,
				baseInput: nextValue,
				prefix: common,
				matchesKey,
				values: matches.map(buildValue),
				index: -1,
				lastValue: null,
			};
			return nextValue;
		}

		const sameContext =
			state.completion &&
			state.completion.kind === kind &&
			state.completion.baseInput === current &&
			state.completion.prefix === prefix &&
			state.completion.matchesKey === matchesKey;

		if (!sameContext) {
			state.completion = {
				phase: "armed",
				kind,
				baseInput: current,
				prefix,
				matchesKey,
				values: matches.map(buildValue),
				index: -1,
				lastValue: null,
			};
			return null;
		}

		if (state.completion?.phase === "armed") {
			const segs: Segment[] = [];
			matches.forEach((m, i) => {
				if (i) segs.push(t("   "));
				segs.push(s("accent", m));
			});
			printLine(segs, "muted");
			renderer.scrollToBottom();

			state.completion.phase = "listed";
			return null;
		}

		if (state.completion?.phase === "listed") {
			const first = state.completion?.values[0];
			state.completion.phase = "menu";
			state.completion.index = 0;
			state.completion.lastValue = first;
			return first;
		}

		return null;
	}

	return {
		boot,
		run,
		addHistory,
		historyUp,
		historyDown,
		autocomplete,
		refreshIntroIfPristine,
	};
}
