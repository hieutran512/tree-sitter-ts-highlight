// ---------------------------------------------------------------------------
// ANSI SGR escape code constants and helpers
// ---------------------------------------------------------------------------

/** ANSI escape prefix */
export const ESC = "\x1b[";

/** Reset all attributes */
export const RESET = `${ESC}0m`;

/** Wrap text in an SGR code, with reset at the end */
export function sgr(code: string, text: string): string {
  if (!code || code === "0") return text;
  return `${ESC}${code}m${text}${RESET}`;
}
