/**
 * Generate a URL-friendly slug from a string.
 * Handles French and special characters common in Burkina Faso.
 *
 * @param {string} text - Input text
 * @returns {string} URL-safe slug
 */
function slugify(text) {
  if (!text) return '';

  return text
    .toString()
    .toLowerCase()
    .normalize('NFD') // Decompose accented characters
    .replace(/[̀-ͯ]/g, '') // Remove diacritical marks
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Remove non-alphanumeric (except spaces/hyphens)
    .replace(/[\s_]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/-+/g, '-') // Collapse multiple hyphens
    .replace(/^-+|-+$/g, ''); // Trim hyphens from start/end
}

/**
 * Generate a unique slug by appending a random suffix
 * @param {string} text - Input text
 * @returns {string} Unique slug
 */
function uniqueSlug(text) {
  const base = slugify(text);
  const suffix = Math.random().toString(36).substring(2, 8);
  return `${base}-${suffix}`;
}

/**
 * Validate a subdomain string
 * Must match: ^[a-z0-9][a-z0-9-]*[a-z0-9]$
 * Length: 3-63 characters
 * @param {string} subdomain - Subdomain to validate
 * @returns {boolean} True if valid
 */
function isValidSubdomain(subdomain) {
  if (!subdomain || typeof subdomain !== 'string') return false;
  if (subdomain.length < 3 || subdomain.length > 63) return false;

  const pattern = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;
  if (!pattern.test(subdomain)) return false;

  // Reserved subdomains
  const reserved = [
    'www', 'api', 'admin', 'app', 'mail', 'smtp', 'pop', 'ftp',
    'dashboard', 'blog', 'help', 'support', 'status', 'shopizi',
    'm', 'mobile', 'secure', 'payment', 'pay',
  ];

  return !reserved.includes(subdomain);
}

module.exports = { slugify, uniqueSlug, isValidSubdomain };