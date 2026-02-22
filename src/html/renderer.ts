// ---------------------------------------------------------------------------
// Core HTML rendering: Token[] → HTML string with <span> elements
// ---------------------------------------------------------------------------

import type { Token } from "tree-sitter-ts";
import type { HtmlTheme, Decoration } from "../types.js";
import type { DecoratedToken } from "../decorations/decorator.js";
import { applyDecorations } from "../decorations/decorator.js";
import { escapeHtml } from "./escaper.js";

export interface RenderOptions {
  /** CSS class prefix (default: "hlts-") */
  classPrefix?: string;
  /** Custom theme for inline styles instead of CSS classes */
  theme?: HtmlTheme;
  /** Decorations to apply */
  decorations?: Decoration[];
}

/**
 * Render tokens to an HTML string of <span> elements.
 *
 * Whitespace and newline tokens are emitted as plain text (no span wrapper).
 * All other tokens are wrapped in `<span class="hlts-{category}">`.
 * If a theme is provided, inline styles are used instead of classes.
 */
export function renderTokensToHtml(
  tokens: Token[],
  options: RenderOptions = {},
): string {
  const prefix = options.classPrefix ?? "hlts-";

  // Apply decorations if provided
  const decorated: DecoratedToken[] =
    options.decorations && options.decorations.length > 0
      ? applyDecorations(tokens, options.decorations)
      : tokens.map((token) => ({ token, extraClasses: [], extraAttrs: {} }));

  const parts: string[] = [];

  for (const { token, extraClasses, extraAttrs, extraStyle } of decorated) {
    // Whitespace and newline tokens pass through undecorated
    if (
      token.category === "whitespace" ||
      token.category === "newline"
    ) {
      parts.push(token.value);
      continue;
    }

    const escaped = escapeHtml(token.value);

    if (options.theme) {
      // Inline style mode
      const baseStyle = options.theme.styles[token.category] ?? "";
      const combinedStyle = extraStyle
        ? `${baseStyle};${extraStyle}`
        : baseStyle;
      const attrs = formatDataAttrs(extraAttrs);
      parts.push(`<span style="${combinedStyle}"${attrs}>${escaped}</span>`);
    } else {
      // CSS class mode
      const classes = [prefix + token.category, ...extraClasses].join(" ");
      const attrs = formatDataAttrs(extraAttrs);
      parts.push(`<span class="${classes}"${attrs}>${escaped}</span>`);
    }
  }

  return parts.join("");
}

function formatDataAttrs(attrs: Record<string, string>): string {
  const entries = Object.entries(attrs);
  if (entries.length === 0) return "";
  return entries
    .map(([k, v]) => ` data-${k}="${escapeHtml(v)}"`)
    .join("");
}
