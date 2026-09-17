/**
 * Utilidades de búsqueda e indexación de texto insensibles a diacríticos (tildes),
 * mayúsculas/minúsculas y caracteres especiales.
 */

/**
 * Quita tildes, diacríticos y convierte el texto a minúsculas limpias.
 * Ejemplo:
 * normalizarTexto("Cálculo Avanzado") => "calculo avanzado"
 * normalizarTexto("Física Clásica")   => "fisica clasica"
 * normalizarTexto("Programación Web") => "programacion web"
 */
export function normalizarTexto(texto: string | null | undefined): string {
  if (!texto) return '';
  return texto
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Evalúa si una cadena objetivo contiene el término de búsqueda,
 * tolerando tildes tanto en la búsqueda como en el objetivo.
 */
export function coincideBusqueda(textoObjetivo: string | null | undefined, termino: string | null | undefined): boolean {
  if (!termino || !termino.trim()) return true;
  if (!textoObjetivo) return false;
  return normalizarTexto(textoObjetivo).includes(normalizarTexto(termino));
}

/**
 * Evalúa si alguno de los campos dados coincide con el término de búsqueda.
 */
export function coincideAlgunCampo(campos: (string | null | undefined)[], termino: string | null | undefined): boolean {
  if (!termino || !termino.trim()) return true;
  const terminoNorm = normalizarTexto(termino);
  return campos.some(campo => normalizarTexto(campo).includes(terminoNorm));
}
