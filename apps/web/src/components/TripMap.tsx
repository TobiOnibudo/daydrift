import L, { type LatLngBoundsExpression, type LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useMemo } from 'react';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';

import type { TripLeg } from '../lib/types';

interface TripMapProps {
  legs: TripLeg[];
  /** GeoJSON LineString from OSRM, or null when routing was unavailable. */
  routeGeojson: unknown;
}

const isLineString = (value: unknown): value is GeoJSON.LineString =>
  typeof value === 'object' &&
  value !== null &&
  (value as { type?: unknown }).type === 'LineString' &&
  Array.isArray((value as { coordinates?: unknown }).coordinates);

/** GeoJSON is [lng, lat]; Leaflet wants [lat, lng]. */
export const toLatLngs = (line: GeoJSON.LineString): LatLngExpression[] =>
  line.coordinates.map(([lng, lat]) => [lat as number, lng as number] as LatLngExpression);

const markerIcon = (number: number, index: number) =>
  L.divIcon({
    className: 'daydrift-marker',
    html: `<span style="animation: marker-pop .45s cubic-bezier(.2,1.4,.4,1) both; animation-delay: ${index * 90}ms">${number}</span>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });

function FitBounds({ bounds }: { bounds: LatLngBoundsExpression }) {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
  }, [map, bounds]);
  return null;
}

export function TripMap({ legs, routeGeojson }: TripMapProps) {
  const routePoints = useMemo(
    () => (isLineString(routeGeojson) ? toLatLngs(routeGeojson) : null),
    [routeGeojson],
  );
  const stops = useMemo(() => legs.map((l): LatLngExpression => [l.lat, l.lng]), [legs]);
  const path = routePoints ?? stops;
  const bounds = useMemo(() => L.latLngBounds([...path, ...stops]), [path, stops]);

  return (
    <div
      role="region"
      aria-label={`Map of the route with ${legs.length} stops`}
      className="shadow-soft h-[22rem] w-full overflow-hidden rounded-lg border lg:h-[34rem]"
    >
      <MapContainer bounds={bounds} scrollWheelZoom={false} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Polyline
          positions={path}
          pathOptions={{
            color: 'hsl(12 72% 42%)',
            weight: 4,
            opacity: 0.9,
            // Dashed when it is only a straight-line fallback, solid for a real road/path route.
            dashArray: routePoints ? undefined : '8 8',
          }}
        />
        {legs.map((leg, i) => (
          <Marker
            key={leg.placeId}
            position={[leg.lat, leg.lng]}
            icon={markerIcon(leg.order, i)}
            title={`${leg.order}. ${leg.name}`}
          >
            <Popup>
              <strong>
                {leg.order}. {leg.name}
              </strong>
              {leg.note && <p className="mt-1">{leg.note}</p>}
            </Popup>
          </Marker>
        ))}
        <FitBounds bounds={bounds} />
      </MapContainer>
    </div>
  );
}
