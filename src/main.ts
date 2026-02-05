import { createCommandRegistry } from "./core/commands.js";
import { createTerminal } from "./core/terminal.js";
import { buildFs } from "./data/fs.js";
import { PROFILE } from "./data/profile.js";
import { createSafeOpener } from "./services/openUrl.js";
import { createPromptController } from "./services/prompt.js";
import { createThemeController } from "./services/theme.js";
import { createToast } from "./services/toast.js";
import { createDomRenderer } from "./ui/domRenderer.js";

const screen = document.getElementById("screen");
const form = document.getElementById("prompt") as HTMLFormElement;
const input = document.getElementById("input") as HTMLInputElement;
const themeToggle = document.getElementById("themeToggle");
const toastEl = document.getElementById("toast");
const title = document.querySelector(".title");
const ps1 = document.querySelector(".ps1");

const SHELL_ID = "brad@portfolio";

if (title) title.textContent = `${SHELL_ID}: ~`;
if (ps1) ps1.textContent = SHELL_ID;

const toast = createToast(toastEl);
const { controller: themeController, applyInitialTheme } =
	createThemeController({
		themeToggle,
		toast,
	});
const openUrl = createSafeOpener(toast);

const renderer = createDomRenderer({ screen });
const { commands } = createCommandRegistry({ profile: PROFILE });
const terminal = createTerminal({
	renderer,
	profile: PROFILE,
	fs: buildFs(PROFILE),
	commands,
	theme: themeController,
	openUrl,
});

const prompt = createPromptController({ form, input, terminal, renderer });

applyInitialTheme();
terminal.boot();
prompt.focus();

let introResizeRaf = 0;
window.addEventListener("resize", () => {
	if (introResizeRaf) cancelAnimationFrame(introResizeRaf);
	introResizeRaf = requestAnimationFrame(() => {
		terminal.refreshIntroIfPristine();
		introResizeRaf = 0;
	});
});
