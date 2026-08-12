/**
 * Escape HTML special characters to prevent XSS in HTML contexts
 * (e.g. email templates).
 *
 * @param {string} str — The untrusted string to escape.
 * @returns {string}   — HTML-safe version of the string.
 */
export function escapeHtml(str) {
  if (typeof str !== "string") return String(str ?? "");
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
