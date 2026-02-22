// src/lexer/char-reader.ts
var CharReader = class {
  src;
  len;
  pos = 0;
  line = 1;
  col = 0;
  constructor(source) {
    this.src = source;
    this.len = source.length;
  }
  /** Current byte offset */
  get offset() {
    return this.pos;
  }
  /** Whether we've reached end of source */
  get eof() {
    return this.pos >= this.len;
  }
  /** Remaining characters from current position */
  get remaining() {
    return this.len - this.pos;
  }
  /** Current position as Position object */
  get position() {
    return { line: this.line, column: this.col, offset: this.pos };
  }
  /** Peek at the current character without advancing */
  peek() {
    return this.pos < this.len ? this.src[this.pos] : "";
  }
  /** Peek at character at offset from current position */
  peekAt(offset) {
    const idx = this.pos + offset;
    return idx < this.len ? this.src[idx] : "";
  }
  /** Peek at a substring from current position */
  peekString(length) {
    return this.src.slice(this.pos, this.pos + length);
  }
  /** Get the char code at current position */
  peekCode() {
    return this.pos < this.len ? this.src.charCodeAt(this.pos) : -1;
  }
  /** Advance one character and return it */
  advance() {
    if (this.pos >= this.len) return "";
    const ch = this.src[this.pos];
    this.pos++;
    if (ch === "\n") {
      this.line++;
      this.col = 0;
    } else if (ch === "\r") {
      if (this.pos < this.len && this.src[this.pos] === "\n") {
        this.pos++;
      }
      this.line++;
      this.col = 0;
    } else {
      this.col++;
    }
    return ch;
  }
  /** Advance N characters and return the consumed substring */
  advanceN(n) {
    const start = this.pos;
    for (let i = 0; i < n && this.pos < this.len; i++) {
      this.advance();
    }
    return this.src.slice(start, this.pos);
  }
  /** Check if source starts with the given string at current position */
  startsWith(str) {
    if (this.pos + str.length > this.len) return false;
    for (let i = 0; i < str.length; i++) {
      if (this.src[this.pos + i] !== str[i]) return false;
    }
    return true;
  }
  /** Get a slice of the source from start offset to current position */
  sliceFrom(startOffset) {
    return this.src.slice(startOffset, this.pos);
  }
  /** Get the full source string */
  get source() {
    return this.src;
  }
  /** Save current state for backtracking */
  save() {
    return { pos: this.pos, line: this.line, col: this.col };
  }
  /** Restore a previously saved state */
  restore(state) {
    this.pos = state.pos;
    this.line = state.line;
    this.col = state.col;
  }
};

// src/lexer/state-machine.ts
var StateMachine = class {
  stack;
  constructor(initialState) {
    this.stack = [initialState];
  }
  /** Current state name */
  get current() {
    return this.stack[this.stack.length - 1];
  }
  /** Stack depth */
  get depth() {
    return this.stack.length;
  }
  /** Push a new state onto the stack */
  push(state) {
    this.stack.push(state);
  }
  /** Pop the current state. Never pops the last state. */
  pop() {
    if (this.stack.length > 1) {
      this.stack.pop();
    }
  }
  /** Replace the current state */
  switchTo(state) {
    this.stack[this.stack.length - 1] = state;
  }
  /** Apply transitions from a matched rule */
  applyTransition(rule) {
    if (rule.push) {
      this.push(rule.push);
    } else if (rule.pop) {
      this.pop();
    } else if (rule.switchTo) {
      this.switchTo(rule.switchTo);
    }
  }
  /** Save current stack state for backtracking */
  save() {
    return [...this.stack];
  }
  /** Restore a previously saved stack state */
  restore(saved) {
    this.stack.length = 0;
    this.stack.push(...saved);
  }
};

// src/lexer/char-classes.ts
function compileCharClass(def, charClasses = {}) {
  return buildTest(def, charClasses);
}
function buildTest(def, refs) {
  if ("predefined" in def) {
    switch (def.predefined) {
      case "letter":
        return (ch) => /^[a-zA-Z\u00C0-\u024F]$/.test(ch);
      case "upper":
        return (ch) => ch >= "A" && ch <= "Z";
      case "lower":
        return (ch) => ch >= "a" && ch <= "z";
      case "digit":
        return (ch) => ch >= "0" && ch <= "9";
      case "hexDigit":
        return (ch) => ch >= "0" && ch <= "9" || ch >= "a" && ch <= "f" || ch >= "A" && ch <= "F";
      case "alphanumeric":
        return (ch) => /^[a-zA-Z\u00C0-\u024F]$/.test(ch) || ch >= "0" && ch <= "9";
      case "whitespace":
        return (ch) => ch === " " || ch === "	";
      case "newline":
        return (ch) => ch === "\n" || ch === "\r";
      case "any":
        return (ch) => ch.length > 0;
    }
  }
  if ("chars" in def) {
    const set = new Set(def.chars);
    return (ch) => set.has(ch);
  }
  if ("range" in def) {
    const [lo, hi] = def.range;
    return (ch) => ch >= lo && ch <= hi;
  }
  if ("union" in def) {
    const tests = def.union.map((c) => buildTest(c, refs));
    return (ch) => tests.some((t) => t(ch));
  }
  if ("negate" in def) {
    const inner = buildTest(def.negate, refs);
    return (ch) => ch.length > 0 && !inner(ch);
  }
  if ("ref" in def) {
    const resolved = refs[def.ref];
    if (!resolved) {
      throw new Error(`Unknown charClass reference: "${def.ref}"`);
    }
    return buildTest(resolved, refs);
  }
  throw new Error(`Unknown CharClass variant: ${JSON.stringify(def)}`);
}

// src/lexer/matcher-compiler.ts
function compileMatcher(matcher, charClasses = {}) {
  switch (matcher.kind) {
    case "string":
      return compileStringMatcher(matcher.value);
    case "keywords":
      return compileKeywordsMatcher(matcher.words);
    case "delimited":
      return compileDelimitedMatcher(
        matcher.open,
        matcher.close,
        matcher.escape,
        matcher.multiline ?? false,
        matcher.nested ?? false
      );
    case "line":
      return compileLineMatcher(matcher.start);
    case "charSequence":
      return compileCharSequenceMatcher(
        matcher.first,
        matcher.rest,
        charClasses
      );
    case "number":
      return compileNumberMatcher(matcher);
    case "sequence":
      return compileSequenceMatcher(matcher.elements, charClasses);
    case "pattern":
      return compilePatternMatcher(matcher.regex);
  }
}
function compileStringMatcher(value) {
  if (typeof value === "string") {
    const len = value.length;
    return (reader) => reader.startsWith(value) ? len : 0;
  }
  const sorted = [...value].sort((a, b) => b.length - a.length);
  return (reader) => {
    for (const s of sorted) {
      if (reader.startsWith(s)) return s.length;
    }
    return 0;
  };
}
function compileKeywordsMatcher(words) {
  const sorted = [...words].sort((a, b) => b.length - a.length);
  return (reader) => {
    for (const word of sorted) {
      if (!reader.startsWith(word)) continue;
      const afterIdx = word.length;
      const after = reader.peekAt(afterIdx);
      if (after === "" || !isWordChar(after)) {
        const beforeIdx = reader.offset - 1;
        if (beforeIdx < 0 || !isWordChar(reader.source[beforeIdx])) {
          return word.length;
        }
      }
    }
    return 0;
  };
}
function isWordChar(ch) {
  return /^[a-zA-Z0-9_$]$/.test(ch);
}
function compileDelimitedMatcher(open, close, escape, multiline, nested) {
  const openLen = open.length;
  const closeLen = close.length;
  return (reader) => {
    if (!reader.startsWith(open)) return 0;
    const startPos = reader.offset;
    const src = reader.source;
    let pos = startPos + openLen;
    let depth = 1;
    while (pos < src.length) {
      if (escape && src[pos] === escape) {
        pos += 2;
        continue;
      }
      if (nested && matchAt(src, pos, open)) {
        depth++;
        pos += openLen;
        continue;
      }
      if (matchAt(src, pos, close)) {
        depth--;
        if (depth === 0) {
          return pos + closeLen - startPos;
        }
        pos += closeLen;
        continue;
      }
      if (!multiline && (src[pos] === "\n" || src[pos] === "\r")) {
        return 0;
      }
      pos++;
    }
    return 0;
  };
}
function matchAt(src, pos, str) {
  for (let i = 0; i < str.length; i++) {
    if (src[pos + i] !== str[i]) return false;
  }
  return true;
}
function compileLineMatcher(start) {
  const startLen = start.length;
  return (reader) => {
    if (!reader.startsWith(start)) return 0;
    const src = reader.source;
    let pos = reader.offset + startLen;
    while (pos < src.length && src[pos] !== "\n" && src[pos] !== "\r") {
      pos++;
    }
    return pos - reader.offset;
  };
}
function compileCharSequenceMatcher(first, rest, charClasses) {
  const testFirst = compileCharClass(first, charClasses);
  const testRest = rest ? compileCharClass(rest, charClasses) : null;
  return (reader) => {
    const ch = reader.peek();
    if (!ch || !testFirst(ch)) return 0;
    if (!testRest) return 1;
    const src = reader.source;
    let pos = reader.offset + 1;
    while (pos < src.length && testRest(src[pos])) {
      pos++;
    }
    return pos - reader.offset;
  };
}
function compileNumberMatcher(opts) {
  return (reader) => {
    const src = reader.source;
    const start = reader.offset;
    let pos = start;
    if (pos < src.length && src[pos] === "0" && pos + 1 < src.length) {
      const next = src[pos + 1];
      if (opts.hex && (next === "x" || next === "X")) {
        pos += 2;
        const hexStart = pos;
        while (pos < src.length && isHexDigit(src[pos])) {
          pos++;
          if (opts.separator && pos < src.length && src[pos] === opts.separator) {
            pos++;
          }
        }
        if (pos === hexStart) return 0;
        return consumeSuffix(src, pos, opts.suffix) - start;
      }
      if (opts.octal && (next === "o" || next === "O")) {
        pos += 2;
        const octStart = pos;
        while (pos < src.length && src[pos] >= "0" && src[pos] <= "7") {
          pos++;
          if (opts.separator && pos < src.length && src[pos] === opts.separator) {
            pos++;
          }
        }
        if (pos === octStart) return 0;
        return consumeSuffix(src, pos, opts.suffix) - start;
      }
      if (opts.binary && (next === "b" || next === "B")) {
        pos += 2;
        const binStart = pos;
        while (pos < src.length && (src[pos] === "0" || src[pos] === "1")) {
          pos++;
          if (opts.separator && pos < src.length && src[pos] === opts.separator) {
            pos++;
          }
        }
        if (pos === binStart) return 0;
        return consumeSuffix(src, pos, opts.suffix) - start;
      }
    }
    if (!opts.integer && !opts.float) return 0;
    const isDigit = pos < src.length && src[pos] >= "0" && src[pos] <= "9";
    const isDotDigit = opts.float && pos < src.length && src[pos] === "." && pos + 1 < src.length && src[pos + 1] >= "0" && src[pos + 1] <= "9";
    if (!isDigit && !isDotDigit) return 0;
    while (pos < src.length && src[pos] >= "0" && src[pos] <= "9") {
      pos++;
      if (opts.separator && pos < src.length && src[pos] === opts.separator) {
        pos++;
      }
    }
    if (opts.float && pos < src.length && src[pos] === ".") {
      const afterDot = pos + 1;
      if (afterDot < src.length && src[afterDot] >= "0" && src[afterDot] <= "9") {
        pos = afterDot;
        while (pos < src.length && src[pos] >= "0" && src[pos] <= "9") {
          pos++;
          if (opts.separator && pos < src.length && src[pos] === opts.separator) {
            pos++;
          }
        }
      }
    }
    if (pos === start) return 0;
    if (opts.scientific && pos < src.length && (src[pos] === "e" || src[pos] === "E")) {
      let ePos = pos + 1;
      if (ePos < src.length && (src[ePos] === "+" || src[ePos] === "-")) {
        ePos++;
      }
      const eDigitStart = ePos;
      while (ePos < src.length && src[ePos] >= "0" && src[ePos] <= "9") {
        ePos++;
      }
      if (ePos > eDigitStart) {
        pos = ePos;
      }
    }
    return consumeSuffix(src, pos, opts.suffix) - start;
  };
}
function isHexDigit(ch) {
  return ch >= "0" && ch <= "9" || ch >= "a" && ch <= "f" || ch >= "A" && ch <= "F";
}
function consumeSuffix(src, pos, suffixes) {
  if (!suffixes) return pos;
  for (const suf of [...suffixes].sort((a, b) => b.length - a.length)) {
    if (matchAt(src, pos, suf)) {
      return pos + suf.length;
    }
  }
  return pos;
}
function compileSequenceMatcher(elements, charClasses) {
  const fns = elements.map((e) => compileMatcher(e, charClasses));
  return (reader) => {
    const saved = reader.save();
    let total = 0;
    for (const fn of fns) {
      const n = fn(reader);
      if (n === 0) {
        reader.restore(saved);
        return 0;
      }
      reader.advanceN(n);
      total += n;
    }
    reader.restore(saved);
    return total;
  };
}
function compilePatternMatcher(regex) {
  const re = new RegExp("^(?:" + regex + ")");
  return (reader) => {
    const src = reader.source;
    const sub = src.slice(reader.offset);
    const m = re.exec(sub);
    return m ? m[0].length : 0;
  };
}

// src/lexer/lexer.ts
var CompiledLexer = class {
  states;
  config;
  constructor(config) {
    this.config = config;
    this.states = /* @__PURE__ */ new Map();
    const charClasses = config.charClasses ?? {};
    for (const [name, state] of Object.entries(config.states)) {
      const compiled = state.rules.map((rule) => ({
        scan: compileMatcher(rule.match, charClasses),
        rule
      }));
      this.states.set(name, compiled);
    }
  }
  /** Tokenize source code into a token stream */
  tokenize(source) {
    const reader = new CharReader(source);
    const sm = new StateMachine(this.config.initialState);
    const tokens = [];
    while (!reader.eof) {
      const currentState = this.states.get(sm.current);
      if (!currentState) {
        throw new Error(`Unknown lexer state: "${sm.current}"`);
      }
      let matched = false;
      const startPos = reader.position;
      for (const { scan, rule } of currentState) {
        const consumed = scan(reader);
        if (consumed > 0) {
          const value = reader.advanceN(consumed);
          const endPos = reader.position;
          const typeDef = this.config.tokenTypes[rule.token];
          tokens.push({
            type: rule.token,
            value,
            category: typeDef?.category ?? "plain",
            range: { start: startPos, end: endPos }
          });
          sm.applyTransition(rule);
          matched = true;
          break;
        }
      }
      if (!matched) {
        const ch = reader.advance();
        const endPos = reader.position;
        tokens.push({
          type: "error",
          value: ch,
          category: "error",
          range: { start: startPos, end: endPos }
        });
      }
    }
    return tokens;
  }
};
var lexerCache = /* @__PURE__ */ new WeakMap();
function getCompiledLexer(config) {
  let lexer = lexerCache.get(config);
  if (!lexer) {
    lexer = new CompiledLexer(config);
    lexerCache.set(config, lexer);
  }
  return lexer;
}
function tokenizeWithConfig(source, config) {
  return getCompiledLexer(config).tokenize(source);
}

