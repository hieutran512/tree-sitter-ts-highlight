// ---------------------------------------------------------------------------
// Default Light Theme (One Light-inspired)
// ---------------------------------------------------------------------------

import type { HtmlTheme } from "../types.js";

export const defaultLightTheme: HtmlTheme = {
  name: "default-light",
  background: "#fafafa",
  foreground: "#383a42",
  lineNumberColor: "#a0a1a7",
  lineNumberBorderColor: "#e0e0e0",
  styles: {
    keyword: "color:#a626a4;font-weight:bold",
    identifier: "color:#383a42",
    string: "color:#50a14f",
    number: "color:#986801",
    comment: "color:#a0a1a7;font-style:italic",
    operator: "color:#383a42",
    punctuation: "color:#383a42",
    type: "color:#c18401",
    decorator: "color:#a626a4",
    tag: "color:#e45649",
    attribute: "color:#986801",
    meta: "color:#a0a1a7",
    regexp: "color:#50a14f",
    escape: "color:#986801;font-weight:bold",
    variable: "color:#e45649",
    constant: "color:#986801",
    error: "color:#e45649;text-decoration:wavy underline",
    plain: "color:#383a42",
  },
};
