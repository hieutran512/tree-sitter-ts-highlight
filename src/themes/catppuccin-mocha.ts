// ---------------------------------------------------------------------------
// Catppuccin Mocha Theme
// ---------------------------------------------------------------------------

import type { HtmlTheme } from "../types.js";

export const catppuccinMochaTheme: HtmlTheme = {
  name: "catppuccin-mocha",
  background: "#1e1e2e",
  foreground: "#cdd6f4",
  lineNumberColor: "#585b70",
  lineNumberBorderColor: "#313244",
  styles: {
    keyword: "color:#cba6f7;font-weight:bold",
    identifier: "color:#cdd6f4",
    string: "color:#a6e3a1",
    number: "color:#fab387",
    comment: "color:#6c7086;font-style:italic",
    operator: "color:#89dceb",
    punctuation: "color:#9399b2",
    type: "color:#f9e2af",
    decorator: "color:#f5c2e7",
    tag: "color:#89b4fa",
    attribute: "color:#f2cdcd",
    meta: "color:#6c7086",
    regexp: "color:#f5c2e7",
    escape: "color:#fab387;font-weight:bold",
    variable: "color:#f38ba8",
    constant: "color:#fab387",
    error: "color:#f38ba8;text-decoration:wavy underline",
    plain: "color:#cdd6f4",
  },
};