// src/parser/block-tracker.ts
function findBlockSpans(tokens, blockRules) {
  const openToRule = /* @__PURE__ */ new Map();
  const closeToRule = /* @__PURE__ */ new Map();
  for (const rule of blockRules) {
    openToRule.set(rule.open, rule);
    closeToRule.set(rule.close, rule);
  }
  const spans = [];
  const stack = [];
  for (let i = 0; i < tokens.length; i++) {
    const val = tokens[i].value;
    const openRule = openToRule.get(val);
    if (openRule) {
      stack.push({ name: openRule.name, openIndex: i, depth: stack.length });
      continue;
    }
    const closeRule = closeToRule.get(val);
    if (closeRule) {
      for (let j = stack.length - 1; j >= 0; j--) {
        if (stack[j].name === closeRule.name) {
          const entry = stack[j];
          spans.push({
            name: entry.name,
            openIndex: entry.openIndex,
            closeIndex: i,
            depth: entry.depth
          });
          stack.length = j;
          break;
        }
      }
    }
  }
  spans.sort((a, b) => a.openIndex - b.openIndex);
  return spans;
}
function findNextBlock(spans, afterIndex, blockName) {
  for (const span of spans) {
    if (span.openIndex >= afterIndex && span.name === blockName) {
      return span;
    }
  }
  return void 0;
}

// src/parser/symbol-detector.ts
function detectSymbols(tokens, rules, blockSpans, skipTokens) {
  const filtered = [];
  for (let i = 0; i < tokens.length; i++) {
    if (!skipTokens.has(tokens[i].type)) {
      filtered.push({ token: tokens[i], originalIndex: i });
    }
  }
  const symbols = [];
  const used = /* @__PURE__ */ new Set();
  for (const rule of rules) {
    for (let fi = 0; fi < filtered.length; fi++) {
      if (used.has(fi)) continue;
      const match = tryMatch(filtered, fi, rule.pattern);
      if (!match) continue;
      const name = match.captures["name"] ?? rule.name;
      const startToken = filtered[match.startIndex].token;
      const startLine = startToken.range.start.line;
      let endLine = startLine;
      if (rule.hasBody) {
        if (rule.bodyStyle === "braces") {
          const afterOrigIdx = filtered[match.endIndex - 1]?.originalIndex ?? 0;
          const block = findNextBlock(blockSpans, afterOrigIdx, "braces");
          if (block) {
            endLine = tokens[block.closeIndex].range.end.line;
          }
        } else if (rule.bodyStyle === "indentation") {
          const baseIndent = startToken.range.start.column;
          endLine = findIndentationEnd(tokens, filtered[match.endIndex - 1]?.originalIndex ?? 0, baseIndent);
        }
      } else {
        const lastMatchOrigIdx = filtered[match.endIndex - 1]?.originalIndex ?? 0;
        endLine = findStatementEnd(tokens, lastMatchOrigIdx);
      }
      symbols.push({
        name,
        kind: rule.kind,
        startLine,
        endLine
      });
      for (let k = match.startIndex; k < match.endIndex; k++) {
        used.add(k);
      }
    }
  }
  symbols.sort((a, b) => a.startLine - b.startLine);
  return symbols;
}
function tryMatch(filtered, startIdx, pattern) {
  const captures = {};
  let idx = startIdx;
  for (let pi = 0; pi < pattern.length; pi++) {
    const step = pattern[pi];
    if (idx >= filtered.length) return null;
    if ("skip" in step && step.skip) {
      const nextStep = pattern[pi + 1];
      if (!nextStep) return null;
      const maxTokens = step.maxTokens ?? 50;
      let found = false;
      const limit = Math.min(idx + maxTokens, filtered.length);
      for (let si = idx; si < limit; si++) {
        if (matchSingleStep(filtered[si].token, nextStep, captures)) {
          idx = si;
          found = true;
          break;
        }
      }
      if (!found) return null;
      idx++;
      pi++;
      continue;
    }
    if ("optional" in step) {
      if (matchSingleStep(filtered[idx].token, step.optional, captures)) {
        idx++;
      }
      continue;
    }
    if ("anyOf" in step) {
      let anyMatched = false;
      for (const alt of step.anyOf) {
        if (matchSingleStep(filtered[idx].token, alt, captures)) {
          anyMatched = true;
          idx++;
          break;
        }
      }
      if (!anyMatched) return null;
      continue;
    }
    if ("token" in step) {
      if (!matchTokenStep(filtered[idx].token, step)) return null;
      if (step.capture) {
        captures[step.capture] = filtered[idx].token.value;
      }
      idx++;
      continue;
    }
    return null;
  }
  return { startIndex: startIdx, endIndex: idx, captures };
}
function matchSingleStep(token, step, captures) {
  if ("token" in step) {
    if (!matchTokenStep(token, step)) return false;
    if (step.capture) captures[step.capture] = token.value;
    return true;
  }
  if ("anyOf" in step) {
    return step.anyOf.some((alt) => matchSingleStep(token, alt, captures));
  }
  return false;
}
function matchTokenStep(token, step) {
  if (token.type !== step.token) return false;
  if (step.value !== void 0 && token.value !== step.value) return false;
  return true;
}
function findIndentationEnd(tokens, afterIndex, baseIndent) {
  let lastContentLine = tokens[afterIndex]?.range.start.line ?? 1;
  let foundBody = false;
  for (let i = afterIndex + 1; i < tokens.length; i++) {
    const tok = tokens[i];
    if (tok.category === "whitespace" || tok.category === "newline") continue;
    const line = tok.range.start.line;
    const col = tok.range.start.column;
    if (!foundBody) {
      if (col > baseIndent) {
        foundBody = true;
        lastContentLine = line;
      } else {
        return lastContentLine;
      }
    } else {
      if (col <= baseIndent) {
        return lastContentLine;
      }
      lastContentLine = line;
    }
  }
  return lastContentLine;
}
function findStatementEnd(tokens, fromIndex) {
  let line = tokens[fromIndex]?.range.end.line ?? 1;
  let depth = 0;
  for (let i = fromIndex + 1; i < tokens.length; i++) {
    const tok = tokens[i];
    if (tok.value === "{" || tok.value === "(" || tok.value === "[") depth++;
    if (tok.value === "}" || tok.value === ")" || tok.value === "]") depth--;
    if (depth === 0) {
      if (tok.value === ";") return tok.range.end.line;
      if (tok.category === "newline" && depth <= 0) return line;
    }
    if (tok.category !== "whitespace" && tok.category !== "newline") {
      line = tok.range.end.line;
    }
  }
  return line;
}

// src/parser/structure-parser.ts
function extractSymbolsFromProfile(source, profile) {
  if (!profile.structure) return [];
  const tokens = tokenizeWithConfig(source, profile.lexer);
  return extractSymbolsFromTokens(tokens, profile);
}
function extractSymbolsFromTokens(tokens, profile) {
  if (!profile.structure) return [];
  const { blocks, symbols: symbolRules } = profile.structure;
  const skipTokens = new Set(profile.lexer.skipTokens ?? []);
  const blockSpans = findBlockSpans(tokens, blocks);
  return detectSymbols(tokens, symbolRules, blockSpans, skipTokens);
}

// src/profiles/json.ts
var json = {
  name: "json",
  displayName: "JSON",
  version: "1.0.0",
  fileExtensions: [".json"],
  mimeTypes: ["application/json"],
  lexer: {
    tokenTypes: {
      string: { category: "string" },
      number: { category: "number" },
      constant: { category: "constant" },
      punctuation: { category: "punctuation" },
      whitespace: { category: "whitespace" },
      newline: { category: "newline" }
    },
    initialState: "default",
    skipTokens: ["whitespace", "newline"],
    states: {
      default: {
        rules: [
          // Strings
          {
            match: { kind: "delimited", open: '"', close: '"', escape: "\\" },
            token: "string"
          },
          // Numbers
          {
            match: {
              kind: "number",
              integer: true,
              float: true,
              scientific: true
            },
            token: "number"
          },
          // Constants: true, false, null
          {
            match: { kind: "keywords", words: ["true", "false", "null"] },
            token: "constant"
          },
          // Punctuation
          {
            match: {
              kind: "string",
              value: ["{", "}", "[", "]", ":", ","]
            },
            token: "punctuation"
          },
          // Whitespace
          {
            match: {
              kind: "charSequence",
              first: { predefined: "whitespace" },
              rest: { predefined: "whitespace" }
            },
            token: "whitespace"
          },
          {
            match: { kind: "charSequence", first: { predefined: "newline" } },
            token: "newline"
          }
        ]
      }
    }
  },
  structure: {
    blocks: [
      { name: "object", open: "{", close: "}" },
      { name: "array", open: "[", close: "]" }
    ],
    symbols: []
  },
  grammar: {
    entry: "value",
    rules: {
      value: {
        alternatives: [
          [{ rule: "object" }],
          [{ rule: "array" }],
          [{ token: "string" }],
          [{ token: "number" }],
          [{ token: "constant" }]
        ]
      },
      object: {
        alternatives: [
          [
            { token: "punctuation", value: "{" },
            {
              optional: {
                repeat: [{ rule: "pair" }],
                min: 1,
                separator: { token: "punctuation", value: "," }
              }
            },
            { token: "punctuation", value: "}" }
          ]
        ]
      },
      pair: {
        alternatives: [
          [
            { token: "string", field: "key" },
            { token: "punctuation", value: ":" },
            { rule: "value", field: "value" }
          ]
        ]
      },
      array: {
        alternatives: [
          [
            { token: "punctuation", value: "[" },
            {
              optional: {
                repeat: [{ rule: "value" }],
                min: 1,
                separator: { token: "punctuation", value: "," }
              }
            },
            { token: "punctuation", value: "]" }
          ]
        ]
      }
    },
    recovery: [
      { context: "object", syncTokens: ["}", ","] },
      { context: "array", syncTokens: ["]", ","] }
    ]
  }
};

// src/profiles/css.ts
var css = {
  name: "css",
  displayName: "CSS",
  version: "1.0.0",
  fileExtensions: [".css"],
  mimeTypes: ["text/css"],
  lexer: {
    charClasses: {
      identStart: {
        union: [{ predefined: "letter" }, { chars: "_-" }]
      },
      identPart: {
        union: [{ predefined: "alphanumeric" }, { chars: "_-" }]
      }
    },
    tokenTypes: {
      comment: { category: "comment" },
      string: { category: "string" },
      number: { category: "number" },
      color: { category: "constant", subcategory: "color" },
      keyword: { category: "keyword" },
      at_rule: { category: "keyword", subcategory: "at-rule" },
      property: { category: "identifier", subcategory: "property" },
      selector: { category: "tag", subcategory: "selector" },
      pseudo: { category: "keyword", subcategory: "pseudo" },
      identifier: { category: "identifier" },
      operator: { category: "operator" },
      punctuation: { category: "punctuation" },
      unit: { category: "keyword", subcategory: "unit" },
      whitespace: { category: "whitespace" },
      newline: { category: "newline" }
    },
    initialState: "default",
    skipTokens: ["whitespace", "newline", "comment"],
    states: {
      default: {
        rules: [
          // Block comments
          {
            match: {
              kind: "delimited",
              open: "/*",
              close: "*/",
              multiline: true
            },
            token: "comment"
          },
          // Strings
          {
            match: { kind: "delimited", open: '"', close: '"', escape: "\\" },
            token: "string"
          },
          {
            match: { kind: "delimited", open: "'", close: "'", escape: "\\" },
            token: "string"
          },
          // At-rules (@media, @keyframes, @import, etc.)
          {
            match: {
              kind: "sequence",
              elements: [
                { kind: "string", value: "@" },
                {
                  kind: "charSequence",
                  first: { predefined: "letter" },
                  rest: { ref: "identPart" }
                }
              ]
            },
            token: "at_rule"
          },
          // Hex colors
          {
            match: {
              kind: "sequence",
              elements: [
                { kind: "string", value: "#" },
                {
                  kind: "charSequence",
                  first: { predefined: "hexDigit" },
                  rest: { predefined: "hexDigit" }
                }
              ]
            },
            token: "color"
          },
          // Numbers with units
          {
            match: {
              kind: "number",
              integer: true,
              float: true,
              suffix: [
                "px",
                "em",
                "rem",
                "%",
                "vh",
                "vw",
                "vmin",
                "vmax",
                "ch",
                "ex",
                "cm",
                "mm",
                "in",
                "pt",
                "pc",
                "s",
                "ms",
                "deg",
                "rad",
                "grad",
                "turn",
                "fr",
                "dpi",
                "dpcm",
                "dppx"
              ]
            },
            token: "number"
          },
          // Keywords
          {
            match: {
              kind: "keywords",
              words: [
                "important",
                "inherit",
                "initial",
                "unset",
                "revert",
                "none",
                "auto",
                "normal",
                "bold",
                "italic",
                "solid",
                "dashed",
                "dotted",
                "block",
                "inline",
                "flex",
                "grid",
                "absolute",
                "relative",
                "fixed",
                "sticky",
                "static",
                "hidden",
                "visible",
                "scroll",
                "transparent"
              ]
            },
            token: "keyword"
          },
          // Pseudo-classes and pseudo-elements
          {
            match: {
              kind: "sequence",
              elements: [
                { kind: "string", value: "::" },
                {
                  kind: "charSequence",
                  first: { predefined: "letter" },
                  rest: { ref: "identPart" }
                }
              ]
            },
            token: "pseudo"
          },
          {
            match: {
              kind: "sequence",
              elements: [
                { kind: "string", value: ":" },
                {
                  kind: "charSequence",
                  first: { predefined: "letter" },
                  rest: { ref: "identPart" }
                }
              ]
            },
            token: "pseudo"
          },
          // Identifiers
          {
            match: {
              kind: "charSequence",
              first: { ref: "identStart" },
              rest: { ref: "identPart" }
            },
            token: "identifier"
          },
          // Operators
          {
            match: {
              kind: "string",
              value: ["+", ">", "~", "*", "=", "^=", "$=", "*=", "|=", "~="]
            },
            token: "operator"
          },
          // Punctuation
          {
            match: {
              kind: "string",
              value: ["{", "}", "(", ")", "[", "]", ";", ":", ",", "."]
            },
            token: "punctuation"
          },
          // !important
          {
            match: { kind: "string", value: "!" },
            token: "operator"
          },
          // Whitespace
          {
            match: {
              kind: "charSequence",
              first: { predefined: "whitespace" },
              rest: { predefined: "whitespace" }
            },
            token: "whitespace"
          },
          {
            match: { kind: "charSequence", first: { predefined: "newline" } },
            token: "newline"
          }
        ]
      }
    }
  },
  structure: {
    blocks: [
      { name: "block", open: "{", close: "}" },
      { name: "parens", open: "(", close: ")" },
      { name: "brackets", open: "[", close: "]" }
    ],
    symbols: [
      {
        name: "at_rule",
        kind: "other",
        pattern: [{ token: "at_rule", capture: "name" }],
        hasBody: true,
        bodyStyle: "braces"
      }
    ],
    folding: [
      { open: { token: "punctuation", value: "{" }, close: { token: "punctuation", value: "}" } }
    ]
  }
};

