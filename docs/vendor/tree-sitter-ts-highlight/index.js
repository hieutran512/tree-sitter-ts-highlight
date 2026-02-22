// src/index.ts
import { tokenize as tokenize2 } from "tree-sitter-ts";

// src/decorations/splitter.ts
function splitTokensAtRanges(tokens, ranges) {
  if (ranges.length === 0) return tokens;
  const boundarySet = /* @__PURE__ */ new Set();
  for (const range of ranges) {
    boundarySet.add(range.start.offset);
    boundarySet.add(range.end.offset);
  }
  const boundaries = Array.from(boundarySet).sort((a, b) => a - b);
  if (boundaries.length === 0) return tokens;
  const result = [];
  for (const token of tokens) {
    const tokenStart = token.range.start.offset;
    const tokenEnd = token.range.end.offset;
    const splitPoints = [];
    for (const b of boundaries) {
      if (b > tokenStart && b < tokenEnd) {
        splitPoints.push(b);
      }
    }
    if (splitPoints.length === 0) {
      result.push(token);
      continue;
    }
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
        range: { start: startPos, end: endPos }
      });
    }
  }
  return result;
}
function computePosition(token, charOffset) {
  const baseOffset = token.range.start.offset;
  const baseLine = token.range.start.line;
  const baseColumn = token.range.start.column;
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
      if (i + 1 < text.length && text[i + 1] === "\n") {
        i++;
      }
    } else {
      column++;
    }
  }
  return { line, column, offset: baseOffset + charOffset };
}

// src/decorations/decorator.ts
function applyDecorations(tokens, decorations) {
  if (decorations.length === 0) {
    return tokens.map((token) => ({ token, extraClasses: [], extraAttrs: {} }));
  }
  const sorted = [...decorations].sort(
    (a, b) => (a.priority ?? 0) - (b.priority ?? 0)
  );
  const ranges = sorted.map((d) => d.range);
  const splitTokens = splitTokensAtRanges(tokens, ranges);
  return splitTokens.map((token) => {
    const extraClasses = [];
    const extraAttrs = {};
    const styles = [];
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
      extraStyle: styles.length > 0 ? styles.join(";") : void 0
    };
  });
}
function rangeContains(outer, inner) {
  return outer.start.offset <= inner.start.offset && outer.end.offset >= inner.end.offset;
}

