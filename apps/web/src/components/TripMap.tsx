import { useReducedMotion } from 'framer-motion';
import L, { type LatLngBoundsExpression, type LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Polyline as LeafletPolyline } from 'leaflet';
import { useEffect, useMemo, useRef } from 'react';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';

import type { TripLeg } from '../lib/types';

export type MarkerState = 'idle' | 'hover' | 'active';

interface TripMapProps {
  legs: TripLeg[];
  /** GeoJSON LineString from OSRM, or null when routing was unavailable. */
  routeGeojson: unknown;
  /** The selected stop: the map flies to it and opens its popup. */
  activeId?: string | null;
  /** The stop under the pointer or keyboard focus elsewhere (for example in the list). */
  hoveredId?: string | null;
  onSelect?: (placeId: string | null) => void;
  onHover?: (placeId: string | null) => void;
}

const isLineString = (value: unknown): value is GeoJSON.LineString =>
  typeof value === 'object' &&
  value !== null &&
  (value as { type?: unknown }).type === 'LineString' &&
  Array.isArray((value as { coordinates?: unknown }).coordinates);

/** GeoJSON is [lng, lat]; Leaflet wants [lat, lng]. */
export const toLatLngs = (line: GeoJSON.LineString): LatLngExpression[] =>
  line.coordinates.map(([lng, lat]) => [lat as number, lng as number] as LatLngExpression);

/** Only the first render animates the markers in; state changes must not replay it. */
const markerIcon = (number: number, index: number, state: MarkerState) =>
  L.divIcon({
    className: 'daydrift-marker',
    html:
      state === 'idle'
        ? `<span style="animation: marker-pop .45s cubic-bezier(.2,1.4,.4,1) both; animation-delay: ${index * 90}ms">${number}</span>`
        : `<span class="is-${state}">${number}</span>`,
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

/** Fly to the selected stop and open its popup; return to the whole route when deselected. */
function FocusActive({
  activeId,
  legs,
  markers,
  bounds,
}: {
  activeId: string | null;
  legs: TripLeg[];
  markers: React.MutableRefObject<Map<string, L.Marker>>;
  bounds: LatLngBoundsExpression;
}) {
  const map = useMap();
  const reduceMotion = useReducedMotion();
  const hadActive = useRef(false);

  useEffect(() => {
    const leg = legs.find((l) => l.placeId === activeId);
    if (!leg) {
      if (hadActive.current) {
        map.closePopup();
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16, animate: !reduceMotion });
      }
      hadActive.current = false;
      return;
    }
    hadActive.current = true;
    const target: LatLngExpression = [leg.lat, leg.lng];
    const zoom = Math.max(map.getZoom(), 15);
    if (reduceMotion) map.setView(target, zoom, { animate: false });
    else map.flyTo(target, zoom, { duration: 0.6 });
    markers.current.get(leg.placeId)?.openPopup();
  }, [activeId, legs, map, markers, bounds, reduceMotion]);

  return null;
}

export function TripMap({
  legs,
  routeGeojson,
  activeId = null,
  hoveredId = null,
  onSelect,
  onHover,
}: TripMapProps) {
  const routePoints = useMemo(
    () => (isLineString(routeGeojson) ? toLatLngs(routeGeojson) : null),
    [routeGeojson],
  );
  const stops = useMemo(() => legs.map((l): LatLngExpression => [l.lat, l.lng]), [legs]);
  const path = routePoints ?? stops;
  const bounds = useMemo(() => L.latLngBounds([...path, ...stops]), [path, stops]);

  const reduceMotion = useReducedMotion();
  const lineRef = useRef<LeafletPolyline | null>(null);

  // Draw the road route in from the first stop to the last. Transform-free: only the dash offset moves.
  useEffect(() => {
    const el = lineRef.current?.getElement() as SVGPathElement | undefined;
    if (!el || !routePoints || reduceMotion || typeof el.getTotalLength !== 'function') return;
    const length = el.getTotalLength();
    el.style.transition = 'none';
    el.style.strokeDasharray = String(length);
    el.style.strokeDashoffset = String(length);
    el.getBoundingClientRect();
    el.style.transition = 'stroke-dashoffset 1.6s cubic-bezier(.4,0,.2,1) .3s';
    el.style.strokeDashoffset = '0';
    const done = window.setTimeout(() => {
      el.style.transition = '';
      el.style.strokeDasharray = '';
      el.style.strokeDashoffset = '';
    }, 2000);
    return () => window.clearTimeout(done);
  }, [routePoints, reduceMotion]);

  const markers = useRef(new Map<string, L.Marker>());
  // Stable icon objects per (stop, state): react-leaflet only swaps an icon when its identity changes.
  const icons = useRef(new Map<string, L.DivIcon>());
  const iconFor = (leg: TripLeg, index: number, state: MarkerState) => {
    const key = `${leg.placeId}:${state}`;
    let icon = icons.current.get(key);
    if (!icon) {
      icon = markerIcon(leg.order, index, state);
      icons.current.set(key, icon);
    }
    return icon;
  };

  // popupclose also fires when a different stop's popup opens; only a close of the *current* stop deselects.
  const activeRef = useRef(activeId);
  activeRef.current = activeId;

  return (
    <div
      role="region"
      aria-label={`Map of the route with ${legs.length} stops`}
      className="shadow-soft relative h-full min-h-[16rem] w-full overflow-hidden rounded-lg border"
    >
      {activeId && onSelect && (
        <button
          type="button"
          onClick={() => onSelect(null)}
          className="bg-card shadow-soft hover:bg-accent absolute right-3 top-3 z-[1000] rounded-md border px-3 py-1.5 text-xs font-medium"
        >
          Show full route
        </button>
      )}
      <MapContainer bounds={bounds} scrollWheelZoom={false} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Polyline
          ref={lineRef}
          positions={path}
          pathOptions={{
            color: 'hsl(12 72% 38%)',
            weight: 4,
            opacity: 0.9,
            // Dashed when it is only a straight-line fallback, solid for a real road/path route.
            dashArray: routePoints ? undefined : '8 8',
          }}
        />
        {legs.map((leg, i) => {
          const state: MarkerState =
            leg.placeId === activeId ? 'active' : leg.placeId === hoveredId ? 'hover' : 'idle';
          return (
            <Marker
              key={leg.placeId}
              ref={(marker) => {
                if (marker) markers.current.set(leg.placeId, marker);
                else markers.current.delete(leg.placeId);
              }}
              position={[leg.lat, leg.lng]}
              icon={iconFor(leg, i, state)}
              zIndexOffset={state === 'active' ? 1000 : state === 'hover' ? 500 : 0}
              title={`${leg.order}. ${leg.name}`}
              eventHandlers={{
                click: () => onSelect?.(leg.placeId),
                mouseover: () => onHover?.(leg.placeId),
                mouseout: () => onHover?.(null),
                popupclose: () => {
                  if (activeRef.current === leg.placeId) onSelect?.(null);
                },
              }}
            >
              <Popup>
                <strong>
                  {leg.order}. {leg.name}
                </strong>
                {leg.note && <p className="mt-1">{leg.note}</p>}
              </Popup>
            </Marker>
          );
        })}
        <FitBounds bounds={bounds} />
        <FocusActive activeId={activeId} legs={legs} markers={markers} bounds={bounds} />
      </MapContainer>
    </div>
  );
}