// src/profiles/scss.ts
var scss = {
  name: "scss",
  displayName: "SCSS",
  version: "1.0.0",
  fileExtensions: [".scss"],
  mimeTypes: ["text/x-scss"],
  extends: "css",
  lexer: {
    charClasses: {
      identStart: {
        union: [{ predefined: "letter" }, { chars: "_-" }]
      },
      identPart: {
        union: [{ predefined: "alphanumeric" }, { chars: "_-" }]
      }
    },
    tokenTypes: {
      comment: { category: "comment" },
      string: { category: "string" },
      number: { category: "number" },
      color: { category: "constant", subcategory: "color" },
      keyword: { category: "keyword" },
      at_rule: { category: "keyword", subcategory: "at-rule" },
      variable: { category: "variable" },
      interpolation: { category: "punctuation", subcategory: "interpolation" },
      pseudo: { category: "keyword", subcategory: "pseudo" },
      identifier: { category: "identifier" },
      operator: { category: "operator" },
      punctuation: { category: "punctuation" },
      whitespace: { category: "whitespace" },
      newline: { category: "newline" }
    },
    initialState: "default",
    skipTokens: ["whitespace", "newline", "comment"],
    states: {
      default: {
        rules: [
          // Line comments (SCSS-specific)
          { match: { kind: "line", start: "//" }, token: "comment" },
          // Block comments
          {
            match: {
              kind: "delimited",
              open: "/*",
              close: "*/",
              multiline: true
            },
            token: "comment"
          },
          // Strings
          {
            match: { kind: "delimited", open: '"', close: '"', escape: "\\" },
            token: "string"
          },
          {
            match: { kind: "delimited", open: "'", close: "'", escape: "\\" },
            token: "string"
          },
          // Interpolation #{...}
          {
            match: { kind: "string", value: "#{" },
            token: "interpolation",
            push: "interpolation"
          },
          // SCSS variables ($variable)
          {
            match: {
              kind: "sequence",
              elements: [
                { kind: "string", value: "$" },
                {
                  kind: "charSequence",
                  first: {
                    union: [{ predefined: "letter" }, { chars: "_" }]
                  },
                  rest: { ref: "identPart" }
                }
              ]
            },
            token: "variable"
          },
          // At-rules (@mixin, @include, @extend, @import, @use, @forward, etc.)
          {
            match: {
              kind: "sequence",
              elements: [
                { kind: "string", value: "@" },
                {
                  kind: "charSequence",
                  first: { predefined: "letter" },
                  rest: { ref: "identPart" }
                }
              ]
            },
            token: "at_rule"
          },
          // Hex colors
          {
            match: {
              kind: "sequence",
              elements: [
                { kind: "string", value: "#" },
                {
                  kind: "charSequence",
                  first: { predefined: "hexDigit" },
                  rest: { predefined: "hexDigit" }
                }
              ]
            },
            token: "color"
          },
          // Numbers with units
          {
            match: {
              kind: "number",
              integer: true,
              float: true,
              suffix: [
                "px",
                "em",
                "rem",
                "%",
                "vh",
                "vw",
                "vmin",
                "vmax",
                "ch",
                "ex",
                "s",
                "ms",
                "deg",
                "rad",
                "fr"
              ]
            },
            token: "number"
          },
          // Keywords
          {
            match: {
              kind: "keywords",
              words: [
                "important",
                "inherit",
                "initial",
                "unset",
                "none",
                "auto",
                "true",
                "false",
                "null",
                "and",
                "or",
                "not",
                "from",
                "through",
                "to"
              ]
            },
            token: "keyword"
          },
          // Pseudo selectors
          {
            match: {
              kind: "sequence",
              elements: [
                { kind: "string", value: "::" },
                {
                  kind: "charSequence",
                  first: { predefined: "letter" },
                  rest: { ref: "identPart" }
                }
              ]
            },
            token: "pseudo"
          },
          {
            match: {
              kind: "sequence",
              elements: [
                { kind: "string", value: ":" },
                {
                  kind: "charSequence",
                  first: { predefined: "letter" },
                  rest: { ref: "identPart" }
                }
              ]
            },
            token: "pseudo"
          },
          // & (parent selector)
          { match: { kind: "string", value: "&" }, token: "operator" },
          // Identifiers
          {
            match: {
              kind: "charSequence",
              first: { ref: "identStart" },
              rest: { ref: "identPart" }
            },
            token: "identifier"
          },
          // Operators
          {
            match: {
              kind: "string",
              value: ["+", ">", "~", "*", "=", "^=", "$=", "*=", "|=", "~="]
            },
            token: "operator"
          },
          // Punctuation
          {
            match: {
              kind: "string",
              value: ["{", "}", "(", ")", "[", "]", ";", ":", ",", "."]
            },
            token: "punctuation"
          },
          { match: { kind: "string", value: "!" }, token: "operator" },
          // Whitespace
          {
            match: {
              kind: "charSequence",
              first: { predefined: "whitespace" },
              rest: { predefined: "whitespace" }
            },
            token: "whitespace"
          },
          {
            match: { kind: "charSequence", first: { predefined: "newline" } },
            token: "newline"
          }
        ]
      },
      interpolation: {
        rules: [
          {
            match: { kind: "string", value: "}" },
            token: "interpolation",
            pop: true
          }
          // Inside interpolation, use same rules as default
          // (the engine will fall through to default state rules)
        ]
      }
    }
  },
  structure: {
    blocks: [
      { name: "block", open: "{", close: "}" },
      { name: "parens", open: "(", close: ")" }
    ],
    symbols: [
      {
        name: "mixin_declaration",
        kind: "function",
        pattern: [
          { token: "at_rule", value: "@mixin" },
          { token: "identifier", capture: "name" }
        ],
        hasBody: true,
        bodyStyle: "braces"
      },
      {
        name: "function_declaration",
        kind: "function",
        pattern: [
          { token: "at_rule", value: "@function" },
          { token: "identifier", capture: "name" }
        ],
        hasBody: true,
        bodyStyle: "braces"
      },
      {
        name: "at_rule",
        kind: "other",
        pattern: [{ token: "at_rule", capture: "name" }],
        hasBody: true,
        bodyStyle: "braces"
      }
    ],
    folding: [
      { open: { token: "punctuation", value: "{" }, close: { token: "punctuation", value: "}" } }
    ]
  }
};

// src/profiles/python.ts
var python = {
  name: "python",
  displayName: "Python",
  version: "1.0.0",
  fileExtensions: [".py", ".pyi", ".pyw"],
  mimeTypes: ["text/x-python"],
  lexer: {
    charClasses: {
      identStart: {
        union: [{ predefined: "letter" }, { chars: "_" }]
      },
      identPart: {
        union: [{ predefined: "alphanumeric" }, { chars: "_" }]
      }
    },
    tokenTypes: {
      keyword: { category: "keyword" },
      constant: { category: "constant" },
      builtin: { category: "keyword", subcategory: "builtin" },
      identifier: { category: "identifier" },
      type_name: { category: "type" },
      decorator: { category: "decorator" },
      string: { category: "string" },
      fstring_start: { category: "string", subcategory: "fstring" },
      fstring_expr: { category: "punctuation", subcategory: "fstring" },
      number: { category: "number" },
      comment: { category: "comment" },
      operator: { category: "operator" },
      punctuation: { category: "punctuation" },
      indent: { category: "whitespace" },
      dedent: { category: "whitespace" },
      whitespace: { category: "whitespace" },
      newline: { category: "newline" }
    },
    initialState: "default",
    skipTokens: ["whitespace", "newline", "comment", "indent", "dedent"],
    indentation: {
      indentToken: "indent",
      dedentToken: "dedent",
      unit: "detect"
    },
    states: {
      default: {
        rules: [
          // Comments
          { match: { kind: "line", start: "#" }, token: "comment" },
          // Triple-quoted strings (must come before single-quoted)
          {
            match: {
              kind: "delimited",
              open: '"""',
              close: '"""',
              multiline: true,
              escape: "\\"
            },
            token: "string"
          },
          {
            match: {
              kind: "delimited",
              open: "'''",
              close: "'''",
              multiline: true,
              escape: "\\"
            },
            token: "string"
          },
          // F-string triple-quoted (consume whole thing for now)
          {
            match: {
              kind: "pattern",
              regex: '[fF]"""[\\s\\S]*?"""'
            },
            token: "string"
          },
          {
            match: {
              kind: "pattern",
              regex: "[fF]'''[\\s\\S]*?'''"
            },
            token: "string"
          },
          // F-string single-quoted
          {
            match: {
              kind: "pattern",
              regex: '[fF]"(?:\\\\.|[^"\\\\\\n])*"'
            },
            token: "string"
          },
          {
            match: {
              kind: "pattern",
              regex: "[fF]'(?:\\\\.|[^'\\\\\\n])*'"
            },
            token: "string"
          },
          // Raw strings
          {
            match: {
              kind: "pattern",
              regex: '[rRbB]{1,2}"(?:\\\\.|[^"\\\\])*"'
            },
            token: "string"
          },
          {
            match: {
              kind: "pattern",
              regex: "[rRbB]{1,2}'(?:\\\\.|[^'\\\\])*'"
            },
            token: "string"
          },
          // Regular strings
          {
            match: { kind: "delimited", open: '"', close: '"', escape: "\\" },
            token: "string"
          },
          {
            match: { kind: "delimited", open: "'", close: "'", escape: "\\" },
            token: "string"
          },
          // Decorators
          {
            match: {
              kind: "sequence",
              elements: [
                { kind: "string", value: "@" },
                {
                  kind: "charSequence",
                  first: { ref: "identStart" },
                  rest: {
                    union: [{ predefined: "alphanumeric" }, { chars: "_." }]
                  }
                }
              ]
            },
            token: "decorator"
          },
          // Numbers
          {
            match: {
              kind: "number",
              integer: true,
              float: true,
              hex: true,
              binary: true,
              octal: true,
              scientific: true,
              separator: "_"
            },
            token: "number"
          },
          // Keywords
          {
            match: {
              kind: "keywords",
              words: [
                "and",
                "as",
                "assert",
                "async",
                "await",
                "break",
                "class",
                "continue",
                "def",
                "del",
                "elif",
                "else",
                "except",
                "finally",
                "for",
                "from",
                "global",
                "if",
                "import",
                "in",
                "is",
                "lambda",
                "nonlocal",
                "not",
                "or",
                "pass",
                "raise",
                "return",
                "try",
                "while",
                "with",
                "yield"
              ]
            },
            token: "keyword"
          },
          // Constants
          {
            match: {
              kind: "keywords",
              words: ["True", "False", "None"]
            },
            token: "constant"
          },
          // Built-in functions
          {
            match: {
              kind: "keywords",
              words: [
                "print",
                "len",
                "range",
                "int",
                "str",
                "float",
                "list",
                "dict",
                "set",
                "tuple",
                "type",
                "isinstance",
                "issubclass",
                "super",
                "property",
                "staticmethod",
                "classmethod",
                "enumerate",
                "zip",
                "map",
                "filter",
                "sorted",
                "reversed",
                "abs",
                "min",
                "max",
                "sum",
                "any",
                "all",
                "open",
                "input",
                "hasattr",
                "getattr",
                "setattr",
                "delattr",
                "vars",
                "dir"
              ]
            },
            token: "builtin"
          },
          // Type-like identifiers (PascalCase)
          {
            match: {
              kind: "charSequence",
              first: { range: ["A", "Z"] },
              rest: { ref: "identPart" }
            },
            token: "type_name"
          },
          // Identifiers
          {
            match: {
              kind: "charSequence",
              first: { ref: "identStart" },
              rest: { ref: "identPart" }
            },
            token: "identifier"
          },
          // Multi-char operators
          {
            match: {
              kind: "string",
              value: [
                "**=",
                "//=",
                "<<=",
                ">>=",
                "**",
                "//",
                "<<",
                ">>",
                "<=",
                ">=",
                "==",
                "!=",
                "+=",
                "-=",
                "*=",
                "/=",
                "%=",
                "&=",
                "|=",
                "^=",
                "->",
                ":="
              ]
            },
            token: "operator"
          },
          // Single-char operators
          {
            match: {
              kind: "string",
              value: ["+", "-", "*", "/", "%", "=", "<", ">", "&", "|", "^", "~", "@"]
            },
            token: "operator"
          },
          // Punctuation
          {
            match: {
              kind: "string",
              value: ["{", "}", "(", ")", "[", "]", ":", ";", ",", "."]
            },
            token: "punctuation"
          },
          // Whitespace
          {
            match: {
              kind: "charSequence",
              first: { predefined: "whitespace" },
              rest: { predefined: "whitespace" }
            },
            token: "whitespace"
          },
          {
            match: { kind: "charSequence", first: { predefined: "newline" } },
            token: "newline"
          }
        ]
      },
      fstring_single: {
        rules: [
          // Expression hole
          {
            match: { kind: "string", value: "{" },
            token: "fstring_expr",
            push: "default"
          },
          // End of f-string
          {
            match: { kind: "string", value: ['"', "'"] },
            token: "fstring_start",
            pop: true
          }
        ]
      },
      fstring_triple: {
        rules: [
          {
            match: { kind: "string", value: "{" },
            token: "fstring_expr",
            push: "default"
          },
          {
            match: { kind: "string", value: ['"""', "'''"] },
            token: "fstring_start",
            pop: true
          }
        ]
      }
    }
  },
  structure: {
    blocks: [
      { name: "braces", open: "{", close: "}" },
      { name: "parens", open: "(", close: ")" },
      { name: "brackets", open: "[", close: "]" }
    ],
    symbols: [
      {
        name: "function_definition",
        kind: "function",
        pattern: [
          { token: "keyword", value: "def" },
          { token: "identifier", capture: "name" }
        ],
        hasBody: true,
        bodyStyle: "indentation"
      },
      {
        name: "async_function_definition",
        kind: "function",
        pattern: [
          { token: "keyword", value: "async" },
          { token: "keyword", value: "def" },
          { token: "identifier", capture: "name" }
        ],
        hasBody: true,
        bodyStyle: "indentation"
      },
      {
        name: "class_definition",
        kind: "class",
        pattern: [
          { token: "keyword", value: "class" },
          {
            anyOf: [
              { token: "identifier", capture: "name" },
              { token: "type_name", capture: "name" }
            ]
          }
        ],
        hasBody: true,
        bodyStyle: "indentation"
      },
      {
        name: "decorated_definition",
        kind: "other",
        pattern: [{ token: "decorator", capture: "name" }],
        hasBody: false
      },
      {
        name: "import_statement",
        kind: "import",
        pattern: [{ token: "keyword", value: "import" }],
        hasBody: false
      },
      {
        name: "import_from_statement",
        kind: "import",
        pattern: [
          { token: "keyword", value: "from" },
          { skip: true, maxTokens: 10 },
          { token: "keyword", value: "import" }
        ],
        hasBody: false
      },
      {
        name: "assignment",
        kind: "variable",
        pattern: [
          { token: "identifier", capture: "name" },
          { token: "operator", value: "=" }
        ],
        hasBody: false
      }
    ]
  }
};

