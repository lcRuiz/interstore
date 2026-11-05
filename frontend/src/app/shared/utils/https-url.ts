/**
 * Devuelve la URL solo si usa el esquema `https:`; en cualquier otro caso `null`.
 *
 * Las imágenes vienen del servidor: descartar `javascript:`, `data:` y `http:` evita
 * inyectar contenido activo o mixto (SR-002).
 *
 * @param value Texto a validar; una cadena que no sea URL absoluta devuelve `null`.
 */
export function httpsUrlOrNull(value: string): string | null {
  try {
    return new URL(value).protocol === 'https:' ? value : null;
  } catch {
    return null;
  }
}
