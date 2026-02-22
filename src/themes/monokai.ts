// ---------------------------------------------------------------------------
// Monokai Theme
// ---------------------------------------------------------------------------

import type { HtmlTheme } from "../types.js";

export const monokaiTheme: HtmlTheme = {
  name: "monokai",
  background: "#272822",
  foreground: "#f8f8f2",
  lineNumberColor: "#90908a",
  lineNumberBorderColor: "#3e3d32",
  styles: {
    keyword: "color:#f92672;font-weight:bold",
    identifier: "color:#f8f8f2",
    string: "color:#e6db74",
    number: "color:#ae81ff",
    comment: "color:#75715e;font-style:italic",
    operator: "color:#f92672",
    punctuation: "color:#f8f8f2",
    type: "color:#66d9ef;font-style:italic",
    decorator: "color:#66d9ef",
    tag: "color:#f92672",
    attribute: "color:#a6e22e",
    meta: "color:#75715e",
    regexp: "color:#e6db74",
    escape: "color:#ae81ff;font-weight:bold",
    variable: "color:#fd971f",
    constant: "color:#ae81ff",
    error: "color:#f92672;text-decoration:wavy underline",
    plain: "color:#f8f8f2",
  },
};
