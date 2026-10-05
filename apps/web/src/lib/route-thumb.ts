export interface GeoPoint {
  lat: number;
  lng: number;
}

/**
 * Project stops onto a small canvas so a trip's real shape can be drawn as artwork. Longitude is
 * scaled by cos(latitude) so a city block keeps its proportions, the shape is centred, and a
 * single point (or a degenerate line) lands in the middle.
 */
export function routeThumbPoints(
  points: GeoPoint[],
  width: number,
  height: number,
  padding = 10,
): Array<[number, number]> {
  if (points.length === 0) return [];
  const meanLat = points.reduce((sum, p) => sum + p.lat, 0) / points.length;
  const kx = Math.cos((meanLat * Math.PI) / 180);

  const xs = points.map((p) => p.lng * kx);
  const ys = points.map((p) => -p.lat); // screen y grows downward
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const spanX = maxX - minX;
  const spanY = maxY - minY;
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;
  const scale = Math.min(
    spanX > 0 ? innerW / spanX : Infinity,
    spanY > 0 ? innerH / spanY : Infinity,
  );
  const k = Number.isFinite(scale) ? scale : 0;

  const offsetX = (width - spanX * k) / 2;
  const offsetY = (height - spanY * k) / 2;
  return xs.map((x, i) => [offsetX + (x - minX) * k, offsetY + ((ys[i] as number) - minY) * k]);
}

/** An SVG path through the points (a plain polyline keeps the real geometry honest). */
export function pathThrough(points: Array<[number, number]>): string {
  return points
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(' ');
}
