// ---------------------------------------------------------------------------
// HTML entity escaping
// ---------------------------------------------------------------------------

const ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

const ESCAPE_RE = /[&<>"']/g;

/** Escape HTML special characters in text for safe insertion into HTML */
export function escapeHtml(text: string): string {
  return text.replace(ESCAPE_RE, (ch) => ESCAPE_MAP[ch]);
}
