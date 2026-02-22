import { escapeHtml } from "../src/html/escaper.js";

describe("escapeHtml", () => {
  it("escapes ampersand", () => {
    expect(escapeHtml("a & b")).toBe("a &amp; b");
  });

  it("escapes less-than", () => {
    expect(escapeHtml("a < b")).toBe("a &lt; b");
  });

  it("escapes greater-than", () => {
    expect(escapeHtml("a > b")).toBe("a &gt; b");
  });

  it("escapes double quotes", () => {
    expect(escapeHtml('a "b" c')).toBe("a &quot;b&quot; c");
  });

  it("escapes single quotes", () => {
    expect(escapeHtml("a 'b' c")).toBe("a &#39;b&#39; c");
  });

  it("escapes all special characters in one string", () => {
    expect(escapeHtml(`<div class="a" data-x='b'>&</div>`)).toBe(
      "&lt;div class=&quot;a&quot; data-x=&#39;b&#39;&gt;&amp;&lt;/div&gt;",
    );
  });

  it("returns empty string unchanged", () => {
    expect(escapeHtml("")).toBe("");
  });

  it("returns string with no special chars unchanged", () => {
    expect(escapeHtml("hello world 123")).toBe("hello world 123");
  });

  it("preserves unicode characters", () => {
    expect(escapeHtml("こんにちは 🎉")).toBe("こんにちは 🎉");
  });

  it("handles consecutive special characters", () => {
    expect(escapeHtml("<<>>&&")).toBe("&lt;&lt;&gt;&gt;&amp;&amp;");
  });
});
