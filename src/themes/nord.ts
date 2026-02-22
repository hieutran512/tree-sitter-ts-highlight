// ---------------------------------------------------------------------------
// Nord Theme
// ---------------------------------------------------------------------------

import type { HtmlTheme } from "../types.js";

export const nordTheme: HtmlTheme = {
  name: "nord",
  background: "#2e3440",
  foreground: "#d8dee9",
  lineNumberColor: "#4c566a",
  lineNumberBorderColor: "#3b4252",
  styles: {
    keyword: "color:#81a1c1;font-weight:bold",
    identifier: "color:#d8dee9",
    string: "color:#a3be8c",
    number: "color:#b48ead",
    comment: "color:#616e88;font-style:italic",
    operator: "color:#81a1c1",
    punctuation: "color:#eceff4",
    type: "color:#8fbcbb",
    decorator: "color:#d08770",
    tag: "color:#81a1c1",
    attribute: "color:#8fbcbb",
    meta: "color:#616e88",
    regexp: "color:#ebcb8b",
    escape: "color:#d08770;font-weight:bold",
    variable: "color:#d8dee9",
    constant: "color:#b48ead",
    error: "color:#bf616a;text-decoration:wavy underline",
    plain: "color:#d8dee9",
  },
};
