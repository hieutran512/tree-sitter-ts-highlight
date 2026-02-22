// ---------------------------------------------------------------------------
// tree-sitter-ts-highlight - Syntax highlighting built on tree-sitter-ts
// ---------------------------------------------------------------------------

import { tokenize } from "tree-sitter-ts";
import type { Token } from "tree-sitter-ts";
import { renderTokensToHtml } from "./html/renderer.js";
import { wrapInLines } from "./html/line-wrapper.js";
import { renderTokensToAnsi } from "./ansi/renderer.js";
import { enhanceTokenSemantics } from "./semantic/enhancer.js";
import type { HighlightOptions, AnsiHighlightOptions } from "./types.js";

// ======================== PRIMARY API ========================

/**
 * Highlight source code and return an HTML string of `<span>` elements.
 *
 * By default returns just inner spans (no `<pre><code>` wrapper).
 * Use `highlightBlock()` or set `wrapInPre: true` for a complete block.
 *
 * @param source - Source code to highlight
 * @param language - Language name (e.g., 'typescript') or file extension (e.g., '.ts')
 * @param options - Rendering options
 * @returns HTML string with syntax-highlighted spans
 */
export function highlight(
  source: string,
  language: string,
  options: HighlightOptions = {},
): string {
  const tokens = tokenize(source, language);
  return highlightTokens(tokens, options);
}

/**
 * Highlight source code and return a complete `<pre><code>` block.
 *
 * Equivalent to `highlight()` with `wrapInPre: true`.
 */
export function highlightBlock(
  source: string,
  language: string,
  options: HighlightOptions = {},
): string {
  return highlight(source, language, {
    ...options,
    wrapInPre: true,
    language: options.language ?? language,
  });
}

/**
 * Highlight source code and return an ANSI-colored string for terminal output.
 *
 * @param source - Source code to highlight
 * @param language - Language name or file extension
 * @param options - ANSI rendering options
 * @returns String with ANSI escape codes
 */
export function highlightAnsi(
  source: string,
  language: string,
  options: AnsiHighlightOptions = {},
): string {
  const tokens = tokenize(source, language);
  return highlightTokensAnsi(tokens, options);
}

/**
 * Highlight pre-tokenized tokens to HTML.
 * Useful when you already have tokens from `tree-sitter-ts`.
 *
 * @param tokens - Pre-tokenized token array
 * @param options - Rendering options
 * @returns HTML string
 */
export function highlightTokens(
  tokens: Token[],
  options: HighlightOptions = {},
): string {
  const semanticTokens = options.semanticHighlighting
    ? enhanceTokenSemantics(tokens)
    : tokens;

  const renderOpts = {
    classPrefix: options.classPrefix,
    theme: options.theme,
    decorations: options.decorations,
  };

  let inner: string;

  if (options.lineNumbers) {
    inner = wrapInLines(
      semanticTokens,
      (lineTokens) => renderTokensToHtml(lineTokens, renderOpts),
      {
        startLine: options.startLine,
        dataLineAttributes: options.dataLineAttributes,
      },
    );
  } else {
    inner = renderTokensToHtml(semanticTokens, renderOpts);
  }

  if (options.wrapInPre) {
    return wrapInPre(inner, options);
  }

  return inner;
}

/**
 * Highlight pre-tokenized tokens to ANSI.
 */
export function highlightTokensAnsi(
  tokens: Token[],
  options: AnsiHighlightOptions = {},
): string {
  const semanticTokens = options.semanticHighlighting
    ? enhanceTokenSemantics(tokens)
    : tokens;

  return renderTokensToAnsi(semanticTokens, {
    theme: options.theme,
    lineNumbers: options.lineNumbers,
    startLine: options.startLine,
    lineNumberWidth: options.lineNumberWidth,
  });
}

/**
 * Reclassify overloaded identifier tokens into richer semantic categories.
 */
export function enhanceSemantics(tokens: Token[]): Token[] {
  return enhanceTokenSemantics(tokens);
}

// ======================== HELPERS ========================

function wrapInPre(inner: string, options: HighlightOptions): string {
  const langClass = options.language
    ? ` hlts-lang-${options.language}`
    : "";
  const themeStyle = options.theme
    ? ` style="background:${options.theme.background ?? ""};color:${options.theme.foreground ?? ""}"`
    : "";
  return `<pre class="hlts${langClass}"${themeStyle}><code>${inner}</code></pre>`;
}

// ======================== RE-EXPORTS ========================

// Types
export type {
  HighlightOptions,
  AnsiHighlightOptions,
  Decoration,
  HtmlTheme,
  AnsiTheme,
} from "./types.js";

// Themes
export { defaultLightTheme } from "./themes/default-light.js";
export { defaultDarkTheme } from "./themes/default-dark.js";
export { githubLightTheme } from "./themes/github-light.js";
export { githubDarkTheme } from "./themes/github-dark.js";
export { monokaiTheme } from "./themes/monokai.js";
export { draculaTheme } from "./themes/dracula.js";
export { nordTheme } from "./themes/nord.js";
export { solarizedLightTheme } from "./themes/solarized-light.js";
export { solarizedDarkTheme } from "./themes/solarized-dark.js";
export { tokyoNightTheme } from "./themes/tokyo-night.js";
export { catppuccinMochaTheme } from "./themes/catppuccin-mocha.js";
export { defaultAnsiTheme } from "./themes/ansi-default.js";
export { builtinThemes, getTheme, getThemeNames } from "./themes/index.js";

// Low-level utilities
export { renderTokensToHtml } from "./html/renderer.js";
export { wrapInLines, groupTokensByLine } from "./html/line-wrapper.js";
export type { LineGroup } from "./html/line-wrapper.js";
export { escapeHtml } from "./html/escaper.js";
export { renderTokensToAnsi } from "./ansi/renderer.js";
export { applyDecorations } from "./decorations/decorator.js";
export type { DecoratedToken } from "./decorations/decorator.js";
export { splitTokensAtRanges } from "./decorations/splitter.js";
export { enhanceTokenSemantics } from "./semantic/enhancer.js";
