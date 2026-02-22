// ---------------------------------------------------------------------------
// Decoration application: merge decoration metadata onto tokens
// ---------------------------------------------------------------------------

import type { Token, Range } from "tree-sitter-ts";
import type { Decoration } from "../types.js";
import { splitTokensAtRanges } from "./splitter.js";

/** A token with decoration metadata attached */
export interface DecoratedToken {
  token: Token;
  extraClasses: string[];
  extraAttrs: Record<string, string>;
  extraStyle?: string;
}

/**
 * Apply decorations to tokens.
 *
 * 1. Split tokens at decoration range boundaries.
 * 2. For each split token, find all decorations whose range contains it.
 * 3. Merge className, style, and data attributes from matching decorations.
 *
 * Decorations are sorted by priority (lower first) so higher-priority
 * decoration classes appear later in the class list.
 */
export function applyDecorations(
  tokens: Token[],
  decorations: Decoration[],
): DecoratedToken[] {
  if (decorations.length === 0) {
    return tokens.map((token) => ({ token, extraClasses: [], extraAttrs: {} }));
  }

  // Sort decorations by priority (ascending — lower priority first)
  const sorted = [...decorations].sort(
    (a, b) => (a.priority ?? 0) - (b.priority ?? 0),
  );

  // Split tokens at all decoration boundaries
  const ranges = sorted.map((d) => d.range);
  const splitTokens = splitTokensAtRanges(tokens, ranges);

  // For each split token, find matching decorations and merge metadata
  return splitTokens.map((token) => {
    const extraClasses: string[] = [];
    const extraAttrs: Record<string, string> = {};
    const styles: string[] = [];

    for (const decoration of sorted) {
      if (rangeContains(decoration.range, token.range)) {
        if (decoration.className) {
          extraClasses.push(decoration.className);
        }
        if (decoration.style) {
          styles.push(decoration.style);
        }
        if (decoration.data) {
          Object.assign(extraAttrs, decoration.data);
        }
      }
    }

    return {
      token,
      extraClasses,
      extraAttrs,
      extraStyle: styles.length > 0 ? styles.join(";") : undefined,
    };
  });
}

/**
 * Check if `outer` range fully contains `inner` range.
 * Uses half-open intervals: [start.offset, end.offset)
 */
function rangeContains(outer: Range, inner: Range): boolean {
  return (
    outer.start.offset <= inner.start.offset &&
    outer.end.offset >= inner.end.offset
  );
}