// src/html/escaper.ts
var ESCAPE_MAP = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
};
var ESCAPE_RE = /[&<>"']/g;
function escapeHtml(text) {
  return text.replace(ESCAPE_RE, (ch) => ESCAPE_MAP[ch]);
}

// src/html/renderer.ts
function renderTokensToHtml(tokens, options = {}) {
  const prefix = options.classPrefix ?? "hlts-";
  const decorated = options.decorations && options.decorations.length > 0 ? applyDecorations(tokens, options.decorations) : tokens.map((token) => ({ token, extraClasses: [], extraAttrs: {} }));
  const parts = [];
  for (const { token, extraClasses, extraAttrs, extraStyle } of decorated) {
    if (token.category === "whitespace" || token.category === "newline") {
      parts.push(token.value);
      continue;
    }
    const escaped = escapeHtml(token.value);
    if (options.theme) {
      const baseStyle = options.theme.styles[token.category] ?? "";
      const combinedStyle = extraStyle ? `${baseStyle};${extraStyle}` : baseStyle;
      const attrs = formatDataAttrs(extraAttrs);
      parts.push(`<span style="${combinedStyle}"${attrs}>${escaped}</span>`);
    } else {
      const classes = [prefix + token.category, ...extraClasses].join(" ");
      const attrs = formatDataAttrs(extraAttrs);
      parts.push(`<span class="${classes}"${attrs}>${escaped}</span>`);
    }
  }
  return parts.join("");
}
function formatDataAttrs(attrs) {
  const entries = Object.entries(attrs);
  if (entries.length === 0) return "";
  return entries.map(([k, v]) => ` data-${k}="${escapeHtml(v)}"`).join("");
}

// src/html/diff-renderer.ts
function renderDiffToHtml(diff, options = {}) {
  const view = options.view ?? "side-by-side";
  const prefix = options.classPrefix ?? "hlts-";
  if (view === "inline") {
    return renderInlineDiff(diff, options, prefix);
  }
  return renderSideBySideDiff(diff, options, prefix);
}
function renderSideBySideDiff(diff, options, prefix) {
  const { model } = diff;
  const showHeader = options.showHeader ?? true;
  const rows = [];
  if (showHeader) {
    rows.push(
      `<tr class="${prefix}diff-header"><th class="${prefix}diff-label" colspan="2">${escapeHtml(model.oldLabel)}</th><th class="${prefix}diff-label" colspan="2">${escapeHtml(model.newLabel)}</th></tr>`
    );
  }
  for (const row of model.rows) {
    const className = `${prefix}diff-row ${prefix}diff-${row.changeType}`;
    const oldContent = renderLineContent(
      row.oldLineNumber,
      diff.oldLineTokens,
      options,
      row.oldText
    );
    const newContent = renderLineContent(
      row.newLineNumber,
      diff.newLineTokens,
      options,
      row.newText
    );
    rows.push(
      `<tr class="${className}"><td class="${prefix}diff-gutter">${formatLineNumber(row.oldLineNumber)}</td><td class="${prefix}diff-content">${oldContent}</td><td class="${prefix}diff-gutter">${formatLineNumber(row.newLineNumber)}</td><td class="${prefix}diff-content">${newContent}</td></tr>`
    );
  }
  return `<table class="${prefix}diff ${prefix}diff-side-by-side"><tbody>${rows.join("")}</tbody></table>`;
}
function renderInlineDiff(diff, options, prefix) {
  const rows = [];
  for (const row of diff.model.rows) {
    if (row.changeType === "context") {
      rows.push(
        `<tr class="${prefix}diff-row ${prefix}diff-context"><td class="${prefix}diff-gutter">${formatLineNumber(row.newLineNumber)}</td><td class="${prefix}diff-sign"> </td><td class="${prefix}diff-content">${renderLineContent(
          row.newLineNumber,
          diff.newLineTokens,
          options,
          row.newText
        )}</td></tr>`
      );
      continue;
    }
    if (row.oldLineNumber !== null) {
      rows.push(
        `<tr class="${prefix}diff-row ${prefix}diff-removed"><td class="${prefix}diff-gutter">${formatLineNumber(row.oldLineNumber)}</td><td class="${prefix}diff-sign">-</td><td class="${prefix}diff-content">${renderLineContent(
          row.oldLineNumber,
          diff.oldLineTokens,
          options,
          row.oldText
        )}</td></tr>`
      );
    }
    if (row.newLineNumber !== null) {
      rows.push(
        `<tr class="${prefix}diff-row ${prefix}diff-added"><td class="${prefix}diff-gutter">${formatLineNumber(row.newLineNumber)}</td><td class="${prefix}diff-sign">+</td><td class="${prefix}diff-content">${renderLineContent(
          row.newLineNumber,
          diff.newLineTokens,
          options,
          row.newText
        )}</td></tr>`
      );
    }
  }
  return `<table class="${prefix}diff ${prefix}diff-inline"><tbody>${rows.join("")}</tbody></table>`;
}
function renderLineContent(lineNumber, tokenMap, options, fallbackText) {
  if (lineNumber === null) return "";
  const tokens = tokenMap.get(lineNumber);
  if (!tokens || tokens.length === 0) {
    return escapeHtml(fallbackText);
  }
  return renderTokensToHtml(tokens, {
    classPrefix: options.classPrefix,
    theme: options.theme,
    decorations: options.decorations
  });
}
function formatLineNumber(lineNumber) {
  return lineNumber === null ? "" : String(lineNumber);
}

// src/html/line-wrapper.ts
function groupTokensByLine(tokens) {
  const lineMap = /* @__PURE__ */ new Map();
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
  const lineNumbers = Array.from(lineMap.keys()).sort((a, b) => a - b);
  if (lineNumbers.length === 0) return [];
  const firstLine = lineNumbers[0];
  const lastLine = lineNumbers[lineNumbers.length - 1];
  const result = [];
  for (let line = firstLine; line <= lastLine; line++) {
    result.push({
      lineNumber: line,
      tokens: lineMap.get(line) ?? []
    });
  }
  return result;
}
function splitTokenAtNewlines(token) {
  const { value } = token;
  if (!value.includes("\n") && !value.includes("\r")) {
    return [token];
  }
  const fragments = [];
  let currentOffset = token.range.start.offset;
  let currentLine = token.range.start.line;
  let currentColumn = token.range.start.column;
  let segmentStart = 0;
  for (let i = 0; i <= value.length; i++) {
    const ch = value[i];
    const isEnd = i === value.length;
    const isNewline = ch === "\n" || ch === "\r";
    if (isNewline || isEnd) {
      let segmentEnd = i;
      if (isNewline) {
        segmentEnd = i + 1;
        if (ch === "\r" && i + 1 < value.length && value[i + 1] === "\n") {
          segmentEnd = i + 2;
        }
      }
      if (segmentEnd > segmentStart) {
        const segmentValue = value.substring(segmentStart, segmentEnd);
        const startPos = {
          line: currentLine,
          column: currentColumn,
          offset: currentOffset
        };
        const endPos = {
          line: isNewline ? currentLine : currentLine,
          column: isNewline ? currentColumn + (segmentEnd - segmentStart) : currentColumn + (segmentEnd - segmentStart),
          offset: currentOffset + (segmentEnd - segmentStart)
        };
        fragments.push({
          type: token.type,
          value: segmentValue,
          category: token.category,
          range: { start: startPos, end: endPos }
        });
        currentOffset += segmentEnd - segmentStart;
      }
      if (isNewline) {
        currentLine++;
        currentColumn = 0;
        segmentStart = segmentEnd;
        if (ch === "\r" && i + 1 < value.length && value[i + 1] === "\n") {
          i++;
        }
      }
    }
  }
  return fragments.length > 0 ? fragments : [token];
}
function wrapInLines(tokens, renderLine, options = {}) {
  const startLine = options.startLine ?? 1;
  const dataAttrs = options.dataLineAttributes ?? true;
  const groups = groupTokensByLine(tokens);
  if (groups.length === 0) {
    return '<table class="hlts-table"><tbody></tbody></table>';
  }
  const rows = [];
  for (const group of groups) {
    const displayLine = group.lineNumber - groups[0].lineNumber + startLine;
    const lineContent = renderLine(group.tokens);
    const dataAttr = dataAttrs ? ` data-line="${displayLine}"` : "";
    rows.push(
      `<tr${dataAttr}><td class="hlts-line-number">${displayLine}</td><td class="hlts-line-content">${lineContent}</td></tr>`
    );
  }
  return `<table class="hlts-table"><tbody>${rows.join("")}</tbody></table>`;
}

// src/themes/ansi-default.ts
var defaultAnsiTheme = {
  name: "ansi-default",
  lineNumberColor: "90",
  // bright black (gray)
  colors: {
    keyword: "35;1",
    // magenta bold
    identifier: "0",
    // default
    string: "32",
    // green
    number: "33",
    // yellow
    comment: "90;3",
    // bright black italic
    operator: "0",
    // default
    punctuation: "0",
    // default
    type: "33;1",
    // yellow bold
    decorator: "35",
    // magenta
    tag: "31",
    // red
    attribute: "33",
    // yellow
    meta: "90",
    // bright black
    regexp: "32",
    // green
    escape: "33;1",
    // yellow bold
    variable: "31",
    // red
    constant: "33",
    // yellow
    error: "31;4",
    // red underline
    plain: "0"
    // default
  }
};

// src/ansi/codes.ts
var ESC = "\x1B[";
var RESET = `${ESC}0m`;
function sgr(code, text) {
  if (!code || code === "0") return text;
  return `${ESC}${code}m${text}${RESET}`;
}

// src/ansi/renderer.ts
function renderTokensToAnsi(tokens, options = {}) {
  const theme = options.theme ?? defaultAnsiTheme;
  if (options.lineNumbers) {
    return renderWithLineNumbers(tokens, theme, options);
  }
  return renderFlat(tokens, theme);
}
function renderFlat(tokens, theme) {
  const parts = [];
  for (const token of tokens) {
    if (token.category === "whitespace" || token.category === "newline") {
      parts.push(token.value);
      continue;
    }
    const code = theme.colors[token.category];
    parts.push(code ? sgr(code, token.value) : token.value);
  }
  return parts.join("");
}
function renderWithLineNumbers(tokens, theme, options) {
  const startLine = options.startLine ?? 1;
  const groups = groupTokensByLine(tokens);
  if (groups.length === 0) return "";
  const totalLines = groups.length;
  const width = options.lineNumberWidth ?? String(startLine + totalLines - 1).length;
  const lineNumColor = theme.lineNumberColor ?? "90";
  const lines = [];
  for (const group of groups) {
    const displayLine = group.lineNumber - groups[0].lineNumber + startLine;
    const paddedNum = String(displayLine).padStart(width);
    const lineNumStr = sgr(lineNumColor, paddedNum) + " \u2502 ";
    const content = [];
    for (const token of group.tokens) {
      if (token.category === "whitespace" || token.category === "newline") {
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

// src/semantic/enhancer.ts
var TYPE_KEYWORDS = /* @__PURE__ */ new Set([
  "class",
  "interface",
  "type",
  "enum",
  "struct",
  "trait",
  "namespace",
  "module"
]);
var VARIABLE_DECL_KEYWORDS = /* @__PURE__ */ new Set([
  "const",
  "let",
  "var",
  "val",
  "final"
]);
var FUNCTION_DECL_KEYWORDS = /* @__PURE__ */ new Set([
  "function",
  "def",
  "fn"
]);
var CONSTANT_LITERALS = /* @__PURE__ */ new Set([
  "true",
  "false",
  "null",
  "undefined",
  "None",
  "nil"
]);
var PRIMITIVE_TYPE_NAMES = /* @__PURE__ */ new Set([
  "string",
  "number",
  "boolean",
  "object",
  "void",
  "never",
  "unknown",
  "any",
  "int",
  "float",
  "double",
  "char",
  "str",
  "bytes"
]);
var BUILTIN_TYPE_LIKE_NAMES = /* @__PURE__ */ new Set([
  "Array",
  "Map",
  "Set",
  "Date",
  "Promise",
  "Error",
  "RegExp",
  "Math",
  "JSON",
  "console"
]);
var isAlphaNumOrUnderscore = /^[A-Za-z0-9_]+$/;
var isUpperSnakeCase = /^[A-Z][A-Z0-9_]*$/;
var isPascalCase = /^[A-Z][A-Za-z0-9_]*$/;
function enhanceTokenSemantics(tokens) {
  const indexed = tokens.map((token, index) => ({ token, index })).filter(({ token }) => token.category !== "whitespace" && token.category !== "newline");
  if (indexed.length === 0) return tokens;
  const categoryOverrides = /* @__PURE__ */ new Map();
  for (let i = 0; i < indexed.length; i++) {
    const current = indexed[i];
    const prev = i > 0 ? indexed[i - 1] : void 0;
    const next = i + 1 < indexed.length ? indexed[i + 1] : void 0;
    const next2 = i + 2 < indexed.length ? indexed[i + 2] : void 0;
    applyConstantLiteralHeuristic(current, categoryOverrides);
    applyIdentifierHeuristics(current, prev, next, next2, categoryOverrides);
  }
  if (categoryOverrides.size === 0) return tokens;
  return tokens.map((token, index) => {
    const override = categoryOverrides.get(index);
    if (!override || override === token.category) return token;
    return { ...token, category: override };
  });
}
function applyConstantLiteralHeuristic(current, overrides) {
  const { token, index } = current;
  if (token.category !== "identifier") return;
  if (CONSTANT_LITERALS.has(token.value)) {
    overrides.set(index, "constant");
  }
}
function applyIdentifierHeuristics(current, prev, next, next2, overrides) {
  const { token, index } = current;
  if (token.category !== "identifier") return;
  if (!isAlphaNumOrUnderscore.test(token.value)) return;
  if (prev?.token.value === ".") {
    overrides.set(index, "attribute");
    return;
  }
  if (isUpperSnakeCase.test(token.value)) {
    overrides.set(index, "constant");
    return;
  }
  if (PRIMITIVE_TYPE_NAMES.has(token.value) || BUILTIN_TYPE_LIKE_NAMES.has(token.value)) {
    overrides.set(index, "type");
    return;
  }
  if (isPascalCase.test(token.value)) {
    overrides.set(index, "type");
    return;
  }
  if (prev?.token.category === "keyword" && TYPE_KEYWORDS.has(prev.token.value)) {
    overrides.set(index, "type");
    return;
  }
  if (prev?.token.category === "keyword" && FUNCTION_DECL_KEYWORDS.has(prev.token.value)) {
    overrides.set(index, "variable");
    return;
  }
  if (prev?.token.category === "keyword" && VARIABLE_DECL_KEYWORDS.has(prev.token.value)) {
    overrides.set(index, "variable");
    return;
  }
  if (next?.token.value === "=" && prev?.token.value !== ".") {
    overrides.set(index, "attribute");
    return;
  }
  if (prev?.token.value === "(" && next?.token.value === ")" && next2?.token.value === "=>") {
    overrides.set(index, "variable");
    return;
  }
  if (next?.token.value === "(") {
    overrides.set(index, "variable");
    return;
  }
}

// src/diff/model.ts
import { tokenize } from "tree-sitter-ts";
function createDiffModel(oldSource, newSource, options = {}) {
  const oldLines = splitLines(oldSource);
  const newLines = splitLines(newSource);
  const pairs = alignLinePairs(oldLines, newLines);
  const rows = pairs.map((pair) => {
    const { oldLineNumber, newLineNumber, oldText, newText } = pair;
    let changeType = "context";
    if (oldLineNumber === null) {
      changeType = "added";
    } else if (newLineNumber === null) {
      changeType = "removed";
    } else if (oldText !== newText) {
      changeType = "modified";
    }
    return {
      changeType,
      oldLineNumber,
      newLineNumber,
      oldText,
      newText
    };
  });
  return {
    oldLabel: options.oldLabel ?? "Original",
    newLabel: options.newLabel ?? "Updated",
    rows
  };
}
function createDiffModelWithTokens(oldSource, newSource, language, options = {}) {
  const model = createDiffModel(oldSource, newSource, options);
  const oldLineTokens = tokenizeSourceByLine(oldSource, language, options);
  const newLineTokens = tokenizeSourceByLine(newSource, language, options);
  return {
    model,
    oldLineTokens,
    newLineTokens
  };
}
function tokenizeSourceByLine(source, language, options) {
  const rawTokens = tokenize(source, language);
  const tokens = options.semanticHighlighting ? enhanceTokenSemantics(rawTokens) : rawTokens;
  const grouped = groupTokensByLine(tokens);
  const map = /* @__PURE__ */ new Map();
  for (const group of grouped) {
    map.set(group.lineNumber, group.tokens);
  }
  return map;
}
function splitLines(source) {
  const normalized = source.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  return normalized.split("\n");
}
function alignLinePairs(oldLines, newLines) {
  const ops = buildLineOps(oldLines, newLines);
  const rows = [];
  let index = 0;
  while (index < ops.length) {
    const op = ops[index];
    if (op.kind === "equal") {
      rows.push({
        oldLineNumber: op.oldIndex + 1,
        newLineNumber: op.newIndex + 1,
        oldText: oldLines[op.oldIndex],
        newText: newLines[op.newIndex]
      });
      index++;
      continue;
    }
    const deleted = [];
    const added = [];
    while (index < ops.length && ops[index].kind === "delete") {
      deleted.push(ops[index].oldIndex);
      index++;
    }
    while (index < ops.length && ops[index].kind === "add") {
      added.push(ops[index].newIndex);
      index++;
    }
    if (deleted.length === 0 && added.length === 0) {
      continue;
    }
    const width = Math.max(deleted.length, added.length);
    for (let i = 0; i < width; i++) {
      const oldIndex = deleted[i];
      const newIndex = added[i];
      rows.push({
        oldLineNumber: oldIndex === void 0 ? null : oldIndex + 1,
        newLineNumber: newIndex === void 0 ? null : newIndex + 1,
        oldText: oldIndex === void 0 ? "" : oldLines[oldIndex],
        newText: newIndex === void 0 ? "" : newLines[newIndex]
      });
    }
  }
  return rows;
}
function buildLineOps(oldLines, newLines) {
  const m = oldLines.length;
  const n = newLines.length;
  const dp = Array.from(
    { length: m + 1 },
    () => Array(n + 1).fill(0)
  );
  for (let i2 = m - 1; i2 >= 0; i2--) {
    for (let j2 = n - 1; j2 >= 0; j2--) {
      if (oldLines[i2] === newLines[j2]) {
        dp[i2][j2] = dp[i2 + 1][j2 + 1] + 1;
      } else {
        dp[i2][j2] = Math.max(dp[i2 + 1][j2], dp[i2][j2 + 1]);
      }
    }
  }
  const ops = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (oldLines[i] === newLines[j]) {
      ops.push({ kind: "equal", oldIndex: i, newIndex: j });
      i++;
      j++;
      continue;
    }
    if (dp[i + 1][j] >= dp[i][j + 1]) {
      ops.push({ kind: "delete", oldIndex: i });
      i++;
    } else {
      ops.push({ kind: "add", newIndex: j });
      j++;
    }
  }
  while (i < m) {
    ops.push({ kind: "delete", oldIndex: i });
    i++;
  }
  while (j < n) {
    ops.push({ kind: "add", newIndex: j });
    j++;
  }
  return ops;
}

// src/themes/default-light.ts
var defaultLightTheme = {
  name: "default-light",
  background: "#fafafa",
  foreground: "#383a42",
  lineNumberColor: "#a0a1a7",
  lineNumberBorderColor: "#e0e0e0",
  styles: {
    keyword: "color:#a626a4;font-weight:bold",
    identifier: "color:#383a42",
    string: "color:#50a14f",
    number: "color:#986801",
    comment: "color:#a0a1a7;font-style:italic",
    operator: "color:#383a42",
    punctuation: "color:#383a42",
    type: "color:#c18401",
    decorator: "color:#a626a4",
    tag: "color:#e45649",
    attribute: "color:#986801",
    meta: "color:#a0a1a7",
    regexp: "color:#50a14f",
    escape: "color:#986801;font-weight:bold",
    variable: "color:#e45649",
    constant: "color:#986801",
    error: "color:#e45649;text-decoration:wavy underline",
    plain: "color:#383a42"
  }
};

// src/themes/default-dark.ts
var defaultDarkTheme = {
  name: "default-dark",
  background: "#282c34",
  foreground: "#abb2bf",
  lineNumberColor: "#636d83",
  lineNumberBorderColor: "#3b4048",
  styles: {
    keyword: "color:#c678dd;font-weight:bold",
    identifier: "color:#abb2bf",
    string: "color:#98c379",
    number: "color:#d19a66",
    comment: "color:#5c6370;font-style:italic",
    operator: "color:#abb2bf",
    punctuation: "color:#abb2bf",
    type: "color:#e5c07b",
    decorator: "color:#c678dd",
    tag: "color:#e06c75",
    attribute: "color:#d19a66",
    meta: "color:#5c6370",
    regexp: "color:#98c379",
    escape: "color:#d19a66;font-weight:bold",
    variable: "color:#e06c75",
    constant: "color:#d19a66",
    error: "color:#e06c75;text-decoration:wavy underline",
    plain: "color:#abb2bf"
  }
};

// src/themes/github-light.ts
var githubLightTheme = {
  name: "github-light",
  background: "#ffffff",
  foreground: "#1f2328",
  lineNumberColor: "#8c959f",
  lineNumberBorderColor: "#d1d9e0",
  styles: {
    keyword: "color:#cf222e;font-weight:bold",
    identifier: "color:#1f2328",
    string: "color:#0a3069",
    number: "color:#0550ae",
    comment: "color:#6e7781;font-style:italic",
    operator: "color:#1f2328",
    punctuation: "color:#1f2328",
    type: "color:#953800",
    decorator: "color:#8250df",
    tag: "color:#116329",
    attribute: "color:#0550ae",
    meta: "color:#6e7781",
    regexp: "color:#0a3069",
    escape: "color:#0550ae;font-weight:bold",
    variable: "color:#953800",
    constant: "color:#0550ae",
    error: "color:#cf222e;text-decoration:wavy underline",
    plain: "color:#1f2328"
  }
};

// src/themes/github-dark.ts
var githubDarkTheme = {
  name: "github-dark",
  background: "#0d1117",
  foreground: "#e6edf3",
  lineNumberColor: "#6e7681",
  lineNumberBorderColor: "#30363d",
  styles: {
    keyword: "color:#ff7b72;font-weight:bold",
    identifier: "color:#e6edf3",
    string: "color:#a5d6ff",
    number: "color:#79c0ff",
    comment: "color:#8b949e;font-style:italic",
    operator: "color:#e6edf3",
    punctuation: "color:#e6edf3",
    type: "color:#ffa657",
    decorator: "color:#d2a8ff",
    tag: "color:#7ee787",
    attribute: "color:#79c0ff",
    meta: "color:#8b949e",
    regexp: "color:#a5d6ff",
    escape: "color:#79c0ff;font-weight:bold",
    variable: "color:#ffa657",
    constant: "color:#79c0ff",
    error: "color:#ff7b72;text-decoration:wavy underline",
    plain: "color:#e6edf3"
  }
};

// src/themes/monokai.ts
var monokaiTheme = {
  name: "monokai",
  background: "#272822",
  foreground: "#f8f8f2",
  lineNumberColor: "#90908a",
  lineNumberBorderColor: "#3e3d32",
  styles: {
    keyword: "color:#f92672;font-weight:bold",
    identifier: "color:#f8f8f2",
    string: "color:#e6db74",
    number: "color:#ae81ff",
    comment: "color:#75715e;font-style:italic",
    operator: "color:#f92672",
    punctuation: "color:#f8f8f2",
    type: "color:#66d9ef;font-style:italic",
    decorator: "color:#66d9ef",
    tag: "color:#f92672",
    attribute: "color:#a6e22e",
    meta: "color:#75715e",
    regexp: "color:#e6db74",
    escape: "color:#ae81ff;font-weight:bold",
    variable: "color:#fd971f",
    constant: "color:#ae81ff",
    error: "color:#f92672;text-decoration:wavy underline",
    plain: "color:#f8f8f2"
  }
};

// src/themes/dracula.ts
var draculaTheme = {
  name: "dracula",
  background: "#282a36",
  foreground: "#f8f8f2",
  lineNumberColor: "#6272a4",
  lineNumberBorderColor: "#44475a",
  styles: {
    keyword: "color:#ff79c6;font-weight:bold",
    identifier: "color:#f8f8f2",
    string: "color:#f1fa8c",
    number: "color:#bd93f9",
    comment: "color:#6272a4;font-style:italic",
    operator: "color:#ff79c6",
    punctuation: "color:#f8f8f2",
    type: "color:#8be9fd;font-style:italic",
    decorator: "color:#50fa7b",
    tag: "color:#ff79c6",
    attribute: "color:#50fa7b",
    meta: "color:#6272a4",
    regexp: "color:#f1fa8c",
    escape: "color:#bd93f9;font-weight:bold",
    variable: "color:#ffb86c",
    constant: "color:#bd93f9",
    error: "color:#ff5555;text-decoration:wavy underline",
    plain: "color:#f8f8f2"
  }
};

// src/themes/nord.ts
var nordTheme = {
  name: "nord",
  background: "#2e3440",
  foreground: "#d8dee9",
  lineNumberColor: "#4c566a",
  lineNumberBorderColor: "#3b4252",
  styles: {
    keyword: "color:#81a1c1;font-weight:bold",
    identifier: "color:#d8dee9",
    string: "color:#a3be8c",
    number: "color:#b48ead",
    comment: "color:#616e88;font-style:italic",
    operator: "color:#81a1c1",
    punctuation: "color:#eceff4",
    type: "color:#8fbcbb",
    decorator: "color:#d08770",
    tag: "color:#81a1c1",
    attribute: "color:#8fbcbb",
    meta: "color:#616e88",
    regexp: "color:#ebcb8b",
    escape: "color:#d08770;font-weight:bold",
    variable: "color:#d8dee9",
    constant: "color:#b48ead",
    error: "color:#bf616a;text-decoration:wavy underline",
    plain: "color:#d8dee9"
  }
};

// src/themes/solarized-light.ts
var solarizedLightTheme = {
  name: "solarized-light",
  background: "#fdf6e3",
  foreground: "#657b83",
  lineNumberColor: "#93a1a1",
  lineNumberBorderColor: "#eee8d5",
  styles: {
    keyword: "color:#859900;font-weight:bold",
    identifier: "color:#657b83",
    string: "color:#2aa198",
    number: "color:#d33682",
    comment: "color:#93a1a1;font-style:italic",
    operator: "color:#657b83",
    punctuation: "color:#657b83",
    type: "color:#b58900",
    decorator: "color:#6c71c4",
    tag: "color:#268bd2",
    attribute: "color:#b58900",
    meta: "color:#93a1a1",
    regexp: "color:#dc322f",
    escape: "color:#cb4b16;font-weight:bold",
    variable: "color:#268bd2",
    constant: "color:#d33682",
    error: "color:#dc322f;text-decoration:wavy underline",
    plain: "color:#657b83"
  }
};

// src/themes/solarized-dark.ts
var solarizedDarkTheme = {
  name: "solarized-dark",
  background: "#002b36",
  foreground: "#839496",
  lineNumberColor: "#586e75",
  lineNumberBorderColor: "#073642",
  styles: {
    keyword: "color:#859900;font-weight:bold",
    identifier: "color:#839496",
    string: "color:#2aa198",
    number: "color:#d33682",
    comment: "color:#586e75;font-style:italic",
    operator: "color:#839496",
    punctuation: "color:#839496",
    type: "color:#b58900",
    decorator: "color:#6c71c4",
    tag: "color:#268bd2",
    attribute: "color:#b58900",
    meta: "color:#586e75",
    regexp: "color:#dc322f",
    escape: "color:#cb4b16;font-weight:bold",
    variable: "color:#268bd2",
    constant: "color:#d33682",
    error: "color:#dc322f;text-decoration:wavy underline",
    plain: "color:#839496"
  }
};

// src/themes/tokyo-night.ts
var tokyoNightTheme = {
  name: "tokyo-night",
  background: "#1a1b26",
  foreground: "#a9b1d6",
  lineNumberColor: "#3b4261",
  lineNumberBorderColor: "#292e42",
  styles: {
    keyword: "color:#9d7cd8;font-weight:bold",
    identifier: "color:#c0caf5",
    string: "color:#9ece6a",
    number: "color:#ff9e64",
    comment: "color:#565f89;font-style:italic",
    operator: "color:#89ddff",
    punctuation: "color:#a9b1d6",
    type: "color:#2ac3de",
    decorator: "color:#bb9af7",
    tag: "color:#f7768e",
    attribute: "color:#73daca",
    meta: "color:#565f89",
    regexp: "color:#b4f9f8",
    escape: "color:#ff9e64;font-weight:bold",
    variable: "color:#7dcfff",
    constant: "color:#ff9e64",
    error: "color:#f7768e;text-decoration:wavy underline",
    plain: "color:#a9b1d6"
  }
};

// src/themes/catppuccin-mocha.ts
var catppuccinMochaTheme = {
  name: "catppuccin-mocha",
  background: "#1e1e2e",
  foreground: "#cdd6f4",
  lineNumberColor: "#585b70",
  lineNumberBorderColor: "#313244",
  styles: {
    keyword: "color:#cba6f7;font-weight:bold",
    identifier: "color:#cdd6f4",
    string: "color:#a6e3a1",
    number: "color:#fab387",
    comment: "color:#6c7086;font-style:italic",
    operator: "color:#89dceb",
    punctuation: "color:#9399b2",
    type: "color:#f9e2af",
    decorator: "color:#f5c2e7",
    tag: "color:#89b4fa",
    attribute: "color:#f2cdcd",
    meta: "color:#6c7086",
    regexp: "color:#f5c2e7",
    escape: "color:#fab387;font-weight:bold",
    variable: "color:#f38ba8",
    constant: "color:#fab387",
    error: "color:#f38ba8;text-decoration:wavy underline",
    plain: "color:#cdd6f4"
  }
};

// src/themes/index.ts
var builtinThemes = [
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
  catppuccinMochaTheme
];
function getTheme(name) {
  return builtinThemes.find((t) => t.name === name);
}
function getThemeNames() {
  return builtinThemes.map((t) => t.name);
}

// src/index.ts
function highlight(source, language, options = {}) {
  const tokens = tokenize2(source, language);
  return highlightTokens(tokens, options);
}
function highlightBlock(source, language, options = {}) {
  return highlight(source, language, {
    ...options,
    wrapInPre: true,
    language: options.language ?? language
  });
}
function highlightAnsi(source, language, options = {}) {
  const tokens = tokenize2(source, language);
  return highlightTokensAnsi(tokens, options);
}
function highlightDiff(oldSource, newSource, language, options = {}) {
  const diff = createDiffModelWithTokens(oldSource, newSource, language, options);
  return renderDiffToHtml(diff, options);
}
function diffModel(oldSource, newSource, options = {}) {
  return createDiffModel(oldSource, newSource, options);
}
function highlightTokens(tokens, options = {}) {
  const semanticTokens = options.semanticHighlighting ? enhanceTokenSemantics(tokens) : tokens;
  const renderOpts = {
    classPrefix: options.classPrefix,
    theme: options.theme,
    decorations: options.decorations
  };
  let inner;
  if (options.lineNumbers) {
    inner = wrapInLines(
      semanticTokens,
      (lineTokens) => renderTokensToHtml(lineTokens, renderOpts),
      {
        startLine: options.startLine,
        dataLineAttributes: options.dataLineAttributes
      }
    );
  } else {
    inner = renderTokensToHtml(semanticTokens, renderOpts);
  }
  if (options.wrapInPre) {
    return wrapInPre(inner, options);
  }
  return inner;
}
function highlightTokensAnsi(tokens, options = {}) {
  const semanticTokens = options.semanticHighlighting ? enhanceTokenSemantics(tokens) : tokens;
  return renderTokensToAnsi(semanticTokens, {
    theme: options.theme,
    lineNumbers: options.lineNumbers,
    startLine: options.startLine,
    lineNumberWidth: options.lineNumberWidth
  });
}
function enhanceSemantics(tokens) {
  return enhanceTokenSemantics(tokens);
}
function wrapInPre(inner, options) {
  const langClass = options.language ? ` hlts-lang-${options.language}` : "";
  const themeStyle = options.theme ? ` style="background:${options.theme.background ?? ""};color:${options.theme.foreground ?? ""}"` : "";
  return `<pre class="hlts${langClass}"${themeStyle}><code>${inner}</code></pre>`;
}
export {
  applyDecorations,
  builtinThemes,
  catppuccinMochaTheme,
  createDiffModel,
  createDiffModelWithTokens,
  defaultAnsiTheme,
  defaultDarkTheme,
  defaultLightTheme,
  diffModel,
  draculaTheme,
  enhanceSemantics,
  enhanceTokenSemantics,
  escapeHtml,
  getTheme,
  getThemeNames,
  githubDarkTheme,
  githubLightTheme,
  groupTokensByLine,
  highlight,
  highlightAnsi,
  highlightBlock,
  highlightDiff,
  highlightTokens,
  highlightTokensAnsi,
  monokaiTheme,
  nordTheme,
  renderDiffToHtml,
  renderTokensToAnsi,
  renderTokensToHtml,
  solarizedDarkTheme,
  solarizedLightTheme,
  splitTokensAtRanges,
  tokyoNightTheme,
  wrapInLines
};
//# sourceMappingURL=index.js.map