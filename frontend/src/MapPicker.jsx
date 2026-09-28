import { memo } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Restricted to caltal.fly.dev and localhost in the MapTiler dashboard, so it
// being visible in the bundle is expected rather than a leak.
const MAP_KEY = import.meta.env.VITE_MAP_KEY;

// Leaflet's default marker images don't survive bundling, so point at a CDN copy
const icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const TASK_COLOUR = '#292524';
const TRIGGER_COLOUR = '#0d9488';

function ClickHandler({ onPick }) {
  useMapEvents({
    click(event) {
      onPick(event.latlng.lat, event.latlng.lng);
    },
  });

  return null;
}

// A pin with its radius drawn around it.
function Place({ point, colour }) {
  if (point.latitude === null || point.longitude === null) return null;

  return (
    <>
      <Marker position={[point.latitude, point.longitude]} icon={icon} />
      <Circle
        center={[point.latitude, point.longitude]}
        radius={point.radius}
        pathOptions={{
          color: colour,
          fillColor: colour,
          fillOpacity: 0.08,
          weight: 1,
        }}
      />
    </>
  );
}

// `task` is where the task is. `trigger` is the optional second place to be
// reminded at. Which of them a click moves is decided by the parent, which is
// what onPick does with the coordinates.
function MapPicker({ task, trigger, onPick, expanded, onExpand }) {
  const centre =
    task.latitude !== null
      ? [task.latitude, task.longitude]
      : [53.8008, -1.5491];

  return (
    <div
      onClick={expanded ? undefined : onExpand}
      className={
        // isolate keeps Leaflet's internal z-indexes from painting over the
        // detail panel and the profile menu.
        'isolate overflow-hidden rounded-2xl border border-stone-200 ' +
        'transition-all duration-500 ease-out ' +
        (expanded ? 'h-80' : 'h-32 cursor-pointer hover:border-stone-300')
      }
    >
      <MapContainer
        center={centre}
        zoom={expanded ? 14 : 12}
        className="h-full w-full"
        scrollWheelZoom={false}
        dragging={expanded}
        zoomControl={expanded}
        doubleClickZoom={expanded}
      >
        <TileLayer
          url={`https://api.maptiler.com/maps/dataviz-light/{z}/{x}/{y}.png?key=${MAP_KEY}`}
          attribution='&copy; <a href="https://www.maptiler.com/copyright/">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          // MapTiler serves 512px tiles; Leaflet assumes 256px, so it needs
          // telling, and the zoom offset keeps the scale honest.
          tileSize={512}
          zoomOffset={-1}
          maxZoom={20}
        />

        {expanded && <ClickHandler onPick={onPick} />}

        <Place point={task} colour={TASK_COLOUR} />
        {trigger && <Place point={trigger} colour={TRIGGER_COLOUR} />}
      </MapContainer>
    </div>
  );
}

export default memo(MapPicker);
export { TASK_COLOUR, TRIGGER_COLOUR };