// src/profiles/go.ts
var go = {
  name: "go",
  displayName: "Go",
  version: "1.0.0",
  fileExtensions: [".go"],
  mimeTypes: ["text/x-go"],
  lexer: {
    charClasses: {
      identStart: {
        union: [{ predefined: "letter" }, { chars: "_" }]
      },
      identPart: {
        union: [{ predefined: "alphanumeric" }, { chars: "_" }]
      }
    },
    tokenTypes: {
      keyword: { category: "keyword" },
      constant: { category: "constant" },
      builtin: { category: "keyword", subcategory: "builtin" },
      identifier: { category: "identifier" },
      type_name: { category: "type" },
      type_keyword: { category: "type", subcategory: "builtin" },
      string: { category: "string" },
      rune: { category: "string", subcategory: "rune" },
      number: { category: "number" },
      comment: { category: "comment" },
      operator: { category: "operator" },
      punctuation: { category: "punctuation" },
      whitespace: { category: "whitespace" },
      newline: { category: "newline" }
    },
    initialState: "default",
    skipTokens: ["whitespace", "newline", "comment"],
    states: {
      default: {
        rules: [
          // Block comments
          {
            match: {
              kind: "delimited",
              open: "/*",
              close: "*/",
              multiline: true
            },
            token: "comment"
          },
          // Line comments
          { match: { kind: "line", start: "//" }, token: "comment" },
          // Raw strings (backtick)
          {
            match: {
              kind: "delimited",
              open: "`",
              close: "`",
              multiline: true
            },
            token: "string"
          },
          // Interpreted strings
          {
            match: { kind: "delimited", open: '"', close: '"', escape: "\\" },
            token: "string"
          },
          // Rune literals
          {
            match: { kind: "delimited", open: "'", close: "'", escape: "\\" },
            token: "rune"
          },
          // Numbers
          {
            match: {
              kind: "number",
              integer: true,
              float: true,
              hex: true,
              octal: true,
              binary: true,
              scientific: true,
              separator: "_"
            },
            token: "number"
          },
          // Keywords
          {
            match: {
              kind: "keywords",
              words: [
                "break",
                "case",
                "chan",
                "const",
                "continue",
                "default",
                "defer",
                "else",
                "fallthrough",
                "for",
                "func",
                "go",
                "goto",
                "if",
                "import",
                "interface",
                "map",
                "package",
                "range",
                "return",
                "select",
                "struct",
                "switch",
                "type",
                "var"
              ]
            },
            token: "keyword"
          },
          // Constants
          {
            match: {
              kind: "keywords",
              words: ["true", "false", "nil", "iota"]
            },
            token: "constant"
          },
          // Built-in functions
          {
            match: {
              kind: "keywords",
              words: [
                "append",
                "cap",
                "clear",
                "close",
                "complex",
                "copy",
                "delete",
                "imag",
                "len",
                "make",
                "max",
                "min",
                "new",
                "panic",
                "print",
                "println",
                "real",
                "recover"
              ]
            },
            token: "builtin"
          },
          // Built-in types
          {
            match: {
              kind: "keywords",
              words: [
                "bool",
                "byte",
                "complex64",
                "complex128",
                "error",
                "float32",
                "float64",
                "int",
                "int8",
                "int16",
                "int32",
                "int64",
                "rune",
                "string",
                "uint",
                "uint8",
                "uint16",
                "uint32",
                "uint64",
                "uintptr",
                "any",
                "comparable"
              ]
            },
            token: "type_keyword"
          },
          // Type-like identifiers (PascalCase / exported)
          {
            match: {
              kind: "charSequence",
              first: { range: ["A", "Z"] },
              rest: { ref: "identPart" }
            },
            token: "type_name"
          },
          // Identifiers
          {
            match: {
              kind: "charSequence",
              first: { ref: "identStart" },
              rest: { ref: "identPart" }
            },
            token: "identifier"
          },
          // Multi-char operators
          {
            match: {
              kind: "string",
              value: [
                ":=",
                "<-",
                "<<",
                ">>",
                "&^",
                "&&",
                "||",
                "<=",
                ">=",
                "==",
                "!=",
                "+=",
                "-=",
                "*=",
                "/=",
                "%=",
                "&=",
                "|=",
                "^=",
                "<<=",
                ">>=",
                "&^=",
                "++",
                "--",
                "..."
              ]
            },
            token: "operator"
          },
          // Single-char operators
          {
            match: {
              kind: "string",
              value: ["+", "-", "*", "/", "%", "=", "<", ">", "&", "|", "^", "!", "~"]
            },
            token: "operator"
          },
          // Punctuation
          {
            match: {
              kind: "string",
              value: ["{", "}", "(", ")", "[", "]", ";", ":", ",", "."]
            },
            token: "punctuation"
          },
          // Whitespace
          {
            match: {
              kind: "charSequence",
              first: { predefined: "whitespace" },
              rest: { predefined: "whitespace" }
            },
            token: "whitespace"
          },
          {
            match: { kind: "charSequence", first: { predefined: "newline" } },
            token: "newline"
          }
        ]
      }
    }
  },
  structure: {
    blocks: [
      { name: "braces", open: "{", close: "}" },
      { name: "parens", open: "(", close: ")" },
      { name: "brackets", open: "[", close: "]" }
    ],
    symbols: [
      {
        name: "function_declaration",
        kind: "function",
        pattern: [
          { token: "keyword", value: "func" },
          { token: "identifier", capture: "name" }
        ],
        hasBody: true,
        bodyStyle: "braces"
      },
      {
        name: "method_declaration",
        kind: "method",
        pattern: [
          { token: "keyword", value: "func" },
          { token: "punctuation", value: "(" },
          { skip: true, maxTokens: 10 },
          { token: "punctuation", value: ")" },
          { token: "identifier", capture: "name" }
        ],
        hasBody: true,
        bodyStyle: "braces"
      },
      {
        name: "type_declaration",
        kind: "type",
        pattern: [
          { token: "keyword", value: "type" },
          { token: "type_name", capture: "name" }
        ],
        hasBody: true,
        bodyStyle: "braces"
      },
      {
        name: "interface_declaration",
        kind: "interface",
        pattern: [
          { token: "keyword", value: "type" },
          { token: "type_name", capture: "name" },
          { token: "keyword", value: "interface" }
        ],
        hasBody: true,
        bodyStyle: "braces"
      },
      {
        name: "struct_declaration",
        kind: "class",
        pattern: [
          { token: "keyword", value: "type" },
          { token: "type_name", capture: "name" },
          { token: "keyword", value: "struct" }
        ],
        hasBody: true,
        bodyStyle: "braces"
      },
      {
        name: "import_declaration",
        kind: "import",
        pattern: [{ token: "keyword", value: "import" }],
        hasBody: false
      },
      {
        name: "var_declaration",
        kind: "variable",
        pattern: [
          { token: "keyword", value: "var" },
          { token: "identifier", capture: "name" }
        ],
        hasBody: false
      },
      {
        name: "const_declaration",
        kind: "constant",
        pattern: [
          { token: "keyword", value: "const" },
          {
            anyOf: [
              { token: "identifier", capture: "name" },
              { token: "punctuation", value: "(" }
            ]
          }
        ],
        hasBody: false
      }
    ],
    folding: [
      { open: { token: "punctuation", value: "{" }, close: { token: "punctuation", value: "}" } }
    ]
  }
};

// src/profiles/javascript.ts
var javascript = {
  name: "javascript",
  displayName: "JavaScript",
  version: "1.0.0",
  fileExtensions: [".js", ".mjs", ".cjs", ".jsx"],
  mimeTypes: ["text/javascript", "application/javascript"],
  lexer: {
    charClasses: {
      identStart: {
        union: [{ predefined: "letter" }, { chars: "_$" }]
      },
      identPart: {
        union: [{ predefined: "alphanumeric" }, { chars: "_$" }]
      }
    },
    tokenTypes: {
      keyword: { category: "keyword" },
      constant: { category: "constant" },
      identifier: { category: "identifier" },
      type_name: { category: "type" },
      string: { category: "string" },
      template_start: { category: "string", subcategory: "template" },
      template_content: { category: "string", subcategory: "template" },
      template_expr_open: {
        category: "punctuation",
        subcategory: "template"
      },
      template_end: { category: "string", subcategory: "template" },
      number: { category: "number" },
      comment: { category: "comment" },
      regexp: { category: "regexp" },
      operator: { category: "operator" },
      punctuation: { category: "punctuation" },
      jsx_tag_open: { category: "tag" },
      jsx_tag_close: { category: "tag" },
      jsx_tag_end: { category: "tag" },
      whitespace: { category: "whitespace" },
      newline: { category: "newline" }
    },
    initialState: "default",
    skipTokens: ["whitespace", "newline", "comment"],
    states: {
      default: {
        rules: [
          // Block comments
          {
            match: {
              kind: "delimited",
              open: "/*",
              close: "*/",
              multiline: true
            },
            token: "comment"
          },
          // Line comments
          { match: { kind: "line", start: "//" }, token: "comment" },
          // Template strings
          {
            match: { kind: "string", value: "`" },
            token: "template_start",
            push: "template_string"
          },
          // Strings
          {
            match: { kind: "delimited", open: '"', close: '"', escape: "\\" },
            token: "string"
          },
          {
            match: { kind: "delimited", open: "'", close: "'", escape: "\\" },
            token: "string"
          },
          // Numbers
          {
            match: {
              kind: "number",
              integer: true,
              float: true,
              hex: true,
              binary: true,
              octal: true,
              scientific: true,
              separator: "_"
            },
            token: "number"
          },
          // Keywords
          {
            match: {
              kind: "keywords",
              words: [
                "break",
                "case",
                "catch",
                "class",
                "const",
                "continue",
                "debugger",
                "default",
                "delete",
                "do",
                "else",
                "export",
                "extends",
                "finally",
                "for",
                "function",
                "if",
                "import",
                "in",
                "instanceof",
                "let",
                "new",
                "return",
                "super",
                "switch",
                "this",
                "throw",
                "try",
                "typeof",
                "var",
                "void",
                "while",
                "with",
                "yield",
                "async",
                "await",
                "of",
                "static",
                "get",
                "set",
                "from",
                "as"
              ]
            },
            token: "keyword"
          },
          // Constants
          {
            match: {
              kind: "keywords",
              words: ["true", "false", "null", "undefined", "NaN", "Infinity"]
            },
            token: "constant"
          },
          // Type-like identifiers (PascalCase)
          {
            match: {
              kind: "charSequence",
              first: { range: ["A", "Z"] },
              rest: { ref: "identPart" }
            },
            token: "type_name"
          },
          // Identifiers
          {
            match: {
              kind: "charSequence",
              first: { ref: "identStart" },
              rest: { ref: "identPart" }
            },
            token: "identifier"
          },
          // Multi-char operators (longest match first)
          {
            match: {
              kind: "string",
              value: [
                ">>>=",
                "<<=",
                ">>=",
                "**=",
                "&&=",
                "||=",
                "??=",
                "===",
                "!==",
                ">>>",
                "...",
                "==",
                "!=",
                ">=",
                "<=",
                "&&",
                "||",
                "??",
                "?.",
                "**",
                "++",
                "--",
                "+=",
                "-=",
                "*=",
                "/=",
                "%=",
                "&=",
                "|=",
                "^=",
                "=>",
                "<<",
                ">>"
              ]
            },
            token: "operator"
          },
          // Single-char operators
          {
            match: {
              kind: "string",
              value: [
                "+",
                "-",
                "*",
                "/",
                "%",
                "=",
                "!",
                "<",
                ">",
                "&",
                "|",
                "^",
                "~",
                "?",
                ":"
              ]
            },
            token: "operator"
          },
          // Punctuation
          {
            match: {
              kind: "string",
              value: ["{", "}", "(", ")", "[", "]", ";", ",", "."]
            },
            token: "punctuation"
          },
          // Whitespace
          {
            match: {
              kind: "charSequence",
              first: { predefined: "whitespace" },
              rest: { predefined: "whitespace" }
            },
            token: "whitespace"
          },
          {
            match: { kind: "charSequence", first: { predefined: "newline" } },
            token: "newline"
          }
        ]
      },
      template_string: {
        rules: [
          // Expression hole ${
          {
            match: { kind: "string", value: "${" },
            token: "template_expr_open",
            push: "template_expr"
          },
          // End of template string
          {
            match: { kind: "string", value: "`" },
            token: "template_end",
            pop: true
          }
          // Template content: any chars (handled by engine consuming until ` or ${)
        ]
      },
      template_expr: {
        rules: [
          // Closing brace ends expression, return to template string
          {
            match: { kind: "string", value: "}" },
            token: "punctuation",
            pop: true
          },
          // Nested template string inside expression
          {
            match: { kind: "string", value: "`" },
            token: "template_start",
            push: "template_string"
          },
          // Block comments
          {
            match: {
              kind: "delimited",
              open: "/*",
              close: "*/",
              multiline: true
            },
            token: "comment"
          },
          // Line comments
          { match: { kind: "line", start: "//" }, token: "comment" },
          // Strings
          {
            match: { kind: "delimited", open: '"', close: '"', escape: "\\" },
            token: "string"
          },
          {
            match: { kind: "delimited", open: "'", close: "'", escape: "\\" },
            token: "string"
          },
          // Numbers
          {
            match: {
              kind: "number",
              integer: true,
              float: true,
              hex: true,
              binary: true,
              octal: true,
              scientific: true,
              separator: "_"
            },
            token: "number"
          },
          // Keywords
          {
            match: {
              kind: "keywords",
              words: [
                "break",
                "case",
                "catch",
                "class",
                "const",
                "continue",
                "debugger",
                "default",
                "delete",
                "do",
                "else",
                "export",
                "extends",
                "finally",
                "for",
                "function",
                "if",
                "import",
                "in",
                "instanceof",
                "let",
                "new",
                "return",
                "super",
                "switch",
                "this",
                "throw",
                "try",
                "typeof",
                "var",
                "void",
                "while",
                "with",
                "yield",
                "async",
                "await",
                "of"
              ]
            },
            token: "keyword"
          },
          // Constants
          {
            match: {
              kind: "keywords",
              words: ["true", "false", "null", "undefined", "NaN", "Infinity"]
            },
            token: "constant"
          },
          // Identifiers
          {
            match: {
              kind: "charSequence",
              first: { ref: "identStart" },
              rest: { ref: "identPart" }
            },
            token: "identifier"
          },
          // Operators
          {
            match: {
              kind: "string",
              value: [
                "===",
                "!==",
                "==",
                "!=",
                ">=",
                "<=",
                "&&",
                "||",
                "??",
                "?.",
                "**",
                "++",
                "--",
                "+=",
                "-=",
                "*=",
                "/=",
                "%=",
                "=>",
                "<<",
                ">>",
                ">>>",
                "..."
              ]
            },
            token: "operator"
          },
          {
            match: {
              kind: "string",
              value: ["+", "-", "*", "/", "%", "=", "!", "<", ">", "&", "|", "^", "~", "?", ":"]
            },
            token: "operator"
          },
          // Punctuation (but NOT }, which is handled above)
          {
            match: {
              kind: "string",
              value: ["{", "(", ")", "[", "]", ";", ",", "."]
            },
            token: "punctuation"
          },
          // Nested braces: push another template_expr to track brace depth
          // (handled by engine via block tracking)
          // Whitespace
          {
            match: {
              kind: "charSequence",
              first: { predefined: "whitespace" },
              rest: { predefined: "whitespace" }
            },
            token: "whitespace"
          },
          {
            match: { kind: "charSequence", first: { predefined: "newline" } },
            token: "newline"
          }
        ]
      }
    }
  },
  structure: {
    blocks: [
      { name: "braces", open: "{", close: "}" },
      { name: "parens", open: "(", close: ")" },
      { name: "brackets", open: "[", close: "]" }
    ],
    symbols: [
      {
        name: "function_declaration",
        kind: "function",
        pattern: [
          { token: "keyword", value: "function" },
          { token: "identifier", capture: "name" }
        ],
        hasBody: true,
        bodyStyle: "braces"
      },
      {
        name: "async_function_declaration",
        kind: "function",
        pattern: [
          { token: "keyword", value: "async" },
          { token: "keyword", value: "function" },
          { token: "identifier", capture: "name" }
        ],
        hasBody: true,
        bodyStyle: "braces"
      },
      {
        name: "class_declaration",
        kind: "class",
        pattern: [
          { token: "keyword", value: "class" },
          {
            anyOf: [
              { token: "identifier", capture: "name" },
              { token: "type_name", capture: "name" }
            ]
          }
        ],
        hasBody: true,
        bodyStyle: "braces"
      },
      {
        name: "arrow_function_const",
        kind: "function",
        pattern: [
          { token: "keyword", value: "const" },
          { token: "identifier", capture: "name" },
          { token: "operator", value: "=" },
          { skip: true, maxTokens: 30 },
          { token: "operator", value: "=>" }
        ],
        hasBody: true,
        bodyStyle: "braces"
      },
      {
        name: "arrow_function_let",
        kind: "function",
        pattern: [
          { token: "keyword", value: "let" },
          { token: "identifier", capture: "name" },
          { token: "operator", value: "=" },
          { skip: true, maxTokens: 30 },
          { token: "operator", value: "=>" }
        ],
        hasBody: true,
        bodyStyle: "braces"
      },
      {
        name: "lexical_declaration",
        kind: "variable",
        pattern: [
          {
            anyOf: [
              { token: "keyword", value: "const" },
              { token: "keyword", value: "let" }
            ]
          },
          { token: "identifier", capture: "name" }
        ],
        hasBody: false
      },
      {
        name: "variable_declaration",
        kind: "variable",
        pattern: [
          { token: "keyword", value: "var" },
          { token: "identifier", capture: "name" }
        ],
        hasBody: false
      },
      {
        name: "import_statement",
        kind: "import",
        pattern: [{ token: "keyword", value: "import" }],
        hasBody: false
      },
      {
        name: "export_statement",
        kind: "export",
        pattern: [{ token: "keyword", value: "export" }],
        hasBody: false
      }
    ],
    folding: [
      { open: { token: "punctuation", value: "{" }, close: { token: "punctuation", value: "}" } },
      { open: { token: "comment" }, close: { token: "comment" } }
    ]
  }
};

