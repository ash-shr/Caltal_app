import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { StyleSheet } from 'react-native';
import {
  Camera,
  GeoJSONSource,
  Layer,
  // Renamed so it can't be confused with JavaScript's built-in Map
  Map as MapView,
  NativeUserLocation,
} from '@maplibre/maplibre-react-native';
import { DEFAULT_CENTRE, MAP_STYLE } from '../config';
import { circleBounds, circlePolygon, collection, point } from '../geo';
import { hasPlace } from '../tasks';
import { colours } from '../theme';

// The full-screen map behind everything on the home screen.
//
// Pins and radius circles are drawn by the map itself (GeoJSON sources and
// layers), not as React views floating on top. The map's own renderer keeps
// them glued to the ground while panning and zooming, and stays fast with
// hundreds of pins.
//
//   tasks       every task; the ones with a place get a pin
//   selectedId  the task being looked at, drawn dark with its radius
//   draft       the task being added or edited; its pin and circle are drawn
//               when it has a place (placeOn) that's been put somewhere
//   places      the person's saved places (Home, Work…), drawn as white dots
//   showUser    location permission granted, so the blue dot can be shown
//   onUserMove  the person has started dragging or zooming the map
const TaskMap = forwardRef(function TaskMap(
  {
    tasks,
    selectedId,
    draft,
    places = [],
    showUser,
    attributionTop = 120,
    onPress,
    onLongPress,
    onPinPress,
    onPlacePress,
    onUserMove,
  },
  ref,
) {
  const camera = useRef(null);
  const map = useRef(null);

  // What HomeScreen can ask the map to do. bottomInset is how much of the
  // screen the sheet covers, so the point lands in the visible part above it.
  useImperativeHandle(ref, () => ({
    flyTo(latitude, longitude, { zoom = 15, bottomInset = 0 } = {}) {
      camera.current?.flyTo({
        center: [longitude, latitude],
        zoom,
        duration: 900,
        padding: { top: 0, right: 0, bottom: bottomInset, left: 0 },
      });
    },
    // Frames a reminder circle in the part of the map that can be seen:
    // `top` and `bottom` are how much of the screen the search bar and the
    // sheet cover. A small circle still gets a street or two around it, so
    // the map doesn't zoom in so far that there's nothing to recognise.
    // easing 'fly' swoops (for a new place), 'ease' just slides and zooms
    // (for a new radius).
    fitCircle(latitude, longitude, radius, { top = 0, bottom = 0, easing = 'fly' } = {}) {
      camera.current?.fitBounds(circleBounds(latitude, longitude, Math.max(radius, 120)), {
        padding: { top: top + 24, right: 32, bottom: bottom + 24, left: 32 },
        duration: easing === 'fly' ? 800 : 350,
        easing,
      });
    },
    async centre() {
      const [longitude, latitude] = await map.current.getCenter();
      return { latitude, longitude };
    },
  }));

  const pins = useMemo(
    () =>
      collection(
        tasks
          .filter(hasPlace)
          // While a task is being edited its draft pin replaces the old one
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
        circlePolygon(draft.latitude, draft.longitude, draft.radius, { colour: colours.ink }),
      );
    } else if (selected && hasPlace(selected)) {
      shapes.push(
        circlePolygon(selected.latitude, selected.longitude, selected.radius, {
          colour: colours.orange,
        }),
      );
      if (selected.triggerLatitude != null) {
        shapes.push(
          circlePolygon(
            selected.triggerLatitude,
            selected.triggerLongitude,
            selected.triggerRadius,
            { colour: colours.teal },
          ),
        );
      }
    }

    return collection(shapes);
  }, [tasks, selectedId, draft]);

  const savedPlaces = useMemo(
    () =>
      collection(
        places.map(place =>
          point(place.latitude, place.longitude, { id: place.id, name: place.name }),
        ),
      ),
    [places],
  );

  const markers = useMemo(
    () =>
      collection(
        draft?.placeOn && draft.latitude != null
          ? [point(draft.latitude, draft.longitude, { kind: 'draft' })]
          : [],
      ),
    [draft],
  );

  return (
    <MapView
      ref={map}
      style={StyleSheet.absoluteFill}
      mapStyle={MAP_STYLE}
      // The map's credits must stay visible (MapTiler and OpenStreetMap
      // require it); top-left, under the search bar, keeps them clear of the sheet.
      attributionPosition={{ top: attributionTop, left: 12 }}
      logo={false}
      compass={false}
      onPress={event => onPress?.(toLatLon(event.nativeEvent.lngLat))}
      onLongPress={event => onLongPress?.(toLatLon(event.nativeEvent.lngLat))}
      onRegionWillChange={event => {
        // Only the person's own drags and pinches, not the map moving itself
        if (event.nativeEvent.userInteraction) {
          onUserMove?.();
        }
      }}
    >
      <Camera
        ref={camera}
        initialViewState={{
          center: [DEFAULT_CENTRE.longitude, DEFAULT_CENTRE.latitude],
          zoom: 12,
        }}
      />

      {showUser && <NativeUserLocation />}

      <GeoJSONSource id="radius-circles" data={circles}>
        <Layer
          id="radius-fill"
          type="fill"
          paint={{ 'fill-color': ['get', 'colour'], 'fill-opacity': 0.12 }}
        />
        <Layer
          id="radius-edge"
          type="line"
          paint={{ 'line-color': ['get', 'colour'], 'line-width': 1.5, 'line-opacity': 0.6 }}
        />
      </GeoJSONSource>

      <GeoJSONSource
        id="saved-places"
        data={savedPlaces}
        onPress={event => {
          const feature = event.nativeEvent.features[0];
          // Same rule as the task pins below: stop the tap only if it was used
          if (feature && onPlacePress?.(feature.properties.id)) {
            event.stopPropagation();
          }
        }}
      >
        <Layer
          id="saved-place"
          type="circle"
          paint={{
            'circle-radius': 7,
            'circle-color': '#ffffff',
            'circle-stroke-width': 3,
            'circle-stroke-color': colours.ink,
          }}
        />
        <Layer
          id="saved-place-label"
          type="symbol"
          layout={{
            'text-field': ['get', 'name'],
            'text-font': ['Noto Sans Bold'],
            'text-size': 12,
            'text-anchor': 'top',
            'text-offset': [0, 1],
            'text-optional': true,
          }}
          paint={{
            'text-color': colours.ink,
            'text-halo-color': '#ffffff',
            'text-halo-width': 1.5,
          }}
        />
      </GeoJSONSource>

      <GeoJSONSource
        id="task-pins"
        data={pins}
        onPress={event => {
          const feature = event.nativeEvent.features[0];
          // onPinPress says whether it used the tap. If it did, stop the tap
          // reaching the map's own onPress too. If not (while placing a new
          // pin, say), let it through so the pin can go next to this one.
          if (feature && onPinPress?.(feature.properties.id)) {
            event.stopPropagation();
          }
        }}
      >
        <Layer
          id="task-pin"
          type="circle"
          paint={{
            'circle-radius': ['case', ['get', 'selected'], 10, 8],
            'circle-color': [
              'case',
              ['get', 'selected'],
              colours.ink,
              ['get', 'complete'],
              colours.faint,
              colours.orange,
            ],
            'circle-stroke-width': 3,
            'circle-stroke-color': '#ffffff',
          }}
        />
        <Layer
          id="task-label"
          type="symbol"
          layout={{
            'text-field': ['get', 'name'],
            'text-font': ['Noto Sans Regular'],
            'text-size': 12,
            'text-anchor': 'top',
            'text-offset': [0, 1.1],
            'text-optional': true,
            'text-max-width': 10,
          }}
          paint={{
            'text-color': colours.ink,
            'text-halo-color': '#ffffff',
            'text-halo-width': 1.5,
          }}
        />
      </GeoJSONSource>

      <GeoJSONSource id="markers" data={markers}>
        <Layer
          id="marker"
          type="circle"
          paint={{
            'circle-radius': 9,
            'circle-color': colours.ink,
            'circle-stroke-width': 3,
            'circle-stroke-color': '#ffffff',
          }}
        />
      </GeoJSONSource>
    </MapView>
  );
});

function toLatLon([longitude, latitude]) {
  return { latitude, longitude };
}

export default TaskMap;
