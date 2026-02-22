// ---------------------------------------------------------------------------
// GitHub Light Theme
// ---------------------------------------------------------------------------

import type { HtmlTheme } from "../types.js";

export const githubLightTheme: HtmlTheme = {
  name: "github-light",
  background: "#ffffff",
  foreground: "#1f2328",
  lineNumberColor: "#8c959f",
  lineNumberBorderColor: "#d1d9e0",
  styles: {
    keyword: "color:#cf222e;font-weight:bold",
    identifier: "color:#1f2328",
    string: "color:#0a3069",
    number: "color:#0550ae",
    comment: "color:#6e7781;font-style:italic",
    operator: "color:#1f2328",
    punctuation: "color:#1f2328",
    type: "color:#953800",
    decorator: "color:#8250df",
    tag: "color:#116329",
    attribute: "color:#0550ae",
    meta: "color:#6e7781",
    regexp: "color:#0a3069",
    escape: "color:#0550ae;font-weight:bold",
    variable: "color:#953800",
    constant: "color:#0550ae",
    error: "color:#cf222e;text-decoration:wavy underline",
    plain: "color:#1f2328",
  },
};
