// ---------------------------------------------------------------------------
// Token splitting at decoration range boundaries
// ---------------------------------------------------------------------------

import type { Token, Range, Position } from "tree-sitter-ts";

/**
 * Split tokens at the given range boundaries so that no token straddles
 * a boundary. Returns a new token array with the same content but potentially
 * more (smaller) tokens.
 *
 * Boundaries are defined by the start and end offsets of each range.
 * Uses half-open intervals [start.offset, end.offset).
 */
export function splitTokensAtRanges(
  tokens: Token[],
  ranges: Range[],
): Token[] {
  if (ranges.length === 0) return tokens;

  // Collect all unique boundary offsets
  const boundarySet = new Set<number>();
  for (const range of ranges) {
    boundarySet.add(range.start.offset);
    boundarySet.add(range.end.offset);
  }
  const boundaries = Array.from(boundarySet).sort((a, b) => a - b);

  if (boundaries.length === 0) return tokens;

  const result: Token[] = [];

  for (const token of tokens) {
    const tokenStart = token.range.start.offset;
    const tokenEnd = token.range.end.offset;

    // Find boundaries that fall strictly inside this token
    const splitPoints: number[] = [];
    for (const b of boundaries) {
      if (b > tokenStart && b < tokenEnd) {
        splitPoints.push(b);
      }
    }

    if (splitPoints.length === 0) {
      // No splits needed
      result.push(token);
      continue;
    }

    // Split the token at each boundary
    const cuts = [tokenStart, ...splitPoints, tokenEnd];
    for (let i = 0; i < cuts.length - 1; i++) {
      const sliceStart = cuts[i] - tokenStart;
      const sliceEnd = cuts[i + 1] - tokenStart;
      const value = token.value.substring(sliceStart, sliceEnd);

      if (value.length === 0) continue;

      const startPos = computePosition(token, sliceStart);
      const endPos = computePosition(token, sliceEnd);

      result.push({
        type: token.type,
        value,
        category: token.category,
        range: { start: startPos, end: endPos },
      });
    }
  }

  return result;
}

/**
 * Compute a Position within a token given a character offset from the token's start.
 */
function computePosition(token: Token, charOffset: number): Position {
  const baseOffset = token.range.start.offset;
  const baseLine = token.range.start.line;
  const baseColumn = token.range.start.column;

  // Walk through the token value to count lines and columns
  const text = token.value.substring(0, charOffset);
  let line = baseLine;
  let column = baseColumn;

  for (let i = 0; i < text.length; i++) {
    if (text[i] === "\n") {
      line++;
      column = 0;
    } else if (text[i] === "\r") {
      line++;
      column = 0;
      // Skip \n in \r\n
      if (i + 1 < text.length && text[i + 1] === "\n") {
        i++;
      }
    } else {
      column++;
    }
  }

  return { line, column, offset: baseOffset + charOffset };
}
