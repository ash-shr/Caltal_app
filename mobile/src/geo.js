import { MAPTILER_KEY } from './config';

const EARTH_RADIUS_METRES = 6_371_000;

// A map can't draw "a circle of 200 metres" directly — it draws shapes made of
// points. So build a 64-sided polygon that's indistinguishable from a circle.
// GeoJSON puts longitude first: [lon, lat].
export function circlePolygon(latitude, longitude, radiusMetres, properties = {}) {
  const points = [];
  const angularDistance = radiusMetres / EARTH_RADIUS_METRES;
  const lat = (latitude * Math.PI) / 180;
  const lon = (longitude * Math.PI) / 180;

  for (let step = 0; step <= 64; step++) {
    const bearing = (step / 64) * 2 * Math.PI;

    const pointLat = Math.asin(
      Math.sin(lat) * Math.cos(angularDistance) +
        Math.cos(lat) * Math.sin(angularDistance) * Math.cos(bearing),
    );
    const pointLon =
      lon +
      Math.atan2(
        Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(lat),
        Math.cos(angularDistance) - Math.sin(lat) * Math.sin(pointLat),
      );

    points.push([(pointLon * 180) / Math.PI, (pointLat * 180) / Math.PI]);
  }

  return {
    type: 'Feature',
    properties,
    geometry: { type: 'Polygon', coordinates: [points] },
  };
}

export function point(latitude, longitude, properties = {}) {
  return {
    type: 'Feature',
    properties,
    geometry: { type: 'Point', coordinates: [longitude, latitude] },
  };
}

export function collection(features) {
  return { type: 'FeatureCollection', features };
}

// Place search, using MapTiler's geocoding with the same key as the map tiles.
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