// src/profiles/typescript.ts
var typescript = {
  name: "typescript",
  displayName: "TypeScript",
  version: "1.0.0",
  fileExtensions: [".ts", ".mts", ".cts", ".tsx"],
  mimeTypes: ["text/typescript", "application/typescript"],
  extends: "javascript",
  lexer: {
    charClasses: {
      identStart: {
        union: [{ predefined: "letter" }, { chars: "_$" }]
      },
      identPart: {
        union: [{ predefined: "alphanumeric" }, { chars: "_$" }]
      }
    },
    tokenTypes: {
      keyword: { category: "keyword" },
      ts_keyword: { category: "keyword", subcategory: "typescript" },
      constant: { category: "constant" },
      identifier: { category: "identifier" },
      type_name: { category: "type" },
      decorator: { category: "decorator" },
      string: { category: "string" },
      template_start: { category: "string", subcategory: "template" },
      template_content: { category: "string", subcategory: "template" },
      template_expr_open: {
        category: "punctuation",
        subcategory: "template"
      },
      template_end: { category: "string", subcategory: "template" },
      number: { category: "number" },
      comment: { category: "comment" },
      operator: { category: "operator" },
      punctuation: { category: "punctuation" },
      jsx_tag_open: { category: "tag" },
      jsx_tag_close: { category: "tag" },
      jsx_tag_end: { category: "tag" },
      whitespace: { category: "whitespace" },
      newline: { category: "newline" }
    },
    initialState: "default",
    skipTokens: ["whitespace", "newline", "comment"],
    states: {
      default: {
        rules: [
          // Block comments
          {
            match: {
              kind: "delimited",
              open: "/*",
              close: "*/",
              multiline: true
            },
            token: "comment"
          },
          // Line comments
          { match: { kind: "line", start: "//" }, token: "comment" },
          // Template strings
          {
            match: { kind: "string", value: "`" },
            token: "template_start",
            push: "template_string"
          },
          // Strings
          {
            match: { kind: "delimited", open: '"', close: '"', escape: "\\" },
            token: "string"
          },
          {
            match: { kind: "delimited", open: "'", close: "'", escape: "\\" },
            token: "string"
          },
          // Decorators
          {
            match: {
              kind: "sequence",
              elements: [
                { kind: "string", value: "@" },
                {
                  kind: "charSequence",
                  first: { ref: "identStart" },
                  rest: {
                    union: [{ predefined: "alphanumeric" }, { chars: "_$." }]
                  }
                }
              ]
            },
            token: "decorator"
          },
          // Numbers
          {
            match: {
              kind: "number",
              integer: true,
              float: true,
              hex: true,
              binary: true,
              octal: true,
              scientific: true,
              separator: "_"
            },
            token: "number"
          },
          // TypeScript-specific keywords
          {
            match: {
              kind: "keywords",
              words: [
                "interface",
                "type",
                "enum",
                "namespace",
                "module",
                "declare",
                "abstract",
                "implements",
                "readonly",
                "public",
                "private",
                "protected",
                "override",
                "keyof",
                "infer",
                "is",
                "asserts",
                "satisfies",
                "as",
                "unknown",
                "never",
                "any"
              ]
            },
            token: "ts_keyword"
          },
          // JavaScript keywords
          {
            match: {
              kind: "keywords",
              words: [
                "break",
                "case",
                "catch",
                "class",
                "const",
                "continue",
                "debugger",
                "default",
                "delete",
                "do",
                "else",
                "export",
                "extends",
                "finally",
                "for",
                "function",
                "if",
                "import",
                "in",
                "instanceof",
                "let",
                "new",
                "return",
                "super",
                "switch",
                "this",
                "throw",
                "try",
                "typeof",
                "var",
                "void",
                "while",
                "with",
                "yield",
                "async",
                "await",
                "of",
                "static",
                "get",
                "set",
                "from"
              ]
            },
            token: "keyword"
          },
          // Constants
          {
            match: {
              kind: "keywords",
              words: ["true", "false", "null", "undefined", "NaN", "Infinity"]
            },
            token: "constant"
          },
          // Type-like identifiers (PascalCase)
          {
            match: {
              kind: "charSequence",
              first: { range: ["A", "Z"] },
              rest: { ref: "identPart" }
            },
            token: "type_name"
          },
          // Identifiers
          {
            match: {
              kind: "charSequence",
              first: { ref: "identStart" },
              rest: { ref: "identPart" }
            },
            token: "identifier"
          },
          // Multi-char operators
          {
            match: {
              kind: "string",
              value: [
                ">>>=",
                "<<=",
                ">>=",
                "**=",
                "&&=",
                "||=",
                "??=",
                "===",
                "!==",
                ">>>",
                "...",
                "==",
                "!=",
                ">=",
                "<=",
                "&&",
                "||",
                "??",
                "?.",
                "**",
                "++",
                "--",
                "+=",
                "-=",
                "*=",
                "/=",
                "%=",
                "&=",
                "|=",
                "^=",
                "=>",
                "<<",
                ">>"
              ]
            },
            token: "operator"
          },
          // Single-char operators
          {
            match: {
              kind: "string",
              value: [
                "+",
                "-",
                "*",
                "/",
                "%",
                "=",
                "!",
                "<",
                ">",
                "&",
                "|",
                "^",
                "~",
                "?",
                ":"
              ]
            },
            token: "operator"
          },
          // Punctuation
          {
            match: {
              kind: "string",
              value: ["{", "}", "(", ")", "[", "]", ";", ",", "."]
            },
            token: "punctuation"
          },
          // Whitespace
          {
            match: {
              kind: "charSequence",
              first: { predefined: "whitespace" },
              rest: { predefined: "whitespace" }
            },
            token: "whitespace"
          },
          {
            match: { kind: "charSequence", first: { predefined: "newline" } },
            token: "newline"
          }
        ]
      },
      template_string: {
        rules: [
          {
            match: { kind: "string", value: "${" },
            token: "template_expr_open",
            push: "template_expr"
          },
          {
            match: { kind: "string", value: "`" },
            token: "template_end",
            pop: true
          }
        ]
      },
      template_expr: {
        rules: [
          {
            match: { kind: "string", value: "}" },
            token: "punctuation",
            pop: true
          },
          {
            match: { kind: "string", value: "`" },
            token: "template_start",
            push: "template_string"
          },
          {
            match: {
              kind: "delimited",
              open: "/*",
              close: "*/",
              multiline: true
            },
            token: "comment"
          },
          { match: { kind: "line", start: "//" }, token: "comment" },
          {
            match: { kind: "delimited", open: '"', close: '"', escape: "\\" },
            token: "string"
          },
          {
            match: { kind: "delimited", open: "'", close: "'", escape: "\\" },
            token: "string"
          },
          {
            match: {
              kind: "number",
              integer: true,
              float: true,
              hex: true,
              binary: true,
              octal: true,
              scientific: true,
              separator: "_"
            },
            token: "number"
          },
          {
            match: {
              kind: "keywords",
              words: [
                "break",
                "case",
                "catch",
                "class",
                "const",
                "continue",
                "delete",
                "do",
                "else",
                "export",
                "extends",
                "finally",
                "for",
                "function",
                "if",
                "import",
                "in",
                "instanceof",
                "let",
                "new",
                "return",
                "super",
                "switch",
                "this",
                "throw",
                "try",
                "typeof",
                "var",
                "void",
                "while",
                "with",
                "yield",
                "async",
                "await",
                "of",
                "interface",
                "type",
                "enum",
                "as",
                "keyof"
              ]
            },
            token: "keyword"
          },
          {
            match: {
              kind: "keywords",
              words: ["true", "false", "null", "undefined"]
            },
            token: "constant"
          },
          {
            match: {
              kind: "charSequence",
              first: { ref: "identStart" },
              rest: { ref: "identPart" }
            },
            token: "identifier"
          },
          {
            match: {
              kind: "string",
              value: [
                "===",
                "!==",
                "==",
                "!=",
                ">=",
                "<=",
                "&&",
                "||",
                "??",
                "?.",
                "**",
                "++",
                "--",
                "+=",
                "-=",
                "*=",
                "/=",
                "%=",
                "=>",
                "<<",
                ">>",
                ">>>",
                "..."
              ]
            },
            token: "operator"
          },
          {
            match: {
              kind: "string",
              value: ["+", "-", "*", "/", "%", "=", "!", "<", ">", "&", "|", "^", "~", "?", ":"]
            },
            token: "operator"
          },
          {
            match: {
              kind: "string",
              value: ["{", "(", ")", "[", "]", ";", ",", "."]
            },
            token: "punctuation"
          },
          {
            match: {
              kind: "charSequence",
              first: { predefined: "whitespace" },
              rest: { predefined: "whitespace" }
            },
            token: "whitespace"
          },
          {
            match: { kind: "charSequence", first: { predefined: "newline" } },
            token: "newline"
          }
        ]
      }
    }
  },
  structure: {
    blocks: [
      { name: "braces", open: "{", close: "}" },
      { name: "parens", open: "(", close: ")" },
      { name: "brackets", open: "[", close: "]" }
    ],
    symbols: [
      {
        name: "function_declaration",
        kind: "function",
        pattern: [
          { token: "keyword", value: "function" },
          { token: "identifier", capture: "name" }
        ],
        hasBody: true,
        bodyStyle: "braces"
      },
      {
        name: "async_function_declaration",
        kind: "function",
        pattern: [
          { token: "keyword", value: "async" },
          { token: "keyword", value: "function" },
          { token: "identifier", capture: "name" }
        ],
        hasBody: true,
        bodyStyle: "braces"
      },
      {
        name: "class_declaration",
        kind: "class",
        pattern: [
          { token: "keyword", value: "class" },
          {
            anyOf: [
              { token: "identifier", capture: "name" },
              { token: "type_name", capture: "name" }
            ]
          }
        ],
        hasBody: true,
        bodyStyle: "braces"
      },
      {
        name: "abstract_class_declaration",
        kind: "class",
        pattern: [
          { token: "ts_keyword", value: "abstract" },
          { token: "keyword", value: "class" },
          {
            anyOf: [
              { token: "identifier", capture: "name" },
              { token: "type_name", capture: "name" }
            ]
          }
        ],
        hasBody: true,
        bodyStyle: "braces"
      },
      {
        name: "interface_declaration",
        kind: "interface",
        pattern: [
          { token: "ts_keyword", value: "interface" },
          { token: "type_name", capture: "name" }
        ],
        hasBody: true,
        bodyStyle: "braces"
      },
      {
        name: "type_alias_declaration",
        kind: "type",
        pattern: [
          { token: "ts_keyword", value: "type" },
          { token: "type_name", capture: "name" }
        ],
        hasBody: false
      },
      {
        name: "enum_declaration",
        kind: "enum",
        pattern: [
          { token: "ts_keyword", value: "enum" },
          {
            anyOf: [
              { token: "identifier", capture: "name" },
              { token: "type_name", capture: "name" }
            ]
          }
        ],
        hasBody: true,
        bodyStyle: "braces"
      },
      {
        name: "namespace_declaration",
        kind: "namespace",
        pattern: [
          { token: "ts_keyword", value: "namespace" },
          {
            anyOf: [
              { token: "identifier", capture: "name" },
              { token: "type_name", capture: "name" }
            ]
          }
        ],
        hasBody: true,
        bodyStyle: "braces"
      },
      {
        name: "arrow_function_const",
        kind: "function",
        pattern: [
          { token: "keyword", value: "const" },
          { token: "identifier", capture: "name" },
          { token: "operator", value: "=" },
          { skip: true, maxTokens: 50 },
          { token: "operator", value: "=>" }
        ],
        hasBody: true,
        bodyStyle: "braces"
      },
      {
        name: "lexical_declaration",
        kind: "variable",
        pattern: [
          {
            anyOf: [
              { token: "keyword", value: "const" },
              { token: "keyword", value: "let" }
            ]
          },
          { token: "identifier", capture: "name" }
        ],
        hasBody: false
      },
      {
        name: "variable_declaration",
        kind: "variable",
        pattern: [
          { token: "keyword", value: "var" },
          { token: "identifier", capture: "name" }
        ],
        hasBody: false
      },
      {
        name: "import_statement",
        kind: "import",
        pattern: [{ token: "keyword", value: "import" }],
        hasBody: false
      },
      {
        name: "export_statement",
        kind: "export",
        pattern: [{ token: "keyword", value: "export" }],
        hasBody: false
      }
    ],
    folding: [
      { open: { token: "punctuation", value: "{" }, close: { token: "punctuation", value: "}" } }
    ]
  }
};

