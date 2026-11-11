import { MAPTILER_KEY } from './config';

const EARTH_RADIUS_METRES = 6_371_000;

// The box around a circle: [west, south, east, north].
// Close enough for framing the map; a degree of longitude shrinks towards the
// poles, hence the cos.
export function circleBounds(latitude, longitude, radiusMetres) {
  const latitudeSpan = (radiusMetres / EARTH_RADIUS_METRES) * (180 / Math.PI);
  const longitudeSpan = latitudeSpan / Math.cos((latitude * Math.PI) / 180);
  return [
    longitude - longitudeSpan,
    latitude - latitudeSpan,
    longitude + longitudeSpan,
    latitude + latitudeSpan,
  ];
}

// Straight-line distance in metres between two points (the haversine
// formula). Plenty accurate at the scale of a reminder circle.
export function distanceMetres(latitude1, longitude1, latitude2, longitude2) {
  const toRadians = degrees => (degrees * Math.PI) / 180;
  const latitudeChange = toRadians(latitude2 - latitude1);
  const longitudeChange = toRadians(longitude2 - longitude1);
  const a =
    Math.sin(latitudeChange / 2) ** 2 +
    Math.cos(toRadians(latitude1)) *
      Math.cos(toRadians(latitude2)) *
      Math.sin(longitudeChange / 2) ** 2;
  return 2 * EARTH_RADIUS_METRES * Math.asin(Math.sqrt(a));
}

// Place search, using MapTiler's geocoding (OpenStreetMap's data). The map
// itself is Google Maps; Google's own place search would cost per search.
// `near` nudges results towards what's on screen, so "station" finds the one
// in Leeds rather than one in Sydney.
export async function searchPlaces(query, near, signal) {
  const params = new URLSearchParams({
    key: MAPTILER_KEY,
    limit: '6',
    language: 'en',
  });

  if (near) {
    params.set('proximity', `${near.longitude},${near.latitude}`);
  }

  const response = await fetch(
    `https://api.maptiler.com/geocoding/${encodeURIComponent(query)}.json?${params}`,
    { signal },
  );

  if (!response.ok) {
    throw new Error('Search is not available right now.');
  }

  const body = await response.json();

  return body.features.map(feature => ({
    id: feature.id,
    name: feature.text,
    address: feature.place_name,
    longitude: feature.center[0],
    latitude: feature.center[1],
  }));
}
