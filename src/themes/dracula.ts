// ---------------------------------------------------------------------------
// Dracula Theme
// ---------------------------------------------------------------------------

import type { HtmlTheme } from "../types.js";

export const draculaTheme: HtmlTheme = {
  name: "dracula",
  background: "#282a36",
  foreground: "#f8f8f2",
  lineNumberColor: "#6272a4",
  lineNumberBorderColor: "#44475a",
  styles: {
    keyword: "color:#ff79c6;font-weight:bold",
    identifier: "color:#f8f8f2",
    string: "color:#f1fa8c",
    number: "color:#bd93f9",
    comment: "color:#6272a4;font-style:italic",
    operator: "color:#ff79c6",
    punctuation: "color:#f8f8f2",
    type: "color:#8be9fd;font-style:italic",
    decorator: "color:#50fa7b",
    tag: "color:#ff79c6",
    attribute: "color:#50fa7b",
    meta: "color:#6272a4",
    regexp: "color:#f1fa8c",
    escape: "color:#bd93f9;font-weight:bold",
    variable: "color:#ffb86c",
    constant: "color:#bd93f9",
    error: "color:#ff5555;text-decoration:wavy underline",
    plain: "color:#f8f8f2",
  },
};
