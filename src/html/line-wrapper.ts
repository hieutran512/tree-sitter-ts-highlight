// ---------------------------------------------------------------------------
// Line grouping and table wrapping for line-number support
// ---------------------------------------------------------------------------

import type { Token, Position } from "tree-sitter-ts";

/** A group of tokens belonging to a single source line */
export interface LineGroup {
  lineNumber: number;
  tokens: Token[];
}

/**
 * Group tokens into lines. Tokens that span multiple lines (e.g., multiline
 * comments or template strings) are split at newline boundaries so that
 * each LineGroup contains only tokens from a single line.
 */
export function groupTokensByLine(tokens: Token[]): LineGroup[] {
  const lineMap = new Map<number, Token[]>();

  for (const token of tokens) {
    const fragments = splitTokenAtNewlines(token);
    for (const fragment of fragments) {
      const line = fragment.range.start.line;
      let group = lineMap.get(line);
      if (!group) {
        group = [];
        lineMap.set(line, group);
      }
      group.push(fragment);
    }
  }

  // Sort by line number and return
  const lineNumbers = Array.from(lineMap.keys()).sort((a, b) => a - b);

  // Fill in empty lines (lines with no tokens between first and last)
  if (lineNumbers.length === 0) return [];

  const firstLine = lineNumbers[0];
  const lastLine = lineNumbers[lineNumbers.length - 1];
  const result: LineGroup[] = [];

  for (let line = firstLine; line <= lastLine; line++) {
    result.push({
      lineNumber: line,
      tokens: lineMap.get(line) ?? [],
    });
  }

  return result;
}

/**
 * Split a token at newline characters into multiple fragments.
 * Each fragment has adjusted range and value for its line.
 * Tokens that don't contain newlines are returned as-is.
 */
function splitTokenAtNewlines(token: Token): Token[] {
  const { value } = token;

  // Fast path: no newlines
  if (!value.includes("\n") && !value.includes("\r")) {
    return [token];
  }

  const fragments: Token[] = [];
  let currentOffset = token.range.start.offset;
  let currentLine = token.range.start.line;
  let currentColumn = token.range.start.column;
  let segmentStart = 0;

  for (let i = 0; i <= value.length; i++) {
    const ch = value[i];
    const isEnd = i === value.length;
    const isNewline = ch === "\n" || ch === "\r";

    if (isNewline || isEnd) {
      // Include the newline character(s) in the current segment
      let segmentEnd = i;
      if (isNewline) {
        segmentEnd = i + 1;
        if (ch === "\r" && i + 1 < value.length && value[i + 1] === "\n") {
          segmentEnd = i + 2;
        }
      }

      if (segmentEnd > segmentStart) {
        const segmentValue = value.substring(segmentStart, segmentEnd);
        const startPos: Position = {
          line: currentLine,
          column: currentColumn,
          offset: currentOffset,
        };
        const endPos: Position = {
          line: isNewline ? currentLine : currentLine,
          column: isNewline ? currentColumn + (segmentEnd - segmentStart) : currentColumn + (segmentEnd - segmentStart),
          offset: currentOffset + (segmentEnd - segmentStart),
        };

        fragments.push({
          type: token.type,
          value: segmentValue,
          category: token.category,
          range: { start: startPos, end: endPos },
        });

        currentOffset += segmentEnd - segmentStart;
      }

      if (isNewline) {
        currentLine++;
        currentColumn = 0;
        segmentStart = segmentEnd;
        // Skip ahead past \r\n
        if (ch === "\r" && i + 1 < value.length && value[i + 1] === "\n") {
          i++;
        }
      }
    }
  }

  return fragments.length > 0 ? fragments : [token];
}

/**
 * Wrap tokens in a line-number table structure.
 *
 * @param tokens - All tokens to render
 * @param renderLine - Function that renders a line's tokens to HTML
 * @param options - Line wrapping options
 * @returns HTML table string
 */
export function wrapInLines(
  tokens: Token[],
  renderLine: (lineTokens: Token[]) => string,
  options: {
    startLine?: number;
    dataLineAttributes?: boolean;
  } = {},
): string {
  const startLine = options.startLine ?? 1;
  const dataAttrs = options.dataLineAttributes ?? true;
  const groups = groupTokensByLine(tokens);

  if (groups.length === 0) {
    return '<table class="hlts-table"><tbody></tbody></table>';
  }

  const rows: string[] = [];
  for (const group of groups) {
    const displayLine = group.lineNumber - groups[0].lineNumber + startLine;
    const lineContent = renderLine(group.tokens);
    const dataAttr = dataAttrs ? ` data-line="${displayLine}"` : "";

    rows.push(
      `<tr${dataAttr}>` +
        `<td class="hlts-line-number">${displayLine}</td>` +
        `<td class="hlts-line-content">${lineContent}</td>` +
        `</tr>`,
    );
  }

  return `<table class="hlts-table"><tbody>${rows.join("")}</tbody></table>`;
}
