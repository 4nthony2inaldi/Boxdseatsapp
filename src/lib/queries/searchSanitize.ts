/**
 * Strip PostgREST-structural characters from a user search term before it's
 * interpolated into a `.or(...)` / `.ilike(...)` filter string. Commas separate
 * conditions and parentheses group them in PostgREST's filter grammar, so an
 * unescaped one in user input can break out of the intended clause (filter
 * injection) or just throw a 400. Removing them is safe for name search —
 * nobody searches a player or venue by "(" — and keeps letters, numbers,
 * spaces, accents, apostrophes, periods and hyphens intact.
 */
export function sanitizeSearchTerm(input: string): string {
  return input.replace(/[,()\\*]/g, " ").replace(/\s+/g, " ").trim();
}
