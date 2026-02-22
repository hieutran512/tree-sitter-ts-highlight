import { renderTokensToAnsi } from "../src/ansi/renderer.js";
import { RESET } from "../src/ansi/codes.js";
import type { Token } from "tree-sitter-ts";

function makeToken(
  value: string,
  category: string,
  line: number = 1,
  column: number = 0,
  offset: number = 0,
): Token {
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

describe("renderTokensToAnsi", () => {
  it("renders keyword with ANSI color codes", () => {
    const tokens = [makeToken("if", "keyword")];
    const result = renderTokensToAnsi(tokens);
    // Default theme: keyword = "35;1" (magenta bold)
    expect(result).toBe(`\x1b[35;1mif${RESET}`);
  });

  it("renders whitespace as plain text", () => {
    const tokens = [makeToken("  ", "whitespace")];
    const result = renderTokensToAnsi(tokens);
    expect(result).toBe("  ");
  });

  it("renders newline as plain text", () => {
    const tokens = [makeToken("\n", "newline")];
    const result = renderTokensToAnsi(tokens);
    expect(result).toBe("\n");
  });

  it("renders string with green color", () => {
    const tokens = [makeToken('"hello"', "string")];
    const result = renderTokensToAnsi(tokens);
    // Default theme: string = "32" (green)
    expect(result).toBe(`\x1b[32m"hello"${RESET}`);
  });

  it("renders comment with gray italic", () => {
    const tokens = [makeToken("// comment", "comment")];
    const result = renderTokensToAnsi(tokens);
    // Default theme: comment = "90;3" (bright black italic)
    expect(result).toBe(`\x1b[90;3m// comment${RESET}`);
  });

  it("renders multiple tokens", () => {
    const tokens = [
      makeToken("const", "keyword", 1, 0, 0),
      makeToken(" ", "whitespace", 1, 5, 5),
      makeToken("x", "identifier", 1, 6, 6),
    ];
    const result = renderTokensToAnsi(tokens);
    expect(result).toContain(`\x1b[35;1mconst${RESET}`);
    expect(result).toContain(" ");
    // Default theme: identifier = "0" → plain (no color)
    expect(result).toContain("x");
  });

  it("uses custom ANSI theme", () => {
    const tokens = [makeToken("if", "keyword")];
    const result = renderTokensToAnsi(tokens, {
      theme: {
        name: "custom",
        colors: { keyword: "31" }, // red
      },
    });
    expect(result).toBe(`\x1b[31mif${RESET}`);
  });

  it("renders with line numbers", () => {
    const tokens = [
      makeToken("a", "identifier", 1, 0, 0),
      makeToken("\n", "newline", 1, 1, 1),
      makeToken("b", "identifier", 2, 0, 2),
    ];
    const result = renderTokensToAnsi(tokens, { lineNumbers: true });
    expect(result).toContain("1");
    expect(result).toContain("2");
    expect(result).toContain("│");
  });

  it("uses custom start line for line numbers", () => {
    const tokens = [makeToken("a", "identifier", 1, 0, 0)];
    const result = renderTokensToAnsi(tokens, {
      lineNumbers: true,
      startLine: 42,
    });
    expect(result).toContain("42");
  });

  it("handles empty token array", () => {
    const result = renderTokensToAnsi([]);
    expect(result).toBe("");
  });
});