// src/profiles/cpp.ts
var cpp = {
  name: "cpp",
  displayName: "C++",
  version: "1.0.0",
  fileExtensions: [".cpp", ".hpp", ".cc", ".hh", ".cxx", ".hxx", ".h"],
  mimeTypes: ["text/x-c++src"],
  lexer: {
    charClasses: {
      identStart: {
        union: [{ predefined: "letter" }, { chars: "_" }]
      },
      identPart: {
        union: [{ predefined: "alphanumeric" }, { chars: "_" }]
      }
    },
    tokenTypes: {
      keyword: { category: "keyword" },
      type_keyword: { category: "type", subcategory: "builtin" },
      constant: { category: "constant" },
      identifier: { category: "identifier" },
      type_name: { category: "type" },
      preprocessor: { category: "meta", subcategory: "preprocessor" },
      string: { category: "string" },
      char_literal: { category: "string", subcategory: "char" },
      raw_string: { category: "string", subcategory: "raw" },
      number: { category: "number" },
      comment: { category: "comment" },
      operator: { category: "operator" },
      punctuation: { category: "punctuation" },
      whitespace: { category: "whitespace" },
      newline: { category: "newline" }
    },
    initialState: "default",
    skipTokens: ["whitespace", "newline", "comment"],
    states: {
      default: {
        rules: [
          // Block comments
          {
            match: {
              kind: "delimited",
              open: "/*",
              close: "*/",
              multiline: true
            },
            token: "comment"
          },
          // Line comments
          { match: { kind: "line", start: "//" }, token: "comment" },
          // Preprocessor directives
          { match: { kind: "line", start: "#" }, token: "preprocessor" },
          // Raw strings R"delimiter(content)delimiter"
          {
            match: {
              kind: "pattern",
              regex: 'R"([^(\\s]*)\\([\\s\\S]*?\\)\\1"'
            },
            token: "raw_string"
          },
          // Regular strings
          {
            match: { kind: "delimited", open: '"', close: '"', escape: "\\" },
            token: "string"
          },
          // Character literals
          {
            match: { kind: "delimited", open: "'", close: "'", escape: "\\" },
            token: "char_literal"
          },
          // Numbers
          {
            match: {
              kind: "number",
              integer: true,
              float: true,
              hex: true,
              octal: true,
              binary: true,
              scientific: true,
              separator: "'",
              suffix: ["u", "U", "l", "L", "ll", "LL", "ul", "UL", "ull", "ULL", "f", "F"]
            },
            token: "number"
          },
          // C++ keywords
          {
            match: {
              kind: "keywords",
              words: [
                "alignas",
                "alignof",
                "and",
                "and_eq",
                "asm",
                "auto",
                "bitand",
                "bitor",
                "break",
                "case",
                "catch",
                "class",
                "compl",
                "concept",
                "const",
                "consteval",
                "constexpr",
                "constinit",
                "const_cast",
                "continue",
                "co_await",
                "co_return",
                "co_yield",
                "decltype",
                "default",
                "delete",
                "do",
                "dynamic_cast",
                "else",
                "enum",
                "explicit",
                "export",
                "extern",
                "for",
                "friend",
                "goto",
                "if",
                "inline",
                "mutable",
                "namespace",
                "new",
                "noexcept",
                "not",
                "not_eq",
                "operator",
                "or",
                "or_eq",
                "private",
                "protected",
                "public",
                "register",
                "reinterpret_cast",
                "requires",
                "return",
                "sizeof",
                "static",
                "static_assert",
                "static_cast",
                "struct",
                "switch",
                "template",
                "this",
                "throw",
                "try",
                "typedef",
                "typeid",
                "typename",
                "union",
                "using",
                "virtual",
                "volatile",
                "while",
                "xor",
                "xor_eq",
                "override",
                "final"
              ]
            },
            token: "keyword"
          },
          // Built-in types
          {
            match: {
              kind: "keywords",
              words: [
                "void",
                "bool",
                "char",
                "char8_t",
                "char16_t",
                "char32_t",
                "wchar_t",
                "short",
                "int",
                "long",
                "float",
                "double",
                "signed",
                "unsigned",
                "size_t",
                "ptrdiff_t",
                "nullptr_t",
                "int8_t",
                "int16_t",
                "int32_t",
                "int64_t",
                "uint8_t",
                "uint16_t",
                "uint32_t",
                "uint64_t"
              ]
            },
            token: "type_keyword"
          },
          // Constants
          {
            match: {
              kind: "keywords",
              words: ["true", "false", "nullptr", "NULL"]
            },
            token: "constant"
          },
          // Type-like identifiers (PascalCase)
          {
            match: {
              kind: "charSequence",
              first: { range: ["A", "Z"] },
              rest: { ref: "identPart" }
            },
            token: "type_name"
          },
          // Identifiers
          {
            match: {
              kind: "charSequence",
              first: { ref: "identStart" },
              rest: { ref: "identPart" }
            },
            token: "identifier"
          },
          // Multi-char operators
          {
            match: {
              kind: "string",
              value: [
                "<<=",
                ">>=",
                "<=>",
                "->*",
                "==",
                "!=",
                ">=",
                "<=",
                "&&",
                "||",
                "<<",
                ">>",
                "++",
                "--",
                "+=",
                "-=",
                "*=",
                "/=",
                "%=",
                "&=",
                "|=",
                "^=",
                "->",
                "::",
                ".*",
                "..."
              ]
            },
            token: "operator"
          },
          // Single-char operators
          {
            match: {
              kind: "string",
              value: ["+", "-", "*", "/", "%", "=", "!", "<", ">", "&", "|", "^", "~", "?", ":"]
            },
            token: "operator"
          },
          // Punctuation
          {
            match: {
              kind: "string",
              value: ["{", "}", "(", ")", "[", "]", ";", ",", "."]
            },
            token: "punctuation"
          },
          // Whitespace
          {
            match: {
              kind: "charSequence",
              first: { predefined: "whitespace" },
              rest: { predefined: "whitespace" }
            },
            token: "whitespace"
          },
          {
            match: { kind: "charSequence", first: { predefined: "newline" } },
            token: "newline"
          }
        ]
      }
    }
  },
  structure: {
    blocks: [
      { name: "braces", open: "{", close: "}" },
      { name: "parens", open: "(", close: ")" },
      { name: "brackets", open: "[", close: "]" }
    ],
    symbols: [
      {
        name: "function_definition",
        kind: "function",
        pattern: [
          {
            anyOf: [
              { token: "type_keyword" },
              { token: "type_name" },
              { token: "identifier" }
            ]
          },
          { token: "identifier", capture: "name" },
          { token: "punctuation", value: "(" }
        ],
        hasBody: true,
        bodyStyle: "braces"
      },
      {
        name: "class_specifier",
        kind: "class",
        pattern: [
          { token: "keyword", value: "class" },
          { token: "identifier", capture: "name" }
        ],
        hasBody: true,
        bodyStyle: "braces"
      },
      {
        name: "struct_specifier",
        kind: "class",
        pattern: [
          { token: "keyword", value: "struct" },
          { token: "identifier", capture: "name" }
        ],
        hasBody: true,
        bodyStyle: "braces"
      },
      {
        name: "enum_specifier",
        kind: "enum",
        pattern: [
          { token: "keyword", value: "enum" },
          { optional: { token: "keyword", value: "class" } },
          { token: "identifier", capture: "name" }
        ],
        hasBody: true,
        bodyStyle: "braces"
      },
      {
        name: "namespace_definition",
        kind: "namespace",
        pattern: [
          { token: "keyword", value: "namespace" },
          { token: "identifier", capture: "name" }
        ],
        hasBody: true,
        bodyStyle: "braces"
      },
      {
        name: "template_declaration",
        kind: "other",
        pattern: [
          { token: "keyword", value: "template" },
          { token: "operator", value: "<" }
        ],
        hasBody: false
      },
      {
        name: "typedef_declaration",
        kind: "type",
        pattern: [{ token: "keyword", value: "typedef" }],
        hasBody: false
      },
      {
        name: "using_declaration",
        kind: "type",
        pattern: [
          { token: "keyword", value: "using" },
          { token: "identifier", capture: "name" }
        ],
        hasBody: false
      }
    ],
    folding: [
      { open: { token: "punctuation", value: "{" }, close: { token: "punctuation", value: "}" } },
      { open: { token: "preprocessor" }, close: { token: "preprocessor" } }
    ]
  }
};

// src/profiles/html.ts
var html = {
  name: "html",
  displayName: "HTML",
  version: "1.0.0",
  fileExtensions: [".html", ".htm"],
  mimeTypes: ["text/html"],
  lexer: {
    charClasses: {
      tagNameChar: {
        union: [{ predefined: "alphanumeric" }, { chars: "-_" }]
      },
      attrNameChar: {
        union: [{ predefined: "alphanumeric" }, { chars: "-_:." }]
      }
    },
    tokenTypes: {
      comment: { category: "comment" },
      doctype: { category: "meta", subcategory: "doctype" },
      tag_open: { category: "tag" },
      tag_close: { category: "tag" },
      tag_self_close: { category: "tag" },
      tag_name: { category: "tag", subcategory: "name" },
      attr_name: { category: "attribute" },
      attr_eq: { category: "operator" },
      string: { category: "string" },
      text: { category: "plain" },
      entity: { category: "escape" },
      whitespace: { category: "whitespace" },
      newline: { category: "newline" }
    },
    initialState: "content",
    skipTokens: ["whitespace", "newline"],
    states: {
      content: {
        rules: [
          // HTML comments
          {
            match: {
              kind: "delimited",
              open: "<!--",
              close: "-->",
              multiline: true
            },
            token: "comment"
          },
          // DOCTYPE
          {
            match: {
              kind: "pattern",
              regex: "<!DOCTYPE[^>]*>"
            },
            token: "doctype"
          },
          // Closing tag
          {
            match: { kind: "string", value: "</" },
            token: "tag_close",
            push: "tag"
          },
          // Opening tag
          {
            match: { kind: "string", value: "<" },
            token: "tag_open",
            push: "tag"
          },
          // HTML entities
          {
            match: {
              kind: "pattern",
              regex: "&(?:#[0-9]+|#x[0-9a-fA-F]+|[a-zA-Z]+);"
            },
            token: "entity"
          },
          // Whitespace
          {
            match: {
              kind: "charSequence",
              first: { predefined: "whitespace" },
              rest: { predefined: "whitespace" }
            },
            token: "whitespace"
          },
          {
            match: { kind: "charSequence", first: { predefined: "newline" } },
            token: "newline"
          },
          // Text content (any non-tag, non-entity content)
          {
            match: {
              kind: "charSequence",
              first: { negate: { chars: "<&" } },
              rest: { negate: { chars: "<&" } }
            },
            token: "text"
          }
        ]
      },
      tag: {
        rules: [
          // Self-closing tag end
          {
            match: { kind: "string", value: "/>" },
            token: "tag_self_close",
            pop: true
          },
          // Tag end
          {
            match: { kind: "string", value: ">" },
            token: "tag_open",
            pop: true
          },
          // Tag name
          {
            match: {
              kind: "charSequence",
              first: { predefined: "letter" },
              rest: { ref: "tagNameChar" }
            },
            token: "tag_name"
          },
          // Attribute name
          {
            match: {
              kind: "charSequence",
              first: { predefined: "letter" },
              rest: { ref: "attrNameChar" }
            },
            token: "attr_name"
          },
          // Attribute =
          { match: { kind: "string", value: "=" }, token: "attr_eq" },
          // Attribute values
          {
            match: { kind: "delimited", open: '"', close: '"', escape: "\\" },
            token: "string"
          },
          {
            match: { kind: "delimited", open: "'", close: "'", escape: "\\" },
            token: "string"
          },
          // Whitespace
          {
            match: {
              kind: "charSequence",
              first: { predefined: "whitespace" },
              rest: { predefined: "whitespace" }
            },
            token: "whitespace"
          },
          {
            match: { kind: "charSequence", first: { predefined: "newline" } },
            token: "newline"
          }
        ]
      }
    }
  },
  structure: {
    blocks: [],
    symbols: []
  },
  embeddedLanguages: [
    {
      language: "css",
      start: { token: "tag_name", value: "style" },
      end: { token: "tag_close" },
      languageDetection: "fixed"
    },
    {
      language: "javascript",
      start: { token: "tag_name", value: "script" },
      end: { token: "tag_close" },
      languageDetection: "attribute",
      attributeToken: "string"
    }
  ]
};

