// ---------------------------------------------------------------------------
// Tokyo Night Theme
// ---------------------------------------------------------------------------

import type { HtmlTheme } from "../types.js";

export const tokyoNightTheme: HtmlTheme = {
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
    plain: "color:#a9b1d6",
  },
};
