import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import MapView, { Circle, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { DEFAULT_CENTRE } from '../config';
import { circleBounds } from '../geo';
import { hasPlace } from '../tasks';
import { colours } from '../theme';

// The full-screen map behind everything on the home screen: Google Maps on
// Android. (react-native-maps shows Apple Maps on iPhone unless it also gets a
// Google key for iOS.)
//
//   tasks       every task; the ones with a place get a pin
//   selectedId  the task being looked at, drawn dark with its radius
//   draft       the task being added or edited; its pin and circle are drawn
//               when it has a place (placeOn) that's been put somewhere
//   places      the person's saved places (Home, Work…), drawn as white dots
//   showUser    location permission granted, so the blue dot can be shown
//   padding     { top, bottom }: how much of the screen the search bar and the
//               sheet cover. The map keeps its centre, and Google's logo, in
//               the part that can be seen. (Google's terms say the logo must
//               stay visible.)
//   onUserMove  the person has started dragging or zooming the map
const TaskMap = forwardRef(function TaskMap(
  {
    tasks,
    selectedId,
    draft,
    places = [],
    showUser,
    padding = { top: 0, bottom: 0 },
    onPress,
    onLongPress,
    onPinPress,
    onPlacePress,
    onUserMove,
  },
  ref,
) {
  const map = useRef(null);

  // Names under the pins only once the map is zoomed in far enough for them
  // to fit; zoomed out they'd pile up on top of each other
  const [showLabels, setShowLabels] = useState(true);

  // The latest padding, for the camera moves below
  const paddingRef = useRef(padding);
  useEffect(() => {
    paddingRef.current = padding;
  }, [padding]);

  // Only a new object when the numbers change, so the map isn't handed the
  // same padding again on every render
  const mapPadding = useMemo(
    () => ({ top: padding.top, right: 0, bottom: padding.bottom, left: 0 }),
    [padding.top, padding.bottom],
  );

  // The camera can only be moved once the map has loaded. A move asked for
  // before that (finding where the person is, at start-up, can be quicker
  // than the map) waits here and happens as soon as it's ready. Only the
  // latest waiting move counts.
  const ready = useRef(false);
  const waiting = useRef(null);

  const moveCamera = move => {
    if (!ready.current) {
      waiting.current = move;
      return;
    }
    try {
      // A move the map turns down (it's being torn down, say) isn't worth
      // an error on screen
      Promise.resolve(move()).catch(() => {});
    } catch {
      // Same, for a move that fails straight away
    }
  };

  const mapReady = () => {
    if (ready.current) {
      return;
    }
    ready.current = true;
    const move = waiting.current;
    waiting.current = null;
    if (move) {
      moveCamera(move);
    }
  };

  // What HomeScreen can ask the map to do. The padding already keeps things
  // in the part of the map above the sheet.
  useImperativeHandle(ref, () => ({
    flyTo(latitude, longitude, { zoom = 15 } = {}) {
      moveCamera(() =>
        map.current?.animateCamera({ center: { latitude, longitude }, zoom }, { duration: 900 }),
      );
    },
    // Frames a reminder circle in the part of the map that can be seen. A
    // small circle still gets a street or two around it, so the map doesn't
    // zoom in so far that there's nothing to recognise.
    //   bottom  how much the sheet will cover once it's settled, when it's
    //           still on its way there, so the circle fits above it then
    fitCircle(latitude, longitude, radius, { bottom = 0 } = {}) {
      const [west, south, east, north] = circleBounds(latitude, longitude, Math.max(radius, 120));
      const stillToCover = Math.max(0, bottom - paddingRef.current.bottom);
      moveCamera(() =>
        map.current?.fitToCoordinates(
          [
            { latitude: south, longitude: west },
            { latitude: north, longitude: east },
          ],
          {
            edgePadding: { top: 24, right: 32, bottom: Math.round(24 + stillToCover), left: 32 },
            animated: true,
          },
        ),
      );
    },
    // The middle of the part of the map that can be seen
    async centre() {
      const camera = await map.current.getCamera();
      return camera.center;
    },
  }));

  const pinned = useMemo(
    () =>
      tasks
        .filter(hasPlace)
        // While a task is being edited its draft pin replaces the old one
        .filter(task => !(draft && draft.taskId === task.id)),
    [tasks, draft],
  );

  const circles = useMemo(() => {
    const shapes = [];
    const selected = tasks.find(task => task.id === selectedId);

    if (draft?.placeOn && draft.latitude != null) {
      shapes.push({
        key: 'draft',
        latitude: draft.latitude,
        longitude: draft.longitude,
        radius: draft.radius,
        colour: colours.ink,
      });
    } else if (selected && hasPlace(selected)) {
      shapes.push({
        key: 'selected',
        latitude: selected.latitude,
        longitude: selected.longitude,
        radius: selected.radius,
        colour: colours.orange,
      });
      if (selected.triggerLatitude != null) {
        shapes.push({
          key: 'trigger',
          latitude: selected.triggerLatitude,
          longitude: selected.triggerLongitude,
          radius: selected.triggerRadius,
          colour: colours.teal,
        });
      }
    }

    return shapes;
  }, [tasks, selectedId, draft]);

  const draftPinned = draft?.placeOn && draft.latitude != null;

  return (
    <MapView
      ref={map}
      style={StyleSheet.absoluteFill}
      provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
      initialCamera={{
        center: DEFAULT_CENTRE,
        zoom: 12,
        heading: 0,
        pitch: 0,
        altitude: 40000,
      }}
      mapPadding={mapPadding}
      showsUserLocation={showUser}
      // Caltal has its own "show where I am" button, under the profile picture
      showsMyLocationButton={false}
      showsCompass={false}
      // No Google Maps buttons popping up when a pin is tapped, and the map
      // doesn't jump to a pin when it's tapped
      toolbarEnabled={false}
      moveOnMarkerPress={false}
      rotateEnabled={false}
      pitchEnabled={false}
      onMapReady={mapReady}
      onPress={event => {
        // Android also tells the map about taps on pins; the pin deals with those
        if (event.nativeEvent.action === 'marker-press') {
          return;
        }
        onPress?.(event.nativeEvent.coordinate);
      }}
      onLongPress={event => onLongPress?.(event.nativeEvent.coordinate)}
      // A tap on a shop or station on Google's map is a tap on that spot. Its
      // name isn't used: Google's terms don't allow storing their place data.
      onPoiClick={event => onPress?.(event.nativeEvent.coordinate)}
      onRegionChangeStart={(region, details) => {
        // Only the person's own drags and pinches, not the map moving itself
        if (details?.isGesture) {
          onUserMove?.();
        }
      }}
      onRegionChangeComplete={region => {
        setShowLabels(zoomOf(region) >= LABELS_FROM_ZOOM);
      }}
    >
      {circles.map(circle => (
        <Circle
          key={`${circle.key}-${circle.latitude}-${circle.longitude}-${circle.radius}`}
          center={{ latitude: circle.latitude, longitude: circle.longitude }}
          radius={circle.radius}
          fillColor={withOpacity(circle.colour, 0.12)}
          strokeColor={withOpacity(circle.colour, 0.6)}
          strokeWidth={2}
        />
      ))}

      {places.map(place => (
        <Pin
          // A change of name or look draws the marker afresh (see Pin)
          key={`place-${place.id}-${place.name}-${showLabels}`}
          coordinate={{ latitude: place.latitude, longitude: place.longitude }}
          anchor={anchorFor(showLabels)}
          zIndex={2}
          onPress={() => {
            // Same rule as the task pins below
            if (!onPlacePress?.(place.id)) {
              onPress?.({ latitude: place.latitude, longitude: place.longitude });
            }
          }}
        >
          <Dot
            fill="#ffffff"
            border={colours.ink}
            label={showLabels ? place.name : null}
            bold
          />
        </Pin>
      ))}

      {pinned.map(task => {
        const selected = task.id === selectedId;
        return (
          <Pin
            key={`task-${task.id}-${task.name}-${task.complete}-${selected}-${showLabels}`}
            coordinate={{ latitude: task.latitude, longitude: task.longitude }}
            anchor={anchorFor(showLabels)}
            zIndex={selected ? 4 : 3}
            onPress={() => {
              // onPinPress says whether it used the tap. If not (while
              // placing a new pin, say), the tap goes to the map instead, so
              // the new pin can go on this spot.
              if (!onPinPress?.(task.id)) {
                onPress?.({ latitude: task.latitude, longitude: task.longitude });
              }
            }}
          >
            <Dot
              fill={selected ? colours.ink : task.complete ? colours.faint : colours.orange}
              border="#ffffff"
              big={selected}
              label={showLabels ? task.name : null}
            />
          </Pin>
        );
      })}

      {draftPinned && (
        <Pin
          key={`draft-${draft.latitude}-${draft.longitude}`}
          coordinate={{ latitude: draft.latitude, longitude: draft.longitude }}
          anchor={anchorFor(false)}
          zIndex={5}
        >
          <Dot fill={colours.ink} border="#ffffff" big />
        </Pin>
      )}
    </MapView>
  );
});

const LABELS_FROM_ZOOM = 13;

// Google Maps zoom from the span of the map that's on screen
function zoomOf(region) {
  return Math.log2(360 / Math.max(region.longitudeDelta, 1e-6));
}

// Each marker is a dot with an optional name under it. The anchor is the
// middle of the dot, so the dot sits exactly on the spot.
const DOT_SPACE = 24;
const LABEL_SPACE = 34;

function anchorFor(withLabel) {
  return withLabel
    ? { x: 0.5, y: DOT_SPACE / 2 / (DOT_SPACE + LABEL_SPACE) }
    : { x: 0.5, y: 0.5 };
}

// A marker on the map. Android draws a marker's view into a picture and
// reuses it. While tracksViewChanges is on it redraws all the time, which is
// slow with many pins, so it's on just long enough for the first drawing. A
// change of look remounts the marker (its key changes), which draws it again.
function Pin({ children, ...markerProps }) {
  const [drawing, setDrawing] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setDrawing(false), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Marker {...markerProps} tracksViewChanges={drawing}>
      {children}
    </Marker>
  );
}