// src/profiles/markdown.ts
var markdown = {
  name: "markdown",
  displayName: "Markdown",
  version: "1.0.0",
  fileExtensions: [".md", ".markdown", ".mdx"],
  mimeTypes: ["text/markdown"],
  lexer: {
    tokenTypes: {
      heading: { category: "keyword", subcategory: "heading" },
      code_fence_open: { category: "meta", subcategory: "code-fence" },
      code_fence_close: { category: "meta", subcategory: "code-fence" },
      code_content: { category: "string", subcategory: "code" },
      code_language: { category: "identifier", subcategory: "language" },
      inline_code: { category: "string", subcategory: "inline-code" },
      bold: { category: "keyword", subcategory: "bold" },
      italic: { category: "keyword", subcategory: "italic" },
      link_text: { category: "string", subcategory: "link-text" },
      link_url: { category: "variable", subcategory: "link-url" },
      image_marker: { category: "keyword", subcategory: "image" },
      list_marker: { category: "punctuation", subcategory: "list" },
      blockquote: { category: "punctuation", subcategory: "blockquote" },
      hr: { category: "punctuation", subcategory: "hr" },
      html_tag: { category: "tag" },
      text: { category: "plain" },
      whitespace: { category: "whitespace" },
      newline: { category: "newline" }
    },
    initialState: "default",
    skipTokens: [],
    states: {
      default: {
        rules: [
          // Fenced code block open (``` or ~~~)
          {
            match: {
              kind: "sequence",
              elements: [
                { kind: "string", value: ["```", "~~~"] },
                {
                  kind: "charSequence",
                  first: { predefined: "letter" },
                  rest: {
                    union: [{ predefined: "alphanumeric" }, { chars: "-_+." }]
                  }
                }
              ]
            },
            token: "code_fence_open",
            push: "code_block"
          },
          // Fenced code block without language
          {
            match: { kind: "string", value: ["```", "~~~"] },
            token: "code_fence_open",
            push: "code_block"
          },
          // Headings (# through ######)
          {
            match: {
              kind: "sequence",
              elements: [
                { kind: "string", value: ["######", "#####", "####", "###", "##", "#"] },
                { kind: "charSequence", first: { predefined: "whitespace" } }
              ]
            },
            token: "heading"
          },
          // Inline code
          {
            match: {
              kind: "delimited",
              open: "``",
              close: "``"
            },
            token: "inline_code"
          },
          {
            match: {
              kind: "delimited",
              open: "`",
              close: "`"
            },
            token: "inline_code"
          },
          // Bold
          {
            match: {
              kind: "delimited",
              open: "**",
              close: "**"
            },
            token: "bold"
          },
          {
            match: {
              kind: "delimited",
              open: "__",
              close: "__"
            },
            token: "bold"
          },
          // Italic
          {
            match: {
              kind: "delimited",
              open: "*",
              close: "*"
            },
            token: "italic"
          },
          {
            match: {
              kind: "delimited",
              open: "_",
              close: "_"
            },
            token: "italic"
          },
          // Image
          {
            match: { kind: "string", value: "![" },
            token: "image_marker"
          },
          // Link text [text](url)
          {
            match: {
              kind: "delimited",
              open: "[",
              close: "]"
            },
            token: "link_text"
          },
          {
            match: {
              kind: "delimited",
              open: "(",
              close: ")"
            },
            token: "link_url"
          },
          // Horizontal rule
          {
            match: { kind: "string", value: ["---", "***", "___"] },
            token: "hr"
          },
          // Blockquote
          {
            match: {
              kind: "sequence",
              elements: [
                { kind: "string", value: ">" },
                {
                  kind: "charSequence",
                  first: { predefined: "whitespace" }
                }
              ]
            },
            token: "blockquote"
          },
          // Unordered list markers
          {
            match: {
              kind: "sequence",
              elements: [
                { kind: "string", value: ["-", "*", "+"] },
                {
                  kind: "charSequence",
                  first: { predefined: "whitespace" }
                }
              ]
            },
            token: "list_marker"
          },
          // Ordered list markers (1. 2. etc.)
          {
            match: {
              kind: "sequence",
              elements: [
                {
                  kind: "charSequence",
                  first: { predefined: "digit" },
                  rest: { predefined: "digit" }
                },
                { kind: "string", value: "." },
                {
                  kind: "charSequence",
                  first: { predefined: "whitespace" }
                }
              ]
            },
            token: "list_marker"
          },
          // HTML inline tags
          {
            match: {
              kind: "pattern",
              regex: "</?[a-zA-Z][a-zA-Z0-9-]*[^>]*>"
            },
            token: "html_tag"
          },
          // Whitespace
          {
            match: {
              kind: "charSequence",
              first: { predefined: "whitespace" },
              rest: { predefined: "whitespace" }
            },
            token: "whitespace"
          },
          {
            match: { kind: "charSequence", first: { predefined: "newline" } },
            token: "newline"
          },
          // Text (any remaining content)
          {
            match: {
              kind: "charSequence",
              first: {
                negate: {
                  union: [
                    { predefined: "whitespace" },
                    { predefined: "newline" }
                  ]
                }
              },
              rest: {
                negate: {
                  union: [
                    { chars: "`*_[](!)#>-+" },
                    { predefined: "newline" }
                  ]
                }
              }
            },
            token: "text"
          }
        ]
      },
      code_block: {
        rules: [
          // Close fence
          {
            match: { kind: "string", value: ["```", "~~~"] },
            token: "code_fence_close",
            pop: true
          },
          // Code content (any line)
          {
            match: { kind: "charSequence", first: { predefined: "newline" } },
            token: "newline"
          },
          {
            match: {
              kind: "charSequence",
              first: { predefined: "any" },
              rest: { negate: { predefined: "newline" } }
            },
            token: "code_content"
          }
        ]
      }
    }
  },
  structure: {
    blocks: [],
    symbols: [
      {
        name: "heading",
        kind: "other",
        pattern: [{ token: "heading", capture: "name" }],
        hasBody: false
      },
      {
        name: "fenced_code_block",
        kind: "other",
        pattern: [{ token: "code_fence_open", capture: "name" }],
        hasBody: true,
        bodyStyle: "braces"
      }
    ]
  },
  embeddedLanguages: [
    {
      language: "javascript",
      start: { token: "code_fence_open", value: "```javascript" },
      end: { token: "code_fence_close" },
      languageDetection: "attribute",
      attributeToken: "code_language"
    }
  ]
};

// src/profiles/common.ts
function createGenericCodeProfile(options) {
  const {
    name,
    displayName,
    fileExtensions,
    mimeTypes,
    keywords = [],
    lineComment,
    blockComment,
    stringDelimiters = ['"', "'"]
  } = options;
  const rules = [];
  if (blockComment) {
    rules.push({
      match: {
        kind: "delimited",
        open: blockComment.open,
        close: blockComment.close,
        multiline: true,
        nested: blockComment.nested ?? false
      },
      token: "comment"
    });
  }
  if (lineComment) {
    rules.push({
      match: { kind: "line", start: lineComment },
      token: "comment"
    });
  }
  for (const delimiter of stringDelimiters) {
    rules.push({
      match: { kind: "delimited", open: delimiter, close: delimiter, escape: "\\" },
      token: "string"
    });
  }
  rules.push({
    match: {
      kind: "number",
      integer: true,
      float: true,
      scientific: true,
      hex: true,
      octal: true,
      binary: true,
      separator: "_"
    },
    token: "number"
  });
  if (keywords.length > 0) {
    rules.push({
      match: { kind: "keywords", words: keywords },
      token: "keyword"
    });
  }
  rules.push(
    {
      match: {
        kind: "charSequence",
        first: { ref: "identStart" },
        rest: { ref: "identPart" }
      },
      token: "identifier"
    },
    {
      match: {
        kind: "string",
        value: [
          "===",
          "!==",
          "==",
          "!=",
          "<=",
          ">=",
          "=>",
          "->",
          "::",
          "&&",
          "||",
          "??",
          "+",
          "-",
          "*",
          "/",
          "%",
          "=",
          "<",
          ">",
          "!",
          "&",
          "|",
          "^",
          "~",
          "?",
          ":",
          "."
        ]
      },
      token: "operator"
    },
    {
      match: {
        kind: "string",
        value: ["{", "}", "(", ")", "[", "]", ",", ";"]
      },
      token: "punctuation"
    },
    {
      match: {
        kind: "charSequence",
        first: { predefined: "whitespace" },
        rest: { predefined: "whitespace" }
      },
      token: "whitespace"
    },
    {
      match: { kind: "charSequence", first: { predefined: "newline" } },
      token: "newline"
    },
    {
      match: {
        kind: "charSequence",
        first: { predefined: "any" },
        rest: { negate: { predefined: "newline" } }
      },
      token: "text"
    }
  );
  return {
    name,
    displayName,
    version: "1.0.0",
    fileExtensions,
    mimeTypes,
    lexer: {
      charClasses: {
        identStart: {
          union: [{ predefined: "letter" }, { chars: "_$" }]
        },
        identPart: {
          union: [{ predefined: "alphanumeric" }, { chars: "_$" }]
        }
      },
      tokenTypes: {
        comment: { category: "comment" },
        string: { category: "string" },
        number: { category: "number" },
        keyword: { category: "keyword" },
        identifier: { category: "identifier" },
        operator: { category: "operator" },
        punctuation: { category: "punctuation" },
        text: { category: "plain" },
        whitespace: { category: "whitespace" },
        newline: { category: "newline" }
      },
      initialState: "default",
      skipTokens: ["whitespace", "newline"],
      states: {
        default: {
          rules
        }
      }
    },
    structure: {
      blocks: [{ name: "braces", open: "{", close: "}" }],
      symbols: []
    }
  };
}
function createMarkupProfile(options) {
  return {
    name: options.name,
    displayName: options.displayName,
    version: "1.0.0",
    fileExtensions: options.fileExtensions,
    mimeTypes: options.mimeTypes,
    lexer: {
      charClasses: {
        tagNameChar: {
          union: [{ predefined: "alphanumeric" }, { chars: "-_:" }]
        }
      },
      tokenTypes: {
        comment: { category: "comment" },
        cdata: { category: "string", subcategory: "cdata" },
        processing: { category: "meta", subcategory: "processing" },
        tag_open: { category: "tag" },
        tag_close: { category: "tag" },
        tag_name: { category: "tag", subcategory: "name" },
        string: { category: "string" },
        operator: { category: "operator" },
        text: { category: "plain" },
        whitespace: { category: "whitespace" },
        newline: { category: "newline" }
      },
      initialState: "content",
      skipTokens: ["whitespace", "newline"],
      states: {
        content: {
          rules: [
            {
              match: {
                kind: "delimited",
                open: "<!--",
                close: "-->",
                multiline: true
              },
              token: "comment"
            },
            {
              match: {
                kind: "delimited",
                open: "<![CDATA[",
                close: "]]>",
                multiline: true
              },
              token: "cdata"
            },
            {
              match: {
                kind: "delimited",
                open: "<?",
                close: "?>",
                multiline: true
              },
              token: "processing"
            },
            {
              match: { kind: "string", value: "</" },
              token: "tag_close",
              push: "tag"
            },
            {
              match: { kind: "string", value: "<" },
              token: "tag_open",
              push: "tag"
            },
            {
              match: {
                kind: "charSequence",
                first: { predefined: "whitespace" },
                rest: { predefined: "whitespace" }
              },
              token: "whitespace"
            },
            {
              match: { kind: "charSequence", first: { predefined: "newline" } },
              token: "newline"
            },
            {
              match: {
                kind: "charSequence",
                first: { negate: { chars: "<" } },
                rest: { negate: { chars: "<" } }
              },
              token: "text"
            }
          ]
        },
        tag: {
          rules: [
            {
              match: { kind: "string", value: ["/>", ">"] },
              token: "tag_open",
              pop: true
            },
            {
              match: {
                kind: "charSequence",
                first: { predefined: "letter" },
                rest: { ref: "tagNameChar" }
              },
              token: "tag_name"
            },
            {
              match: { kind: "string", value: "=" },
              token: "operator"
            },
            {
              match: { kind: "delimited", open: '"', close: '"', escape: "\\" },
              token: "string"
            },
            {
              match: { kind: "delimited", open: "'", close: "'", escape: "\\" },
              token: "string"
            },
            {
              match: {
                kind: "charSequence",
                first: { predefined: "whitespace" },
                rest: { predefined: "whitespace" }
              },
              token: "whitespace"
            },
            {
              match: { kind: "charSequence", first: { predefined: "newline" } },
              token: "newline"
            }
          ]
        }
      }
    },
    structure: {
      blocks: [],
      symbols: []
    }
  };
}
function createYamlProfile(name, displayName, fileExtensions, mimeTypes) {
  return {
    name,
    displayName,
    version: "1.0.0",
    fileExtensions,
    mimeTypes,
    lexer: {
      charClasses: {
        keyStart: {
          union: [{ predefined: "letter" }, { chars: "_-" }]
        },
        keyPart: {
          union: [{ predefined: "alphanumeric" }, { chars: "_-." }]
        }
      },
      tokenTypes: {
        comment: { category: "comment" },
        key: { category: "identifier", subcategory: "key" },
        string: { category: "string" },
        number: { category: "number" },
        constant: { category: "constant" },
        indicator: { category: "punctuation" },
        indent: { category: "whitespace" },
        dedent: { category: "whitespace" },
        whitespace: { category: "whitespace" },
        newline: { category: "newline" },
        text: { category: "plain" }
      },
      initialState: "default",
      skipTokens: ["whitespace", "newline", "indent", "dedent"],
      indentation: {
        indentToken: "indent",
        dedentToken: "dedent",
        unit: "spaces",
        size: 2
      },
      states: {
        default: {
          rules: [
            { match: { kind: "line", start: "#" }, token: "comment" },
            { match: { kind: "string", value: ["---", "...", "-", ":", "?", "|"] }, token: "indicator" },
            {
              match: { kind: "delimited", open: '"', close: '"', escape: "\\" },
              token: "string"
            },
            {
              match: { kind: "delimited", open: "'", close: "'", escape: "\\" },
              token: "string"
            },
            {
              match: {
                kind: "number",
                integer: true,
                float: true,
                scientific: true
              },
              token: "number"
            },
            {
              match: {
                kind: "keywords",
                words: ["true", "false", "null", "yes", "no", "on", "off"]
              },
              token: "constant"
            },
            {
              match: {
                kind: "charSequence",
                first: { ref: "keyStart" },
                rest: { ref: "keyPart" }
              },
              token: "key"
            },
            {
              match: {
                kind: "charSequence",
                first: { predefined: "whitespace" },
                rest: { predefined: "whitespace" }
              },
              token: "whitespace"
            },
            {
              match: { kind: "charSequence", first: { predefined: "newline" } },
              token: "newline"
            },
            {
              match: {
                kind: "charSequence",
                first: { predefined: "any" },
                rest: { negate: { predefined: "newline" } }
              },
              token: "text"
            }
          ]
        }
      }
    },
    structure: {
      blocks: [],
      symbols: []
    }
  };
}

