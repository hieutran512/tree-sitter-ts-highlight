# tree-sitter-ts-highlight

Fast syntax highlighting for Node and browser apps, built on `tree-sitter-ts`.

- HTML output (`<span>` tokens or full `<pre><code>` block)
- ANSI output for terminals/CLIs
- Side-by-side and inline diff highlighting
- Optional semantic token enhancement
- Built-in themes (CSS and JS theme objects)

## Installation

```bash
npm install tree-sitter-ts-highlight tree-sitter-ts
```

`tree-sitter-ts` is a peer dependency and must be installed by your app.

### Runtime requirements

- Node.js `>= 18`
- ESM and CommonJS are both supported via package exports

## Quick start

```ts
import { highlightBlock } from "tree-sitter-ts-highlight";
import "tree-sitter-ts-highlight/themes/github-dark.css";

const source = `export const answer = 42;`;
const html = highlightBlock(source, "typescript");

// html => <pre class="hlts hlts-lang-typescript"><code>...</code></pre>
```

If you want only token spans (no wrapper):

```ts
import { highlight } from "tree-sitter-ts-highlight";

const innerHtml = highlight("const x = 1;", "typescript");
// => <span class="hlts-keyword">const</span> ...
```

## Core API

### `highlight(source, language, options?)`
Returns syntax-highlighted HTML spans (no `<pre><code>` wrapper by default).

### `highlightBlock(source, language, options?)`
Returns a full `<pre><code>` block. Equivalent to `highlight(..., { wrapInPre: true })`.

### `highlightAnsi(source, language, options?)`
Returns ANSI-colored text for terminal output.

### `highlightDiff(oldSource, newSource, language, options?)`
Returns highlighted diff HTML. Supports:

- `view: "side-by-side"` (default)
- `view: "inline"`

### `diffModel(oldSource, newSource, options?)`
Returns a framework-agnostic diff model (`rows`, line numbers, change types) for custom rendering.

### `highlightTokens(tokens, options?)` / `highlightTokensAnsi(tokens, options?)`
Render pre-tokenized `tree-sitter-ts` tokens when tokenization is already done upstream.

### `enhanceSemantics(tokens)`
Reclassifies overloaded identifier tokens (for richer semantic highlighting categories).

## Common options

### HTML options (`HighlightOptions`)

- `semanticHighlighting?: boolean`
- `lineNumbers?: boolean`
- `startLine?: number`
- `classPrefix?: string` (default prefix is `hlts-`)
- `dataLineAttributes?: boolean`
- `wrapInPre?: boolean`
- `decorations?: Decoration[]`
- `theme?: HtmlTheme` (inline style mode)
- `language?: string` (adds `hlts-lang-<language>` class on `<pre>`)

### ANSI options (`AnsiHighlightOptions`)

- `semanticHighlighting?: boolean`
- `lineNumbers?: boolean`
- `startLine?: number`
- `lineNumberWidth?: number`
- `theme?: AnsiTheme`

### Diff options (`DiffOptions`)

- `view?: "side-by-side" | "inline"`
- `semanticHighlighting?: boolean`
- `classPrefix?: string`
- `decorations?: Decoration[]`
- `theme?: HtmlTheme`
- `oldLabel?: string`
- `newLabel?: string`
- `showHeader?: boolean`

## Theming

You can theme in two ways:

1. **CSS classes** (recommended for app UI)
2. **Inline styles** using exported theme objects

### 1) CSS theme import

```ts
import "tree-sitter-ts-highlight/themes/default-dark.css";
```

Available CSS themes:

- `default-light.css`
- `default-dark.css`
- `github-light.css`
- `github-dark.css`
- `monokai.css`
- `dracula.css`
- `nord.css`
- `solarized-light.css`
- `solarized-dark.css`
- `tokyo-night.css`
- `catppuccin-mocha.css`

### 2) Inline theme object

```ts
import { highlightBlock, githubDarkTheme } from "tree-sitter-ts-highlight";

const html = highlightBlock("const x = 1;", "typescript", {
  theme: githubDarkTheme,
});
```

## Line numbers and data attributes

```ts
import { highlight } from "tree-sitter-ts-highlight";

const html = highlight("a\nb\nc", "typescript", {
  lineNumbers: true,
  startLine: 10,
  dataLineAttributes: true,
});
```

When line numbers are enabled, output uses a table layout with `.hlts-table`, `.hlts-line-number`, and `.hlts-line-content`.

## Decorations

Use decorations to attach classes/styles/data attributes to source ranges.

```ts
import { highlight } from "tree-sitter-ts-highlight";

const source = "const value = 1;";

const html = highlight(source, "typescript", {
  decorations: [
    {
      range: {
        start: { line: 1, column: 6, offset: 6 },
        end: { line: 1, column: 11, offset: 11 },
      },
      className: "my-marker",
      data: { reason: "rename" },
      priority: 1,
    },
  ],
});
```

## Terminal / CLI usage

```ts
import { highlightAnsi } from "tree-sitter-ts-highlight";

const colored = highlightAnsi("function foo() { return 42; }", "javascript", {
  lineNumbers: true,
});

process.stdout.write(colored + "\n");
```

## Diff usage

```ts
import { highlightDiff } from "tree-sitter-ts-highlight";
import "tree-sitter-ts-highlight/themes/default-light.css";

const oldCode = "const x = 1;\nconsole.log(x);";
const newCode = "const x = 2;\nconsole.log(x);\nreturn x;";

const diffHtml = highlightDiff(oldCode, newCode, "typescript", {
  view: "side-by-side",
  oldLabel: "Before",
  newLabel: "After",
});
```

## Built-in exports

### Themes

- `defaultLightTheme`, `defaultDarkTheme`
- `githubLightTheme`, `githubDarkTheme`
- `monokaiTheme`, `draculaTheme`, `nordTheme`
- `solarizedLightTheme`, `solarizedDarkTheme`
- `tokyoNightTheme`, `catppuccinMochaTheme`
- `defaultAnsiTheme`
- `builtinThemes`, `getTheme(name)`, `getThemeNames()`

### Low-level utilities

- `renderTokensToHtml`, `renderTokensToAnsi`
- `wrapInLines`, `groupTokensByLine`
- `renderDiffToHtml`
- `createDiffModel`, `createDiffModelWithTokens`
- `applyDecorations`, `splitTokensAtRanges`
- `escapeHtml`
- `enhanceTokenSemantics`

## Language support

Language parsing/tokenization comes from `tree-sitter-ts`. Pass either language names (for example `"typescript"`, `"python"`) or extensions like `".ts"`.

## Development

```bash
npm install
npm run typecheck
npm test
npm run build
```

Demo app:

```bash
npm run demos:serve
```

## License

MIT
