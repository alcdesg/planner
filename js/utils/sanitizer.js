/**
 * @file sanitizer.js
 * Canonical, attribute-safe HTML sanitization utility.
 * Protects against XSS, HTML injection, and attribute breakout across all templates.
 */

export const Sanitizer = {
  /**
   * Escape special HTML characters to prevent XSS in text nodes and attributes.
   * @param {any} input
   * @returns {string}
   */
  escape(input) {
    if (input === null || input === undefined) return '';
    const str = String(input);

    const entityMap = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;',
      '`': '&#x60;'
    };

    return str.replace(/[&<>"'`\/]/g, char => entityMap[char] || char);
  },

  /**
   * Strip all HTML tags from an input string
   * @param {string} input
   * @returns {string}
   */
  stripTags(input) {
    if (!input) return '';
    return String(input).replace(/<\/?[^>]+(>|$)/g, '');
  },

  /**
   * Safe text trimmer with maximum length clamp
   * @param {string} input
   * @param {number} maxLength
   * @returns {string}
   */
  clampText(input, maxLength = 255) {
    if (!input) return '';
    return String(input).trim().slice(0, maxLength);
  }
};
