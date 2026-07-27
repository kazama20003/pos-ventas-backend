/**
 * Turns arbitrary text into a URL/login-safe slug: lowercase ASCII, words
 * joined by single hyphens, diacritics stripped. Falls back to "empresa".
 */
export function generarSlug(texto: string, maxLongitud = 40): string {
  const base = texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // remove combining diacritics
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLongitud)
    .replace(/-+$/g, '');
  return base || 'empresa';
}
