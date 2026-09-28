import { useState, useEffect } from 'react';
import { getNearbyTasks } from './api';

// Distance in metres between two points on the globe. The same Haversine the
// backend uses to decide what counts as nearby — repeated here only so the list
// can say how far away something is.
function distanceBetween(fromLat, fromLon, toLat, toLon) {
    const EARTH_RADIUS_METRES = 6371000;
    const toRadians = degrees => (degrees * Math.PI) / 180;

    const latitudeDifference = toRadians(toLat - fromLat);
    const longitudeDifference = toRadians(toLon - fromLon);

    const a =
        Math.sin(latitudeDifference / 2) ** 2 +
        Math.cos(toRadians(fromLat)) *
            Math.cos(toRadians(toLat)) *
            Math.sin(longitudeDifference / 2) ** 2;

    return EARTH_RADIUS_METRES * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const GEOLOCATION_ERRORS = {
    1: 'Location permission was denied. You can allow it in your browser settings.',
    2: 'Your location is not available right now.',
    3: 'Finding your location took too long.',
};

function NearMe({ refreshKey, onOpen }) {
    const [coords, setCoords] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [status, setStatus] = useState('idle');
    const [error, setError] = useState('');

    const locate = () => {
        if (!navigator.geolocation) {
            setError('This browser cannot report your location.');
            setStatus('error');
            return;
        }

        setStatus('locating');
        setError('');

        navigator.geolocation.getCurrentPosition(
            position =>
                setCoords({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                }),
            failure => {
                setError(GEOLOCATION_ERRORS[failure.code] ?? 'Could not get your location.');
                setStatus('error');
            },
            // A slightly stale fix is fine and much faster than insisting on a new one
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
        );
    };

    useEffect(() => {
        if (!coords) return;

        let current = true;

        getNearbyTasks(coords.latitude, coords.longitude)
            .then(result => {
                if (!current) return;
                setTasks(result);
                setStatus('ready');
            })
            .catch(err => {
                if (!current) return;
                setError(err.message);
                setStatus('error');
            });

        return () => {
            current = false;
        };
    }, [coords, refreshKey]);

    return (
        <section>
            <div className="mb-4 flex items-baseline justify-between gap-4">
                <h2 className="text-xs font-medium uppercase tracking-widest text-stone-400">
                    Near me
                </h2>

                {status !== 'idle' && (
                    <button
                        type="button"
                        onClick={locate}
                        className="text-xs text-stone-400 underline underline-offset-2
                                   transition-colors hover:text-stone-600"
                    >
                        Refresh
                    </button>
                )}
            </div>

            {status === 'idle' && (
                <button
                    type="button"
                    onClick={locate}
                    className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5
                               text-sm text-stone-600 transition-all duration-200
                               hover:border-stone-300 hover:text-stone-900 active:scale-[0.99]"
                >
                    Check what&rsquo;s around me
                </button>
            )}

            {status === 'locating' && (
                <p className="text-sm text-stone-400">Finding you…</p>
            )}

            {status === 'error' && <p className="text-sm text-red-600">{error}</p>}

            {status === 'ready' &&
                (tasks.length === 0 ? (
                    <p className="text-sm text-stone-400">Nothing within range of you.</p>
                ) : (
                    <ul className="space-y-2">
                        {tasks.map(task => {
                            const metres = Math.round(
                                distanceBetween(
                                    coords.latitude,
                                    coords.longitude,
                                    task.latitude,
                                    task.longitude,
                                ),
                            );

                            return (
                                <li key={task.id}>
                                    <button
                                        type="button"
                                        onClick={() => onOpen(task)}
                                        className="flex w-full items-center justify-between gap-3 rounded-2xl
                                                   border border-stone-800 bg-stone-800 px-4 py-3 text-left
                                                   transition-all duration-200 hover:bg-stone-700"
                                    >
                                        <span className="truncate text-sm text-white">{task.name}</span>
                                        <span className="flex-none text-xs text-stone-400">
                                            {metres}m away
                                        </span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                ))}
        </section>
    );
}

export default NearMe;
