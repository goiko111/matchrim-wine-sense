import { Capacitor, registerPlugin } from '@capacitor/core';

// 162: place search for «¿Dónde lo tomaste?». On the iPhone it asks Apple's maps through the app's own plugin (free,
// no key, no location permission). Where the plugin is missing (the web, an older build) it answers nothing and the
// person keeps what they typed: the screen never depends on it.
export type Place162 = { name: string; address: string; lat: number | null; lng: number | null };
type Transport = { search(input: { query: string }): Promise<{ places?: unknown }> };
const native = registerPlugin<Transport>('MatchrimPlaces');
const text = (value: unknown, max: number) => typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '';
const coordinate = (value: unknown, limit: number) => typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= limit ? value : null;
export const parsePlaces162 = (value: unknown): Place162[] => (Array.isArray(value) ? value : []).slice(0, 8).flatMap(item => {
  const raw = item && typeof item === 'object' ? item as Record<string, unknown> : {}, name = text(raw.name, 120);
  return name ? [{ name, address: text(raw.address, 160), lat: coordinate(raw.lat, 90), lng: coordinate(raw.lng, 180) }] : [];
});
export const searchPlaces162 = async (query: string): Promise<Place162[]> => {
  const asked = query.trim(); if (asked.length < 3 || asked.length > 80) return [];
  // QA hook of the simulator harness: a fixed answer instead of Apple's maps.
  const qa = (globalThis as { __matchrimPlacesQa162?: (query: string) => unknown }).__matchrimPlacesQa162;
  if (qa) return parsePlaces162(qa(asked));
  if (!Capacitor.isNativePlatform()) return [];
  try { return parsePlaces162((await native.search({ query: asked })).places); } catch { return []; }
};
/** What is kept with the wine: the name and, when a place was picked, where it is. */
export const placeLabel162 = (place: Place162) => place.address ? `${place.name} · ${place.address}` : place.name;
/** Opens the place in the phone's maps. */
export const placeMapUrl162 = (place: Place162) => place.lat !== null && place.lng !== null
  ? `https://maps.apple.com/?q=${encodeURIComponent(place.name)}&ll=${place.lat.toFixed(5)},${place.lng.toFixed(5)}`
  : `https://maps.apple.com/?q=${encodeURIComponent(placeLabel162(place))}`;
/** 163: the same place in Google Maps (its public search link: no key, no cost; opens the app when installed). */
export const googleMapUrl163 = (place: Place162) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeLabel162(place))}`;