// What a marker looks like: a dot, with a name under it if there's room
function Dot({ fill, border, big = false, label = null, bold = false }) {
  const size = big ? 20 : 16;

  return (
    <View style={label ? styles.withLabel : styles.dotOnly}>
      <View style={styles.dotSpace}>
        <View
          style={[
            styles.dot,
            { width: size, height: size, borderRadius: size / 2, backgroundColor: fill, borderColor: border },
          ]}
        />
      </View>
      {label != null && (
        <Text style={[styles.label, bold && styles.labelBold]} numberOfLines={2}>
          {label}
        </Text>
      )}
    </View>
  );
}

// '#fb8a28' → 'rgba(251, 138, 40, 0.12)'
function withOpacity(hex, opacity) {
  const value = parseInt(hex.slice(1), 16);
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${opacity})`;
}

const styles = StyleSheet.create({
  dotOnly: { width: DOT_SPACE, height: DOT_SPACE },
  withLabel: { width: 120, height: DOT_SPACE + LABEL_SPACE, alignItems: 'center' },
  dotSpace: { width: DOT_SPACE, height: DOT_SPACE, alignItems: 'center', justifyContent: 'center' },
  dot: { borderWidth: 3 },
  label: {
    fontSize: 12,
    lineHeight: 15,
    color: colours.ink,
    textAlign: 'center',
    textShadowColor: '#ffffff',
    textShadowRadius: 3,
  },
  labelBold: { fontWeight: '700' },
});

export default TaskMap;
