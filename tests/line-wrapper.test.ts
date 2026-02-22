import { groupTokensByLine, wrapInLines } from "../src/html/line-wrapper.js";
import { renderTokensToHtml } from "../src/html/renderer.js";
import type { Token } from "tree-sitter-ts";

function makeToken(
  value: string,
  category: string,
  line: number,
  column: number,
  offset: number,
): Token {
  // Calculate end position accounting for newlines
  let endLine = line;
  let endColumn = column;
  for (const ch of value) {
    if (ch === "\n") {
      endLine++;
      endColumn = 0;
    } else {
      endColumn++;
    }
  }
  return {
    type: category,
    value,
    category: category as Token["category"],
    range: {
      start: { line, column, offset },
      end: { line: endLine, column: endColumn, offset: offset + value.length },
    },
  };
}

describe("groupTokensByLine", () => {
  it("groups single-line tokens", () => {
    const tokens = [
      makeToken("const", "keyword", 1, 0, 0),
      makeToken(" ", "whitespace", 1, 5, 5),
      makeToken("x", "identifier", 1, 6, 6),
    ];
    const groups = groupTokensByLine(tokens);
    expect(groups).toHaveLength(1);
    expect(groups[0].lineNumber).toBe(1);
    expect(groups[0].tokens).toHaveLength(3);
  });

  it("groups tokens across multiple lines", () => {
    const tokens = [
      makeToken("a", "identifier", 1, 0, 0),
      makeToken("\n", "newline", 1, 1, 1),
      makeToken("b", "identifier", 2, 0, 2),
      makeToken("\n", "newline", 2, 1, 3),
      makeToken("c", "identifier", 3, 0, 4),
    ];
    const groups = groupTokensByLine(tokens);
    expect(groups).toHaveLength(3);
    expect(groups[0].lineNumber).toBe(1);
    expect(groups[1].lineNumber).toBe(2);
    expect(groups[2].lineNumber).toBe(3);
  });

  it("splits multiline tokens at newlines", () => {
    const tokens = [
      makeToken("/* line1\nline2\nline3 */", "comment", 1, 0, 0),
    ];
    const groups = groupTokensByLine(tokens);
    expect(groups).toHaveLength(3);
    expect(groups[0].lineNumber).toBe(1);
    expect(groups[0].tokens[0].value).toBe("/* line1\n");
    expect(groups[1].lineNumber).toBe(2);
    expect(groups[1].tokens[0].value).toBe("line2\n");
    expect(groups[2].lineNumber).toBe(3);
    expect(groups[2].tokens[0].value).toBe("line3 */");
  });

  it("handles empty token array", () => {
    const groups = groupTokensByLine([]);
    expect(groups).toHaveLength(0);
  });

  it("fills in empty lines between tokens", () => {
    const tokens = [
      makeToken("a", "identifier", 1, 0, 0),
      makeToken("b", "identifier", 3, 0, 4),
    ];
    const groups = groupTokensByLine(tokens);
    expect(groups).toHaveLength(3);
    expect(groups[0].lineNumber).toBe(1);
    expect(groups[1].lineNumber).toBe(2);
    expect(groups[1].tokens).toHaveLength(0);
    expect(groups[2].lineNumber).toBe(3);
  });
});

describe("wrapInLines", () => {
  it("wraps tokens in a table structure", () => {
    const tokens = [
      makeToken("hello", "identifier", 1, 0, 0),
    ];
    const renderLine = (lineTokens: Token[]) =>
      renderTokensToHtml(lineTokens);

    const html = wrapInLines(tokens, renderLine);
    expect(html).toContain('<table class="hlts-table">');
    expect(html).toContain('<td class="hlts-line-number">1</td>');
    expect(html).toContain('<td class="hlts-line-content">');
    expect(html).toContain("</table>");
  });

  it("uses custom start line number", () => {
    const tokens = [
      makeToken("hello", "identifier", 1, 0, 0),
    ];
    const renderLine = (lineTokens: Token[]) =>
      renderTokensToHtml(lineTokens);

    const html = wrapInLines(tokens, renderLine, { startLine: 10 });
    expect(html).toContain('<td class="hlts-line-number">10</td>');
  });

  it("includes data-line attributes by default", () => {
    const tokens = [
      makeToken("hello", "identifier", 1, 0, 0),
    ];
    const renderLine = (lineTokens: Token[]) =>
      renderTokensToHtml(lineTokens);

    const html = wrapInLines(tokens, renderLine);
    expect(html).toContain('data-line="1"');
  });

  it("omits data-line attributes when disabled", () => {
    const tokens = [
      makeToken("hello", "identifier", 1, 0, 0),
    ];
    const renderLine = (lineTokens: Token[]) =>
      renderTokensToHtml(lineTokens);

    const html = wrapInLines(tokens, renderLine, {
      dataLineAttributes: false,
    });
    expect(html).not.toContain("data-line");
  });

  it("renders multiple lines", () => {
    const tokens = [
      makeToken("a", "identifier", 1, 0, 0),
      makeToken("\n", "newline", 1, 1, 1),
      makeToken("b", "identifier", 2, 0, 2),
    ];
    const renderLine = (lineTokens: Token[]) =>
      renderTokensToHtml(lineTokens);

    const html = wrapInLines(tokens, renderLine);
    expect(html).toContain('<td class="hlts-line-number">1</td>');
    expect(html).toContain('<td class="hlts-line-number">2</td>');
  });

  it("returns empty table for empty token array", () => {
    const html = wrapInLines([], () => "");
    expect(html).toBe('<table class="hlts-table"><tbody></tbody></table>');
  });
});
