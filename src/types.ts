// ---------------------------------------------------------------------------
// tree-sitter-ts-highlight - Public type definitions
// ---------------------------------------------------------------------------

import type { TokenCategory, Range } from "tree-sitter-ts";

// ─── HTML Highlight Options ──────────────────────────────────────────

/** Options for HTML highlight rendering */
export interface HighlightOptions {
  /** Reclassify overloaded identifiers into richer semantic categories (default: false) */
  semanticHighlighting?: boolean;
  /** Include line numbers (default: false) */
  lineNumbers?: boolean;
  /** Starting line number (default: 1). Useful for code snippets. */
  startLine?: number;
  /** CSS class prefix (default: "hlts-") */
  classPrefix?: string;
  /** Add data-line attribute to each line row (default: true when lineNumbers is true) */
  dataLineAttributes?: boolean;
  /** Wrap output in <pre><code> (default: false for highlight(), true for highlightBlock()) */
  wrapInPre?: boolean;
  /** Decorations to apply to specific ranges */
  decorations?: Decoration[];
  /** Custom theme for inline styles instead of CSS classes */
  theme?: HtmlTheme;
  /** Language name to add as class on wrapper (e.g., "hlts-lang-typescript") */
  language?: string;
}

// ─── Diff Options ───────────────────────────────────────────────────

export type DiffViewMode = "side-by-side" | "inline";

export type DiffChangeType =
  | "context"
  | "added"
  | "removed"
  | "modified";

/** One renderable row in a normalized diff model */
export interface DiffRow {
  /** Type of change represented by this row */
  changeType: DiffChangeType;
  /** Old document line number (null when not present) */
  oldLineNumber: number | null;
  /** New document line number (null when not present) */
  newLineNumber: number | null;
  /** Old line raw text */
  oldText: string;
  /** New line raw text */
  newText: string;
}

/** Framework-agnostic diff payload for HTML/React/Vue/CLI wrappers */
export interface DiffModel {
  oldLabel: string;
  newLabel: string;
  rows: DiffRow[];
}

/** Options for source-to-source diff rendering */
export interface DiffOptions {
  /** Side-by-side split view or single inline view (default: "side-by-side") */
  view?: DiffViewMode;
  /** Reclassify overloaded identifiers into richer semantic categories (default: false) */
  semanticHighlighting?: boolean;
  /** CSS class prefix (default: "hlts-") */
  classPrefix?: string;
  /** Decorations to apply to both old and new sides */
  decorations?: Decoration[];
  /** Custom theme for inline styles instead of CSS classes */
  theme?: HtmlTheme;
  /** Header label for old/original side (default: "Original") */
  oldLabel?: string;
  /** Header label for new/updated side (default: "Updated") */
  newLabel?: string;
  /** Include header row/labels in rendered output (default: true) */
  showHeader?: boolean;
}

// ─── ANSI Highlight Options ──────────────────────────────────────────

/** Options for ANSI terminal highlight rendering */
export interface AnsiHighlightOptions {
  /** Reclassify overloaded identifiers into richer semantic categories (default: false) */
  semanticHighlighting?: boolean;
  /** Include line numbers (default: false) */
  lineNumbers?: boolean;
  /** Starting line number (default: 1) */
  startLine?: number;
  /** Line number padding width (auto-calculated if not specified) */
  lineNumberWidth?: number;
  /** ANSI color theme (default: built-in 16-color theme) */
  theme?: AnsiTheme;
}

// ─── Decorations ─────────────────────────────────────────────────────

/** A decoration attached to a source range */
export interface Decoration {
  /** Range in source code this decoration covers */
  range: Range;
  /** CSS class(es) to add to spans within this range */
  className?: string;
  /** Inline styles to add */
  style?: string;
  /** Data attributes to add (key without "data-" prefix, value) */
  data?: Record<string, string>;
  /** Priority for ordering when decorations overlap (higher = outer wrapper). Default: 0 */
  priority?: number;
}

// ─── Themes ──────────────────────────────────────────────────────────

/** HTML theme: maps token categories to CSS style strings (for inline styling) */
export interface HtmlTheme {
  /** Theme display name */
  name: string;
  /** Background color for the code block */
  background?: string;
  /** Default text color */
  foreground?: string;
  /** Line number text color */
  lineNumberColor?: string;
  /** Line number border/separator color */
  lineNumberBorderColor?: string;
  /** Map of token category to inline CSS style string */
  styles: Partial<Record<TokenCategory, string>>;
}

/** ANSI theme: maps token categories to SGR codes */
export interface AnsiTheme {
  /** Theme display name */
  name: string;
  /** Map of token category to ANSI SGR code string (e.g., "35" for magenta) */
  colors: Partial<Record<TokenCategory, string>>;
  /** Line number SGR code */
  lineNumberColor?: string;
}
