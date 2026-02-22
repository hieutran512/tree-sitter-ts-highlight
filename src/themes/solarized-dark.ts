// ---------------------------------------------------------------------------
// Solarized Dark Theme
// ---------------------------------------------------------------------------

import type { HtmlTheme } from "../types.js";

export const solarizedDarkTheme: HtmlTheme = {
  name: "solarized-dark",
  background: "#002b36",
  foreground: "#839496",
  lineNumberColor: "#586e75",
  lineNumberBorderColor: "#073642",
  styles: {
    keyword: "color:#859900;font-weight:bold",
    identifier: "color:#839496",
    string: "color:#2aa198",
    number: "color:#d33682",
    comment: "color:#586e75;font-style:italic",
    operator: "color:#839496",
    punctuation: "color:#839496",
    type: "color:#b58900",
    decorator: "color:#6c71c4",
    tag: "color:#268bd2",
    attribute: "color:#b58900",
    meta: "color:#586e75",
    regexp: "color:#dc322f",
    escape: "color:#cb4b16;font-weight:bold",
    variable: "color:#268bd2",
    constant: "color:#d33682",
    error: "color:#dc322f;text-decoration:wavy underline",
    plain: "color:#839496",
  },
};
