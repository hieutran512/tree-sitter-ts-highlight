import { splitTokensAtRanges } from "../src/decorations/splitter.js";
import { applyDecorations } from "../src/decorations/decorator.js";
import type { Token, Range } from "tree-sitter-ts";
import type { Decoration } from "../src/types.js";

function makeToken(
  value: string,
  category: string,
  offset: number,
): Token {
  return {
    type: category,
    value,
    category: category as Token["category"],
    range: {
      start: { line: 1, column: offset, offset },
      end: {
        line: 1,
        column: offset + value.length,
        offset: offset + value.length,
      },
    },
  };
}

function makeRange(startOffset: number, endOffset: number): Range {
  return {
    start: { line: 1, column: startOffset, offset: startOffset },
    end: { line: 1, column: endOffset, offset: endOffset },
  };
}

describe("splitTokensAtRanges", () => {
  it("returns tokens unchanged when no ranges provided", () => {
    const tokens = [makeToken("hello", "identifier", 0)];
    const result = splitTokensAtRanges(tokens, []);
    expect(result).toEqual(tokens);
  });

  it("returns token unchanged when range boundary is at token boundary", () => {
    const tokens = [
      makeToken("hello", "identifier", 0),
      makeToken(" ", "whitespace", 5),
      makeToken("world", "identifier", 6),
    ];
    // Range exactly covers "hello"
    const result = splitTokensAtRanges(tokens, [makeRange(0, 5)]);
    expect(result).toHaveLength(3);
    expect(result[0].value).toBe("hello");
    expect(result[1].value).toBe(" ");
    expect(result[2].value).toBe("world");
  });

  it("splits token when range boundary falls inside", () => {
    const tokens = [makeToken("helloworld", "identifier", 0)];
    const result = splitTokensAtRanges(tokens, [makeRange(0, 5)]);
    expect(result).toHaveLength(2);
    expect(result[0].value).toBe("hello");
    expect(result[0].category).toBe("identifier");
    expect(result[0].range.start.offset).toBe(0);
    expect(result[0].range.end.offset).toBe(5);
    expect(result[1].value).toBe("world");
    expect(result[1].category).toBe("identifier");
    expect(result[1].range.start.offset).toBe(5);
    expect(result[1].range.end.offset).toBe(10);
  });

  it("splits token at multiple boundaries", () => {
    const tokens = [makeToken("abcdef", "identifier", 0)];
    const result = splitTokensAtRanges(tokens, [makeRange(2, 4)]);
    expect(result).toHaveLength(3);
    expect(result[0].value).toBe("ab");
    expect(result[1].value).toBe("cd");
    expect(result[2].value).toBe("ef");
  });

  it("preserves token type and category on split", () => {
    const tokens = [makeToken("hello", "keyword", 0)];
    const result = splitTokensAtRanges(tokens, [makeRange(0, 3)]);
    expect(result[0].type).toBe("keyword");
    expect(result[0].category).toBe("keyword");
    expect(result[1].type).toBe("keyword");
    expect(result[1].category).toBe("keyword");
  });
});

describe("applyDecorations", () => {
  it("returns unmodified tokens when no decorations", () => {
    const tokens = [makeToken("if", "keyword", 0)];
    const result = applyDecorations(tokens, []);
    expect(result).toHaveLength(1);
    expect(result[0].token.value).toBe("if");
    expect(result[0].extraClasses).toEqual([]);
    expect(result[0].extraAttrs).toEqual({});
  });

  it("adds className to token covered by decoration", () => {
    const tokens = [makeToken("if", "keyword", 0)];
    const decorations: Decoration[] = [
      {
        range: makeRange(0, 2),
        className: "error-marker",
      },
    ];
    const result = applyDecorations(tokens, decorations);
    expect(result).toHaveLength(1);
    expect(result[0].extraClasses).toEqual(["error-marker"]);
  });

  it("adds data attributes from decoration", () => {
    const tokens = [makeToken("x", "identifier", 0)];
    const decorations: Decoration[] = [
      {
        range: makeRange(0, 1),
        data: { tooltip: "variable x" },
      },
    ];
    const result = applyDecorations(tokens, decorations);
    expect(result[0].extraAttrs).toEqual({ tooltip: "variable x" });
  });

  it("splits token and applies decoration to partial overlap", () => {
    const tokens = [makeToken("helloworld", "identifier", 0)];
    const decorations: Decoration[] = [
      {
        range: makeRange(0, 5),
        className: "highlight",
      },
    ];
    const result = applyDecorations(tokens, decorations);
    expect(result).toHaveLength(2);
    expect(result[0].token.value).toBe("hello");
    expect(result[0].extraClasses).toEqual(["highlight"]);
    expect(result[1].token.value).toBe("world");
    expect(result[1].extraClasses).toEqual([]);
  });

  it("merges overlapping decorations", () => {
    const tokens = [makeToken("xyz", "identifier", 0)];
    const decorations: Decoration[] = [
      { range: makeRange(0, 3), className: "a" },
      { range: makeRange(0, 3), className: "b" },
    ];
    const result = applyDecorations(tokens, decorations);
    expect(result[0].extraClasses).toEqual(["a", "b"]);
  });

  it("respects decoration priority order", () => {
    const tokens = [makeToken("xyz", "identifier", 0)];
    const decorations: Decoration[] = [
      { range: makeRange(0, 3), className: "high", priority: 10 },
      { range: makeRange(0, 3), className: "low", priority: 1 },
    ];
    const result = applyDecorations(tokens, decorations);
    // Lower priority first, higher priority last
    expect(result[0].extraClasses).toEqual(["low", "high"]);
  });

  it("handles decoration with no overlapping tokens", () => {
    const tokens = [makeToken("abc", "identifier", 0)];
    const decorations: Decoration[] = [
      { range: makeRange(10, 20), className: "x" },
    ];
    const result = applyDecorations(tokens, decorations);
    expect(result).toHaveLength(1);
    expect(result[0].extraClasses).toEqual([]);
  });

  it("applies decoration style", () => {
    const tokens = [makeToken("x", "identifier", 0)];
    const decorations: Decoration[] = [
      {
        range: makeRange(0, 1),
        style: "text-decoration:underline",
      },
    ];
    const result = applyDecorations(tokens, decorations);
    expect(result[0].extraStyle).toBe("text-decoration:underline");
  });
});
