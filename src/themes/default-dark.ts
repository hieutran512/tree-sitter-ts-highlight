// ---------------------------------------------------------------------------
// Default Dark Theme (One Dark-inspired)
// ---------------------------------------------------------------------------

import type { HtmlTheme } from "../types.js";

export const defaultDarkTheme: HtmlTheme = {
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
    plain: "color:#abb2bf",
  },
};
