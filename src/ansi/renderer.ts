// ---------------------------------------------------------------------------
// ANSI terminal output rendering: Token[] → colored terminal string
// ---------------------------------------------------------------------------

import type { Token } from "tree-sitter-ts";
import type { AnsiTheme } from "../types.js";
import { defaultAnsiTheme } from "../themes/ansi-default.js";
import { groupTokensByLine } from "../html/line-wrapper.js";
import { sgr } from "./codes.js";

export interface AnsiRenderOptions {
  /** ANSI color theme */
  theme?: AnsiTheme;
  /** Include line numbers */
  lineNumbers?: boolean;
  /** Starting line number (default: 1) */
  startLine?: number;
  /** Line number padding width (auto-calculated if not specified) */
  lineNumberWidth?: number;
}

/**
 * Render tokens to an ANSI-colored string for terminal output.
 */
export function renderTokensToAnsi(
  tokens: Token[],
  options: AnsiRenderOptions = {},
): string {
  const theme = options.theme ?? defaultAnsiTheme;

  if (options.lineNumbers) {
    return renderWithLineNumbers(tokens, theme, options);
  }

  return renderFlat(tokens, theme);
}

function renderFlat(tokens: Token[], theme: AnsiTheme): string {
  const parts: string[] = [];

  for (const token of tokens) {
    if (
      token.category === "whitespace" ||
      token.category === "newline"
    ) {
      parts.push(token.value);
      continue;
    }

    const code = theme.colors[token.category];
    parts.push(code ? sgr(code, token.value) : token.value);
  }

  return parts.join("");
}

function renderWithLineNumbers(
  tokens: Token[],
  theme: AnsiTheme,
  options: AnsiRenderOptions,
): string {
  const startLine = options.startLine ?? 1;
  const groups = groupTokensByLine(tokens);

  if (groups.length === 0) return "";

  const totalLines = groups.length;
  const width =
    options.lineNumberWidth ??
    String(startLine + totalLines - 1).length;

  const lineNumColor = theme.lineNumberColor ?? "90";
  const lines: string[] = [];

  for (const group of groups) {
    const displayLine = group.lineNumber - groups[0].lineNumber + startLine;
    const paddedNum = String(displayLine).padStart(width);
    const lineNumStr = sgr(lineNumColor, paddedNum) + " │ ";

    // Render tokens for this line
    const content: string[] = [];
    for (const token of group.tokens) {
      if (
        token.category === "whitespace" ||
        token.category === "newline"
      ) {
        // Only include whitespace, skip newlines (we add them ourselves)
        if (token.category === "whitespace") {
          content.push(token.value);
        }
        continue;
      }

      const code = theme.colors[token.category];
      content.push(code ? sgr(code, token.value) : token.value);
    }

    lines.push(lineNumStr + content.join(""));
  }

  return lines.join("\n");
}