// src/profiles/yaml.ts
var yaml = createYamlProfile(
  "yaml",
  "YAML",
  [".yaml", ".yml"],
  ["application/x-yaml", "text/yaml"]
);

// src/profiles/xml.ts
var xml = createMarkupProfile({
  name: "xml",
  displayName: "XML",
  fileExtensions: [".xml", ".xsd", ".xsl", ".xslt", ".svg"],
  mimeTypes: ["application/xml", "text/xml", "image/svg+xml"]
});

// src/profiles/java.ts
var java = createGenericCodeProfile({
  name: "java",
  displayName: "Java",
  fileExtensions: [".java"],
  mimeTypes: ["text/x-java-source", "text/java"],
  lineComment: "//",
  blockComment: { open: "/*", close: "*/" },
  keywords: [
    "abstract",
    "assert",
    "boolean",
    "break",
    "byte",
    "case",
    "catch",
    "char",
    "class",
    "const",
    "continue",
    "default",
    "do",
    "double",
    "else",
    "enum",
    "extends",
    "final",
    "finally",
    "float",
    "for",
    "if",
    "implements",
    "import",
    "instanceof",
    "int",
    "interface",
    "long",
    "native",
    "new",
    "package",
    "private",
    "protected",
    "public",
    "return",
    "short",
    "static",
    "strictfp",
    "super",
    "switch",
    "synchronized",
    "this",
    "throw",
    "throws",
    "transient",
    "try",
    "void",
    "volatile",
    "while"
  ]
});

// src/profiles/csharp.ts
var csharp = createGenericCodeProfile({
  name: "csharp",
  displayName: "C#",
  fileExtensions: [".cs", ".csx"],
  mimeTypes: ["text/x-csharp"],
  lineComment: "//",
  blockComment: { open: "/*", close: "*/" },
  stringDelimiters: ['"', "'", "`"],
  keywords: [
    "abstract",
    "as",
    "base",
    "bool",
    "break",
    "byte",
    "case",
    "catch",
    "char",
    "checked",
    "class",
    "const",
    "continue",
    "decimal",
    "default",
    "delegate",
    "do",
    "double",
    "else",
    "enum",
    "event",
    "explicit",
    "extern",
    "false",
    "finally",
    "fixed",
    "float",
    "for",
    "foreach",
    "goto",
    "if",
    "implicit",
    "in",
    "int",
    "interface",
    "internal",
    "is",
    "lock",
    "long",
    "namespace",
    "new",
    "null",
    "object",
    "operator",
    "out",
    "override",
    "params",
    "private",
    "protected",
    "public",
    "readonly",
    "ref",
    "return",
    "sbyte",
    "sealed",
    "short",
    "sizeof",
    "stackalloc",
    "static",
    "string",
    "struct",
    "switch",
    "this",
    "throw",
    "true",
    "try",
    "typeof",
    "uint",
    "ulong",
    "unchecked",
    "unsafe",
    "ushort",
    "using",
    "virtual",
    "void",
    "volatile",
    "while"
  ]
});

// src/profiles/rust.ts
var rust = createGenericCodeProfile({
  name: "rust",
  displayName: "Rust",
  fileExtensions: [".rs"],
  mimeTypes: ["text/rust"],
  lineComment: "//",
  blockComment: { open: "/*", close: "*/", nested: true },
  keywords: [
    "as",
    "break",
    "const",
    "continue",
    "crate",
    "else",
    "enum",
    "extern",
    "false",
    "fn",
    "for",
    "if",
    "impl",
    "in",
    "let",
    "loop",
    "match",
    "mod",
    "move",
    "mut",
    "pub",
    "ref",
    "return",
    "self",
    "Self",
    "static",
    "struct",
    "super",
    "trait",
    "true",
    "type",
    "unsafe",
    "use",
    "where",
    "while",
    "async",
    "await",
    "dyn"
  ]
});

// src/profiles/ruby.ts
var ruby = createGenericCodeProfile({
  name: "ruby",
  displayName: "Ruby",
  fileExtensions: [".rb", ".rake", ".gemspec"],
  mimeTypes: ["application/x-ruby"],
  lineComment: "#",
  keywords: [
    "BEGIN",
    "END",
    "alias",
    "and",
    "begin",
    "break",
    "case",
    "class",
    "def",
    "defined?",
    "do",
    "else",
    "elsif",
    "end",
    "ensure",
    "false",
    "for",
    "if",
    "in",
    "module",
    "next",
    "nil",
    "not",
    "or",
    "redo",
    "rescue",
    "retry",
    "return",
    "self",
    "super",
    "then",
    "true",
    "undef",
    "unless",
    "until",
    "when",
    "while",
    "yield"
  ]
});

// src/profiles/php.ts
var php = createGenericCodeProfile({
  name: "php",
  displayName: "PHP",
  fileExtensions: [".php", ".phtml", ".php8"],
  mimeTypes: ["application/x-httpd-php"],
  lineComment: "//",
  blockComment: { open: "/*", close: "*/" },
  keywords: [
    "abstract",
    "and",
    "array",
    "as",
    "break",
    "callable",
    "case",
    "catch",
    "class",
    "clone",
    "const",
    "continue",
    "declare",
    "default",
    "do",
    "echo",
    "else",
    "elseif",
    "empty",
    "enddeclare",
    "endfor",
    "endforeach",
    "endif",
    "endswitch",
    "endwhile",
    "eval",
    "exit",
    "extends",
    "final",
    "finally",
    "fn",
    "for",
    "foreach",
    "function",
    "global",
    "goto",
    "if",
    "implements",
    "include",
    "include_once",
    "instanceof",
    "insteadof",
    "interface",
    "isset",
    "list",
    "match",
    "namespace",
    "new",
    "or",
    "print",
    "private",
    "protected",
    "public",
    "readonly",
    "require",
    "require_once",
    "return",
    "static",
    "switch",
    "throw",
    "trait",
    "try",
    "unset",
    "use",
    "var",
    "while",
    "xor",
    "yield"
  ]
});

// src/profiles/kotlin.ts
var kotlin = createGenericCodeProfile({
  name: "kotlin",
  displayName: "Kotlin",
  fileExtensions: [".kt", ".kts"],
  mimeTypes: ["text/x-kotlin"],
  lineComment: "//",
  blockComment: { open: "/*", close: "*/" },
  keywords: [
    "as",
    "as?",
    "break",
    "class",
    "continue",
    "do",
    "else",
    "false",
    "for",
    "fun",
    "if",
    "in",
    "interface",
    "is",
    "null",
    "object",
    "package",
    "return",
    "super",
    "this",
    "throw",
    "true",
    "try",
    "typealias",
    "val",
    "var",
    "when",
    "while",
    "by",
    "catch",
    "constructor",
    "delegate",
    "dynamic",
    "field",
    "file",
    "finally",
    "get",
    "import",
    "init",
    "param",
    "property",
    "receiver",
    "set",
    "setparam",
    "where"
  ]
});

// src/profiles/swift.ts
var swift = createGenericCodeProfile({
  name: "swift",
  displayName: "Swift",
  fileExtensions: [".swift"],
  mimeTypes: ["text/x-swift"],
  lineComment: "//",
  blockComment: { open: "/*", close: "*/", nested: true },
  keywords: [
    "associatedtype",
    "class",
    "deinit",
    "enum",
    "extension",
    "func",
    "import",
    "init",
    "inout",
    "internal",
    "let",
    "operator",
    "private",
    "protocol",
    "public",
    "static",
    "struct",
    "subscript",
    "typealias",
    "var",
    "break",
    "case",
    "continue",
    "default",
    "defer",
    "do",
    "else",
    "fallthrough",
    "for",
    "guard",
    "if",
    "in",
    "repeat",
    "return",
    "switch",
    "where",
    "while",
    "as",
    "Any",
    "catch",
    "false",
    "is",
    "nil",
    "rethrows",
    "super",
    "self",
    "Self",
    "throw",
    "throws",
    "true",
    "try"
  ]
});

// src/profiles/shell.ts
var shell = createGenericCodeProfile({
  name: "shell",
  displayName: "Shell",
  fileExtensions: [".sh", ".bash", ".zsh", ".ksh"],
  mimeTypes: ["application/x-sh"],
  lineComment: "#",
  keywords: [
    "if",
    "then",
    "else",
    "elif",
    "fi",
    "for",
    "while",
    "until",
    "do",
    "done",
    "case",
    "esac",
    "in",
    "function",
    "select",
    "time",
    "coproc",
    "return",
    "break",
    "continue",
    "readonly",
    "local",
    "export"
  ]
});

// src/profiles/sql.ts
var sql = createGenericCodeProfile({
  name: "sql",
  displayName: "SQL",
  fileExtensions: [".sql"],
  mimeTypes: ["application/sql", "text/x-sql"],
  lineComment: "--",
  blockComment: { open: "/*", close: "*/" },
  keywords: [
    "select",
    "from",
    "where",
    "insert",
    "into",
    "update",
    "delete",
    "create",
    "alter",
    "drop",
    "table",
    "view",
    "index",
    "join",
    "left",
    "right",
    "inner",
    "outer",
    "on",
    "group",
    "by",
    "order",
    "having",
    "limit",
    "offset",
    "union",
    "all",
    "distinct",
    "as",
    "and",
    "or",
    "not",
    "null",
    "is",
    "in",
    "exists",
    "between",
    "like",
    "case",
    "when",
    "then",
    "else",
    "end",
    "primary",
    "key",
    "foreign",
    "references",
    "constraint",
    "values",
    "set",
    "begin",
    "commit",
    "rollback"
  ]
});

// src/profiles/toml.ts
var toml = createYamlProfile(
  "toml",
  "TOML",
  [".toml"],
  ["application/toml", "text/toml"]
);

// src/profiles/resolver.ts
function resolveProfile(profile, registry) {
  if (!profile.extends) return profile;
  const parent = registry.get(profile.extends);
  if (!parent) {
    throw new Error(
      `Profile "${profile.name}" extends "${profile.extends}" but parent not found in registry`
    );
  }
  const resolvedParent = resolveProfile(parent, registry);
  return mergeProfiles(resolvedParent, profile);
}
function mergeProfiles(parent, child) {
  return {
    name: child.name,
    displayName: child.displayName,
    version: child.version,
    fileExtensions: child.fileExtensions,
    mimeTypes: child.mimeTypes ?? parent.mimeTypes,
    // Merge lexer
    lexer: mergeLexerConfig(parent.lexer, child.lexer),
    // Merge structure (child wins entirely if present, otherwise inherit parent)
    structure: child.structure ?? parent.structure ? mergeStructureConfig(parent.structure, child.structure) : void 0,
    // Grammar: child wins entirely (no merge)
    grammar: child.grammar ?? parent.grammar,
    // Embedded languages: child wins entirely
    embeddedLanguages: child.embeddedLanguages ?? parent.embeddedLanguages
  };
}
function mergeLexerConfig(parent, child) {
  const charClasses = {
    ...parent.charClasses ?? {},
    ...child.charClasses ?? {}
  };
  const tokenTypes = {
    ...parent.tokenTypes,
    ...child.tokenTypes
  };
  const states = {};
  for (const [name, state] of Object.entries(parent.states)) {
    states[name] = state;
  }
  for (const [name, state] of Object.entries(child.states)) {
    states[name] = state;
  }
  return {
    charClasses,
    tokenTypes,
    states,
    initialState: child.initialState ?? parent.initialState,
    skipTokens: child.skipTokens ?? parent.skipTokens,
    indentation: child.indentation ?? parent.indentation
  };
}
function mergeStructureConfig(parent, child) {
  if (!parent && !child) return void 0;
  if (!parent) return child;
  if (!child) return parent;
  return {
    // Child blocks override parent entirely
    blocks: child.blocks.length > 0 ? child.blocks : parent.blocks,
    // Child symbols added to parent symbols (child first for priority)
    symbols: [...child.symbols, ...parent.symbols],
    // Child folding overrides
    folding: child.folding ?? parent.folding
  };
}

// src/profiles/index.ts
var builtinProfiles = [
  json,
  css,
  scss,
  python,
  go,
  javascript,
  typescript,
  cpp,
  html,
  markdown,
  yaml,
  xml,
  java,
  csharp,
  rust,
  ruby,
  php,
  kotlin,
  swift,
  shell,
  sql,
  toml
];
var profilesByName = /* @__PURE__ */ new Map();
var profilesByExtension = /* @__PURE__ */ new Map();
function registerProfile(profile) {
  profilesByName.set(profile.name, profile);
  for (const ext of profile.fileExtensions) {
    profilesByExtension.set(ext.toLowerCase(), profile);
  }
}
function getProfile(nameOrExt) {
  return profilesByName.get(nameOrExt) ?? profilesByExtension.get(nameOrExt.toLowerCase());
}
function getRegisteredLanguages() {
  return Array.from(profilesByName.keys());
}
function getSupportedExtensions() {
  return Array.from(profilesByExtension.keys());
}
for (const profile of builtinProfiles) {
  registerProfile(profile);
}

// src/index.ts
function tokenize(source, language) {
  const profile = resolveLanguage(language);
  return tokenizeWithConfig(source, profile.lexer);
}
function extractSymbols(source, language) {
  const profile = resolveLanguage(language);
  return extractSymbolsFromProfile(source, profile);
}
function tokenizeWithProfile(source, profile) {
  return tokenizeWithConfig(source, profile.lexer);
}
function extractSymbolsWithProfile(source, profile) {
  return extractSymbolsFromProfile(source, profile);
}
function resolveLanguage(language) {
  const profile = getProfile(language);
  if (!profile) {
    throw new Error(
      `Unknown language: "${language}". Use getRegisteredLanguages() to see available languages.`
    );
  }
  return profile;
}
export {
  CharReader,
  CompiledLexer,
  builtinProfiles,
  compileCharClass,
  compileMatcher,
  cpp,
  csharp,
  css,
  extractSymbols,
  extractSymbolsFromTokens,
  extractSymbolsWithProfile,
  findBlockSpans,
  getCompiledLexer,
  getProfile,
  getRegisteredLanguages,
  getSupportedExtensions,
  go,
  html,
  java,
  javascript,
  json,
  kotlin,
  markdown,
  php,
  python,
  registerProfile,
  resolveProfile,
  ruby,
  rust,
  scss,
  shell,
  sql,
  swift,
  tokenize,
  tokenizeWithProfile,
  toml,
  typescript,
  xml,
  yaml
};
//# sourceMappingURL=index.js.map