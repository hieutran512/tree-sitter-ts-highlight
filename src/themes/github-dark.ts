// ---------------------------------------------------------------------------
// GitHub Dark Theme
// ---------------------------------------------------------------------------

import type { HtmlTheme } from "../types.js";

export const githubDarkTheme: HtmlTheme = {
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
    plain: "color:#e6edf3",
  },
};
