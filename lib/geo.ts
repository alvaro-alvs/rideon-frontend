/**
 * Verifica se um par de coordenadas (latitude, longitude) é válido.
 * Descarta valores ausentes, infinitos, fora da escala geográfica (-90 a 90, -180 a 180)
 * e as coordenadas (0, 0) ("Null Island" no meio do oceano Atlântico), que indicam
 * rastreador sem sinal de satélite ou sem comunicação inicial de GPS.
 */
export function isValidCoordinate(
  latitude?: number | null,
  longitude?: number | null,
): boolean {
  if (
    latitude === undefined ||
    latitude === null ||
    longitude === undefined ||
    longitude === null
  ) {
    return false;
  }
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return false;
  }
  // Coordenadas (0, 0) indicam ausência de sinal GPS / ponto nulo no oceano
  if (Math.abs(latitude) < 0.000001 && Math.abs(longitude) < 0.000001) {
    return false;
  }
  return Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180;
}

