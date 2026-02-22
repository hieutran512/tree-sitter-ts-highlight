// ---------------------------------------------------------------------------
// Default ANSI Terminal Theme (16-color)
// ---------------------------------------------------------------------------

import type { AnsiTheme } from "../types.js";

export const defaultAnsiTheme: AnsiTheme = {
  name: "ansi-default",
  lineNumberColor: "90", // bright black (gray)
  colors: {
    keyword: "35;1",     // magenta bold
    identifier: "0",     // default
    string: "32",        // green
    number: "33",        // yellow
    comment: "90;3",     // bright black italic
    operator: "0",       // default
    punctuation: "0",    // default
    type: "33;1",        // yellow bold
    decorator: "35",     // magenta
    tag: "31",           // red
    attribute: "33",     // yellow
    meta: "90",          // bright black
    regexp: "32",        // green
    escape: "33;1",      // yellow bold
    variable: "31",      // red
    constant: "33",      // yellow
    error: "31;4",       // red underline
    plain: "0",          // default
  },
};
