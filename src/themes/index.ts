// ---------------------------------------------------------------------------
// Theme registry — all built-in themes
// ---------------------------------------------------------------------------

import type { HtmlTheme } from "../types.js";

export { defaultLightTheme } from "./default-light.js";
export { defaultDarkTheme } from "./default-dark.js";
export { githubLightTheme } from "./github-light.js";
export { githubDarkTheme } from "./github-dark.js";
export { monokaiTheme } from "./monokai.js";
export { draculaTheme } from "./dracula.js";
export { nordTheme } from "./nord.js";
export { solarizedLightTheme } from "./solarized-light.js";
export { solarizedDarkTheme } from "./solarized-dark.js";
export { tokyoNightTheme } from "./tokyo-night.js";
export { catppuccinMochaTheme } from "./catppuccin-mocha.js";
export { defaultAnsiTheme } from "./ansi-default.js";

// Re-import for registry
import { defaultLightTheme } from "./default-light.js";
import { defaultDarkTheme } from "./default-dark.js";
import { githubLightTheme } from "./github-light.js";
import { githubDarkTheme } from "./github-dark.js";
import { monokaiTheme } from "./monokai.js";
import { draculaTheme } from "./dracula.js";
import { nordTheme } from "./nord.js";
import { solarizedLightTheme } from "./solarized-light.js";
import { solarizedDarkTheme } from "./solarized-dark.js";
import { tokyoNightTheme } from "./tokyo-night.js";
import { catppuccinMochaTheme } from "./catppuccin-mocha.js";

/** All built-in HTML themes */
export const builtinThemes: HtmlTheme[] = [
  defaultLightTheme,
  defaultDarkTheme,
  githubLightTheme,
  githubDarkTheme,
  monokaiTheme,
  draculaTheme,
  nordTheme,
  solarizedLightTheme,
  solarizedDarkTheme,
  tokyoNightTheme,
  catppuccinMochaTheme,
];

/** Look up a built-in theme by name */
export function getTheme(name: string): HtmlTheme | undefined {
  return builtinThemes.find((t) => t.name === name);
}

/** Get all available theme names */
export function getThemeNames(): string[] {
  return builtinThemes.map((t) => t.name);
}
