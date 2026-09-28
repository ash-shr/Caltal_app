import { memo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Leaflet's default marker images don't survive bundling, so point at a CDN copy
const icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function ClickHandler({ onPick }) {
  useMapEvents({
    click(event) {
      onPick(event.latlng.lat, event.latlng.lng);
    },
  });

  return null;
}

function MapPicker({ latitude, longitude, radius, onPick, onRadiusChange }) {
  // A handle on the Leaflet circle itself, and on the label element, so a drag
  // can update both directly instead of going through a React render.
  const circleRef = useRef(null);
  const labelRef = useRef(null);

  const handleDrag = (event) => {
    const next = Number(event.target.value);

    if (circleRef.current) {
      circleRef.current.setRadius(next);
    }
    if (labelRef.current) {
      labelRef.current.textContent = `${next}m`;
    }
  };

  // React only learns the value once the drag finishes. In React, onChange on an
  // input fires on every movement, so the commit has to hang off release events.
  const handleCommit = (event) => {
    onRadiusChange(Number(event.target.value));
  };

  const hasPosition = latitude !== null && longitude !== null;
  const centre = hasPosition ? [latitude, longitude] : [53.8008, -1.5491];

  return (
    <div className="space-y-3">
      {/* isolate creates a stacking context, so Leaflet's internal z-indexes
          (panes ~400, controls ~800) stay inside the map instead of painting
          over things above it on the page, such as the detail panel backdrop. */}
      <div className="isolate h-64 overflow-hidden rounded-xl border border-stone-200">
        <MapContainer
          center={centre}
          zoom={13}
          className="h-full w-full"
          scrollWheelZoom={false}
        >
          <TileLayer
            // CARTO Positron: same pale, low-contrast style, and no API key needed.
            // Stadia requires a key on any domain other than localhost.
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          />

          <ClickHandler onPick={onPick} />

          {hasPosition && (
            <>
              <Marker position={[latitude, longitude]} icon={icon} />
              <Circle
                ref={circleRef}
                center={[latitude, longitude]}
                radius={radius}
                pathOptions={{
                  color: '#292524',
                  fillColor: '#292524',
                  fillOpacity: 0.08,
                  weight: 1,
                }}
              />
            </>
          )}
        </MapContainer>
      </div>

      {hasPosition ? (
        <div className="flex items-center gap-3">
          <input
            type="range"
            min="50"
            max="2000"
            step="10"
            key={radius}
            defaultValue={radius}
            onInput={handleDrag}
            onMouseUp={handleCommit}
            onTouchEnd={handleCommit}
            onKeyUp={handleCommit}
            className="flex-1 accent-stone-800"
          />
          <span ref={labelRef} className="w-16 text-right text-sm text-stone-500">
            {radius}m
          </span>
        </div>
      ) : (
        <p className="text-sm text-stone-400">Click the map to set a location.</p>
      )}
    </div>
  );
}

export default memo(MapPicker);