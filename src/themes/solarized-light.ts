// ---------------------------------------------------------------------------
// Solarized Light Theme
// ---------------------------------------------------------------------------

import type { HtmlTheme } from "../types.js";

export const solarizedLightTheme: HtmlTheme = {
  name: "solarized-light",
  background: "#fdf6e3",
  foreground: "#657b83",
  lineNumberColor: "#93a1a1",
  lineNumberBorderColor: "#eee8d5",
  styles: {
    keyword: "color:#859900;font-weight:bold",
    identifier: "color:#657b83",
    string: "color:#2aa198",
    number: "color:#d33682",
    comment: "color:#93a1a1;font-style:italic",
    operator: "color:#657b83",
    punctuation: "color:#657b83",
    type: "color:#b58900",
    decorator: "color:#6c71c4",
    tag: "color:#268bd2",
    attribute: "color:#b58900",
    meta: "color:#93a1a1",
    regexp: "color:#dc322f",
    escape: "color:#cb4b16;font-weight:bold",
    variable: "color:#268bd2",
    constant: "color:#d33682",
    error: "color:#dc322f;text-decoration:wavy underline",
    plain: "color:#657b83",
  },
};
