import { useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { AttributionControl, Map as MapLibreMap, NavigationControl, setWorkerUrl } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
// MapLibre does its heavy lifting (cutting up map tiles) in a background
// worker. Vite builds that worker as its own file on our own site, so the
// page's security policy can keep refusing scripts from anywhere else.
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import { DEFAULT_CENTRE, MAP_COLOURS, MAP_STYLE } from './config';
import { circlePolygon, collection, point } from './geo';
import { hasPlace } from './useTasks';

setWorkerUrl(workerUrl);

// How long a finger has to stay down on a phone to count as "press and hold"
const HOLD_MS = 550;

// Extra room around a click, in pixels, so a small pin is easy to hit
const HIT_SLOP = 6;

function toLatLon(lngLat) {
  return { latitude: lngLat.lat, longitude: lngLat.lng };
}

// The pins, circles and dots are drawn by the map itself (GeoJSON sources and
// layers) rather than as page elements floating on top. The map's renderer
// keeps them glued to the ground while panning and zooming, and stays fast
// with hundreds of pins. The same layers as the phone app's TaskMap.
function addLayers(map) {
  const empty = collection([]);

  map.addSource('radius-circles', { type: 'geojson', data: empty });
  map.addLayer({
    id: 'radius-fill',
    type: 'fill',
    source: 'radius-circles',
    paint: { 'fill-color': ['get', 'colour'], 'fill-opacity': 0.12 },
  });
  map.addLayer({
    id: 'radius-edge',
    type: 'line',
    source: 'radius-circles',
    paint: { 'line-color': ['get', 'colour'], 'line-width': 1.5, 'line-opacity': 0.6 },
  });

  map.addSource('saved-places', { type: 'geojson', data: empty });
  map.addLayer({
    id: 'saved-place',
    type: 'circle',
    source: 'saved-places',
    paint: {
      'circle-radius': 7,
      'circle-color': MAP_COLOURS.white,
      'circle-stroke-width': 3,
      'circle-stroke-color': MAP_COLOURS.ink,
    },
  });
  map.addLayer({
    id: 'saved-place-label',
    type: 'symbol',
    source: 'saved-places',
    layout: {
      'text-field': ['get', 'name'],
      'text-font': ['Noto Sans Bold'],
      'text-size': 12,
      'text-anchor': 'top',
      'text-offset': [0, 1],
      'text-optional': true,
    },
    paint: {
      'text-color': MAP_COLOURS.ink,
      'text-halo-color': MAP_COLOURS.white,
      'text-halo-width': 1.5,
    },
  });

  map.addSource('task-pins', { type: 'geojson', data: empty });
  map.addLayer({
    id: 'task-pin',
    type: 'circle',
    source: 'task-pins',
    paint: {
      'circle-radius': ['case', ['get', 'selected'], 10, 8],
      'circle-color': [
        'case',
        ['get', 'selected'],
        MAP_COLOURS.ink,
        ['get', 'complete'],
        MAP_COLOURS.faint,
        MAP_COLOURS.orange,
      ],
      'circle-stroke-width': 3,
      'circle-stroke-color': MAP_COLOURS.white,
    },
  });
  map.addLayer({
    id: 'task-label',
    type: 'symbol',
    source: 'task-pins',
    layout: {
      'text-field': ['get', 'name'],
      'text-font': ['Noto Sans Regular'],
      'text-size': 12,
      'text-anchor': 'top',
      'text-offset': [0, 1.1],
      'text-optional': true,
      'text-max-width': 10,
    },
    paint: {
      'text-color': MAP_COLOURS.ink,
      'text-halo-color': MAP_COLOURS.white,
      'text-halo-width': 1.5,
    },
  });

  // The pin being placed (dark), the second reminder place (teal) and the
  // last search result (also teal: the two are never on screen together)
  map.addSource('markers', { type: 'geojson', data: empty });
  map.addLayer({
    id: 'marker',
    type: 'circle',
    source: 'markers',
    paint: {
      'circle-radius': 9,
      'circle-color': ['match', ['get', 'kind'], 'draft', MAP_COLOURS.ink, MAP_COLOURS.teal],
      'circle-stroke-width': 3,
      'circle-stroke-color': MAP_COLOURS.white,
    },
  });

  // "You are here": a blue dot with a soft halo
  map.addSource('me', { type: 'geojson', data: empty });
  map.addLayer({
    id: 'me-halo',
    type: 'circle',
    source: 'me',
    paint: { 'circle-radius': 16, 'circle-color': '#2563eb', 'circle-opacity': 0.15 },
  });
  map.addLayer({
    id: 'me-dot',
    type: 'circle',
    source: 'me',
    paint: {
      'circle-radius': 6,
      'circle-color': '#2563eb',
      'circle-stroke-width': 2,
      'circle-stroke-color': MAP_COLOURS.white,
    },
  });
}

// The full-screen map behind everything on the home page.
//
//   tasks       every task; the ones with a place get a pin
//   selectedId  the task being looked at, drawn dark with its radius
//   draft       the task being added or edited; its pin and circle (and its
//               second reminder place, if it has one) are drawn while it has
//               a place
//   searched    { latitude, longitude } of the last search result
//   places      saved places (Home, Work…), drawn as white dots
//   me          { latitude, longitude } of the person, once known
//   padding     how much of the map the panel covers, so flyTo() lands the
//               point in the part that's actually visible
//
// The on… callbacks get { latitude, longitude }. onPinPress and onPlacePress
// get an id and return whether they used the click; if not, it goes to
// onPress as an ordinary click on the map.
function TaskMap({
  ref,
  tasks,
  selectedId,
  draft,
  searched,
  places,
  me,
  padding,
  onPress,
  onLongPress,
  onPinPress,
  onPlacePress,
}) {
  const container = useRef(null);
  const instance = useRef(null);
  // Set once the map's style has loaded and the layers above exist
  const [loaded, setLoaded] = useState(null);

  // The map's own event listeners are added once, so they read the latest
  // callbacks and padding from here rather than the ones from the first render
  const latest = useRef({});
  useEffect(() => {
    latest.current = { onPress, onLongPress, onPinPress, onPlacePress, padding };
  });

  useEffect(() => {
    const map = new MapLibreMap({
      container: container.current,
      style: MAP_STYLE,
      center: [DEFAULT_CENTRE.longitude, DEFAULT_CENTRE.latitude],
      zoom: 12,
      // Added below in a corner of our choosing. The credits must stay
      // visible: MapTiler and OpenStreetMap require it.
      attributionControl: false,
    });

    map.addControl(new AttributionControl({ compact: true }), 'bottom-right');
    map.addControl(new NavigationControl({ showCompass: false }), 'bottom-right');

    map.on('load', () => {
      addLayers(map);
      setLoaded(map);
    });

    map.on('click', event => {
      const { onPinPress: pinPress, onPlacePress: placePress, onPress: press } = latest.current;

      if (map.getLayer('task-pin')) {
        const { x, y } = event.point;
        const hits = map.queryRenderedFeatures(
          [[x - HIT_SLOP, y - HIT_SLOP], [x + HIT_SLOP, y + HIT_SLOP]],
          { layers: ['task-pin', 'saved-place'] },
        );

        const pin = hits.find(feature => feature.layer.id === 'task-pin');
        if (pin && pinPress?.(pin.properties.id)) {
          return;
        }

        const place = hits.find(feature => feature.layer.id === 'saved-place');
        if (place && placePress?.(place.properties.id)) {
          return;
        }
      }

      press?.(toLatLon(event.lngLat));
    });

    // Right-click on a computer...
    map.on('contextmenu', event => {
      event.originalEvent.preventDefault();
      latest.current.onLongPress?.(toLatLon(event.lngLat));
    });

    // ...and press and hold on a phone. Any movement means it was a drag or
    // a pinch instead, so the timer is cancelled.
    let holdTimer = null;
    const cancelHold = () => clearTimeout(holdTimer);

    map.on('touchstart', event => {
      cancelHold();
      if (event.originalEvent.touches.length !== 1) {
        return;
      }
      const where = toLatLon(event.lngLat);
      holdTimer = setTimeout(() => latest.current.onLongPress?.(where), HOLD_MS);
    });
    map.on('touchend', cancelHold);
    map.on('touchcancel', cancelHold);
    map.on('touchmove', cancelHold);
    map.on('movestart', cancelHold);

    // A pointing-hand cursor over anything clickable
    for (const layer of ['task-pin', 'saved-place']) {
      map.on('mouseenter', layer, () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', layer, () => {
        map.getCanvas().style.cursor = '';
      });
    }

    instance.current = map;

    return () => {
      cancelHold();
      map.remove();
      instance.current = null;
      setLoaded(null);
    };
  }, []);

  // What the home page can ask the map to do
  useImperativeHandle(
    ref,
    () => ({
      flyTo(latitude, longitude, zoom = 15) {
        instance.current?.flyTo({
          center: [longitude, latitude],
          zoom,
          duration: 900,
          padding: latest.current.padding,
        });
      },
      centre() {
        const centre = instance.current?.getCenter();
        return centre ? { latitude: centre.lat, longitude: centre.lng } : null;
      },
    }),
    [],
  );

  // ---- What's drawn ----

  const pins = useMemo(
    () =>
      collection(
        tasks
          .filter(hasPlace)
          // While a task is being edited, its draft pin replaces the old one
          .filter(task => !(draft && draft.taskId === task.id))
          .map(task =>
            point(task.latitude, task.longitude, {
              id: task.id,
              name: task.name,
              complete: task.complete,
              selected: task.id === selectedId,
            }),
          ),
      ),
    [tasks, selectedId, draft],
  );

  const circles = useMemo(() => {
    const shapes = [];
    const selected = tasks.find(task => task.id === selectedId);

    if (draft?.placeOn && draft.latitude != null) {
      shapes.push(
        circlePolygon(draft.latitude, draft.longitude, draft.radius, { colour: MAP_COLOURS.ink }),
      );
      if (draft.triggerOn && draft.trigger.latitude != null) {
        shapes.push(
          circlePolygon(draft.trigger.latitude, draft.trigger.longitude, draft.trigger.radius, {
            colour: MAP_COLOURS.teal,
          }),
        );
      }
    } else if (!draft && selected && hasPlace(selected)) {
      shapes.push(
        circlePolygon(selected.latitude, selected.longitude, selected.radius, {
          colour: MAP_COLOURS.orange,
        }),
      );
      if (selected.triggerLatitude != null) {
        shapes.push(
          circlePolygon(selected.triggerLatitude, selected.triggerLongitude, selected.triggerRadius, {
            colour: MAP_COLOURS.teal,
          }),
        );
      }
    }

    return collection(shapes);
  }, [tasks, selectedId, draft]);

  const savedPlaces = useMemo(
    () =>
      collection(
        places.map(place => point(place.latitude, place.longitude, { id: place.id, name: place.name })),
      ),
    [places],
  );

  const markers = useMemo(() => {
    const features = [];
    if (draft?.placeOn && draft.latitude != null) {
      features.push(point(draft.latitude, draft.longitude, { kind: 'draft' }));
      if (draft.triggerOn && draft.trigger.latitude != null) {
        features.push(point(draft.trigger.latitude, draft.trigger.longitude, { kind: 'trigger' }));
      }
    }
    if (searched) {
      features.push(point(searched.latitude, searched.longitude, { kind: 'search' }));
    }
    return collection(features);
  }, [draft, searched]);

  const whereIAm = useMemo(
    () => collection(me ? [point(me.latitude, me.longitude)] : []),
    [me],
  );

  useEffect(() => {
    loaded?.getSource('task-pins')?.setData(pins);
  }, [loaded, pins]);

  useEffect(() => {
    loaded?.getSource('radius-circles')?.setData(circles);
  }, [loaded, circles]);

  useEffect(() => {
    loaded?.getSource('saved-places')?.setData(savedPlaces);
  }, [loaded, savedPlaces]);

  useEffect(() => {
    loaded?.getSource('markers')?.setData(markers);
  }, [loaded, markers]);

  useEffect(() => {
    loaded?.getSource('me')?.setData(whereIAm);
  }, [loaded, whereIAm]);

  // Two boxes: MapLibre gives the inner one its own position: relative, which
  // would undo `absolute` if it were set on the same element
  return (
    <div className="absolute inset-0">
      <div ref={container} className="h-full w-full" />
    </div>
  );
}

export default TaskMap;
