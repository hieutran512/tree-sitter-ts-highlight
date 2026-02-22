import { renderTokensToHtml } from "../src/html/renderer.js";
import type { Token } from "tree-sitter-ts";

function makeToken(
  value: string,
  category: string,
  offset: number = 0,
): Token {
  return {
    type: category,
    value,
    category: category as Token["category"],
    range: {
      start: { line: 1, column: offset, offset },
      end: { line: 1, column: offset + value.length, offset: offset + value.length },
    },
  };
}

describe("renderTokensToHtml", () => {
  it("renders a keyword token with hlts- prefix", () => {
    const tokens = [makeToken("if", "keyword")];
    const html = renderTokensToHtml(tokens);
    expect(html).toBe('<span class="hlts-keyword">if</span>');
  });

  it("renders multiple tokens", () => {
    const tokens = [
      makeToken("const", "keyword", 0),
      makeToken(" ", "whitespace", 5),
      makeToken("x", "identifier", 6),
      makeToken(" ", "whitespace", 7),
      makeToken("=", "operator", 8),
      makeToken(" ", "whitespace", 9),
      makeToken("1", "number", 10),
    ];
    const html = renderTokensToHtml(tokens);
    expect(html).toBe(
      '<span class="hlts-keyword">const</span>' +
        " " +
        '<span class="hlts-identifier">x</span>' +
        " " +
        '<span class="hlts-operator">=</span>' +
        " " +
        '<span class="hlts-number">1</span>',
    );
  });

  it("emits whitespace tokens as plain text (no span)", () => {
    const tokens = [makeToken("  ", "whitespace")];
    const html = renderTokensToHtml(tokens);
    expect(html).toBe("  ");
  });

  it("emits newline tokens as plain text", () => {
    const tokens = [makeToken("\n", "newline")];
    const html = renderTokensToHtml(tokens);
    expect(html).toBe("\n");
  });

  it("escapes HTML entities in token values", () => {
    const tokens = [makeToken("<div>", "tag")];
    const html = renderTokensToHtml(tokens);
    expect(html).toBe('<span class="hlts-tag">&lt;div&gt;</span>');
  });

  it("uses custom class prefix", () => {
    const tokens = [makeToken("class", "keyword")];
    const html = renderTokensToHtml(tokens, { classPrefix: "my-" });
    expect(html).toBe('<span class="my-keyword">class</span>');
  });

  it("uses inline styles when theme is provided", () => {
    const tokens = [makeToken("if", "keyword")];
    const html = renderTokensToHtml(tokens, {
      theme: {
        name: "test",
        styles: { keyword: "color:#ff0000;font-weight:bold" },
      },
    });
    expect(html).toBe(
      '<span style="color:#ff0000;font-weight:bold">if</span>',
    );
  });

  it("renders empty token array as empty string", () => {
    expect(renderTokensToHtml([])).toBe("");
  });

  it("handles tokens with all categories", () => {
    const categories = [
      "keyword", "identifier", "string", "number", "comment",
      "operator", "punctuation", "type", "decorator", "tag",
      "attribute", "meta", "regexp", "escape", "variable",
      "constant", "error", "plain",
    ];
    for (const cat of categories) {
      const tokens = [makeToken("x", cat)];
      const html = renderTokensToHtml(tokens);
      expect(html).toBe(`<span class="hlts-${cat}">x</span>`);
    }
  });
});
