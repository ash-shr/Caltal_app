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
    const hasPosition = latitude !== null && longitude !== null;
    const centre = hasPosition ? [latitude, longitude] : [53.8008, -1.5491];

    return (
        <div className="space-y-3">
            <div className="h-64 overflow-hidden rounded-xl border border-stone-200">
                <MapContainer
                    center={centre}
                    zoom={13}
                    zoomControl={false}
                    className="h-full w-full"
                    scrollWheelZoom={true}
                >
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />

                    <ClickHandler onPick={onPick} />

                    {hasPosition && (
                        <>
                            <Marker position={[latitude, longitude]} icon={icon} />
                            <Circle
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
                        step="50"
                        value={radius}
                        onChange={e => onRadiusChange(parseInt(e.target.value))}
                        className="flex-1 accent-stone-800"
                    />
                    <span className="w-16 text-right text-sm text-stone-500">{radius}m</span>
                </div>
            ) : (
                <p className="text-sm text-stone-400">Click the map to set a location.</p>
            )}
        </div>
    );
}

export default MapPicker;