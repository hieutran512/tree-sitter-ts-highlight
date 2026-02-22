import {
  highlight,
  highlightBlock,
  highlightAnsi,
  highlightTokens,
  highlightTokensAnsi,
  defaultLightTheme,
  defaultDarkTheme,
  defaultAnsiTheme,
} from "../src/index.js";
import { tokenize } from "tree-sitter-ts";

describe("highlight()", () => {
  it("highlights TypeScript code", () => {
    const html = highlight("const x = 1;", "typescript");
    expect(html).toContain('<span class="hlts-keyword">const</span>');
    expect(html).toContain('<span class="hlts-identifier">x</span>');
    expect(html).toContain('<span class="hlts-number">1</span>');
  });

  it("highlights JavaScript code", () => {
    const html = highlight("function foo() {}", "javascript");
    expect(html).toContain('<span class="hlts-keyword">function</span>');
    expect(html).toContain('<span class="hlts-identifier">foo</span>');
  });

  it("highlights Python code", () => {
    const html = highlight("def hello():\n  pass", "python");
    expect(html).toContain('<span class="hlts-keyword">def</span>');
    expect(html).toContain('<span class="hlts-identifier">hello</span>');
    expect(html).toContain('<span class="hlts-keyword">pass</span>');
  });

  it("highlights by file extension", () => {
    const html = highlight("let x = 1;", ".ts");
    expect(html).toContain('<span class="hlts-keyword">let</span>');
  });

  it("returns just inner spans by default (no pre wrapper)", () => {
    const html = highlight("x", "typescript");
    expect(html).not.toContain("<pre");
    expect(html).not.toContain("<code");
  });

  it("wraps in pre when wrapInPre is true", () => {
    const html = highlight("x", "typescript", { wrapInPre: true });
    expect(html).toContain('<pre class="hlts">');
    expect(html).toContain("<code>");
    expect(html).toContain("</code></pre>");
  });

  it("throws for unknown language", () => {
    expect(() => highlight("x", "unknown-lang-xyz")).toThrow();
  });

  it("highlights with custom class prefix", () => {
    const html = highlight("const x = 1;", "typescript", {
      classPrefix: "code-",
    });
    expect(html).toContain('<span class="code-keyword">const</span>');
    expect(html).not.toContain("hlts-");
  });

  it("highlights with inline theme", () => {
    const html = highlight("const x = 1;", "typescript", {
      theme: defaultLightTheme,
    });
    expect(html).toContain("style=");
    expect(html).not.toContain("class=");
  });

  it("highlights with line numbers", () => {
    const html = highlight("a\nb\nc", "typescript", { lineNumbers: true });
    expect(html).toContain('<table class="hlts-table">');
    expect(html).toContain('<td class="hlts-line-number">1</td>');
    expect(html).toContain('<td class="hlts-line-number">2</td>');
    expect(html).toContain('<td class="hlts-line-number">3</td>');
  });

  it("highlights with line numbers and custom start", () => {
    const html = highlight("x", "typescript", {
      lineNumbers: true,
      startLine: 5,
    });
    expect(html).toContain('<td class="hlts-line-number">5</td>');
  });

  it("highlights with decorations", () => {
    const source = "const x = 1;";
    const html = highlight(source, "typescript", {
      decorations: [
        {
          range: {
            start: { line: 1, column: 6, offset: 6 },
            end: { line: 1, column: 7, offset: 7 },
          },
          className: "error-marker",
        },
      ],
    });
    expect(html).toContain("error-marker");
  });
});

describe("highlightBlock()", () => {
  it("wraps output in pre/code with hlts class", () => {
    const html = highlightBlock("x", "typescript");
    expect(html).toContain('<pre class="hlts hlts-lang-typescript"');
    expect(html).toContain("<code>");
    expect(html).toContain("</code></pre>");
  });

  it("includes inline theme styles on pre element", () => {
    const html = highlightBlock("x", "typescript", {
      theme: defaultDarkTheme,
    });
    expect(html).toContain("background:#282c34");
    expect(html).toContain("color:#abb2bf");
  });
});

describe("highlightAnsi()", () => {
  it("produces ANSI-colored output", () => {
    const result = highlightAnsi("const x = 1;", "typescript");
    // Should contain ANSI escape codes
    expect(result).toContain("\x1b[");
    expect(result).toContain("\x1b[0m");
  });

  it("supports line numbers", () => {
    const result = highlightAnsi("a\nb", "typescript", {
      lineNumbers: true,
    });
    expect(result).toContain("1");
    expect(result).toContain("2");
    expect(result).toContain("│");
  });
});

describe("highlightTokens()", () => {
  it("renders pre-tokenized tokens to HTML", () => {
    const tokens = tokenize("const x = 1;", "typescript");
    const html = highlightTokens(tokens);
    expect(html).toContain('<span class="hlts-keyword">const</span>');
  });
});

describe("highlightTokensAnsi()", () => {
  it("renders pre-tokenized tokens to ANSI", () => {
    const tokens = tokenize("const x = 1;", "typescript");
    const result = highlightTokensAnsi(tokens);
    expect(result).toContain("\x1b[");
  });
});

describe("theme exports", () => {
  it("exports default light theme", () => {
    expect(defaultLightTheme.name).toBe("default-light");
    expect(defaultLightTheme.styles.keyword).toBeDefined();
  });

  it("exports default dark theme", () => {
    expect(defaultDarkTheme.name).toBe("default-dark");
    expect(defaultDarkTheme.styles.keyword).toBeDefined();
  });

  it("exports default ANSI theme", () => {
    expect(defaultAnsiTheme.name).toBe("ansi-default");
    expect(defaultAnsiTheme.colors.keyword).toBeDefined();
  });
});

describe("multi-language coverage", () => {
  const languageSamples: Record<string, string> = {
    typescript: "export class Foo { bar(): string { return 'hello'; } }",
    javascript: "function foo() { return 42; }",
    python: "def hello():\n  print('world')",
    go: "func main() {\n  fmt.Println(\"hello\")\n}",
    rust: "fn main() {\n  println!(\"hello\");\n}",
    java: "public class Main {\n  public static void main(String[] args) {}\n}",
    csharp: "namespace App {\n  class Main { }\n}",
    cpp: "#include <iostream>\nint main() { return 0; }",
    ruby: "def hello\n  puts 'world'\nend",
    php: "<?php\nfunction hello() { echo 'world'; }",
    kotlin: "fun main() {\n  println(\"hello\")\n}",
    swift: "func hello() -> String {\n  return \"world\"\n}",
    css: "body { color: red; font-size: 14px; }",
    html: "<div class=\"hello\">world</div>",
    json: '{"key": "value", "num": 42}',
    yaml: "key: value\nlist:\n  - item1",
    sql: "SELECT * FROM users WHERE id = 1;",
    shell: "#!/bin/bash\necho 'hello'",
    markdown: "# Hello\n\n**bold** text",
    xml: "<root><child attr=\"val\"/></root>",
    toml: '[section]\nkey = "value"',
  };

  for (const [lang, source] of Object.entries(languageSamples)) {
    it(`highlights ${lang} without errors`, () => {
      const html = highlight(source, lang);
      expect(html.length).toBeGreaterThan(0);
      // Should contain at least one span
      expect(html).toContain("<span");
      // Should not contain error category (well-formed inputs)
      expect(html).not.toContain("hlts-error");
    });

    it(`highlights ${lang} as ANSI without errors`, () => {
      const ansi = highlightAnsi(source, lang);
      expect(ansi.length).toBeGreaterThan(0);
    });
  }
});
