import { useState, useEffect, useRef } from 'react';
import { getNearbyTasks } from './api';

// Distance in metres between two points on the globe. The same Haversine the
// backend uses to decide what counts as nearby — repeated here only to show how
// far away something is, and to ignore tiny GPS jitter.
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

// GPS wobbles by a few metres even when still. Refetching on every wobble would
// hammer the API for nothing, so ignore movement smaller than this.
const SIGNIFICANT_MOVE_METRES = 25;

function NearMe({ refreshKey, onOpen }) {
    const [coords, setCoords] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [status, setStatus] = useState('idle');
    const [error, setError] = useState('');
    const [watching, setWatching] = useState(false);

    // Refs, not state: changing these should never cause a render.
    const watchId = useRef(null);
    const lastFix = useRef(null);
    const alreadyAnnounced = useRef(null);

    const stop = () => {
        if (watchId.current !== null) {
            navigator.geolocation.clearWatch(watchId.current);
            watchId.current = null;
        }
        setWatching(false);
    };

    const start = () => {
        if (!navigator.geolocation) {
            setError('This browser cannot report your location.');
            setStatus('error');
            return;
        }

        // Ask once, up front. Browsers ignore this unless a click triggered it.
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }

        setStatus('locating');
        setError('');
        setWatching(true);

        watchId.current = navigator.geolocation.watchPosition(
            position => {
                const next = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                };

                const previous = lastFix.current;

                // Only refetch once we've actually moved somewhere
                if (
                    previous &&
                    distanceBetween(
                        previous.latitude,
                        previous.longitude,
                        next.latitude,
                        next.longitude,
                    ) < SIGNIFICANT_MOVE_METRES
                ) {
                    return;
                }

                lastFix.current = next;
                setCoords(next);
            },
            failure => {
                setError(GEOLOCATION_ERRORS[failure.code] ?? 'Could not get your location.');
                setStatus('error');
                stop();
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
        );
    };

    // Stop watching if the component ever goes away, so the GPS isn't left on.
    useEffect(() => {
        return () => {
            if (watchId.current !== null) {
                navigator.geolocation.clearWatch(watchId.current);
                watchId.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (!coords) return;

        let current = true;

        getNearbyTasks(coords.latitude, coords.longitude)
            .then(result => {
                if (!current) return;

                if (alreadyAnnounced.current === null) {
                    alreadyAnnounced.current = new Set();
                }

                const announced = alreadyAnnounced.current;

                // Anything that wasn't in range last time has just come into range
                result
                    .filter(task => !announced.has(task.id))
                    .forEach(task => {
                        announced.add(task.id);

                        if ('Notification' in window && Notification.permission === 'granted') {
                            new Notification(task.name, {
                                body: 'You are near this one.',
                                tag: `caltal-task-${task.id}`,
                            });
                        }
                    });

                // Forget anything now out of range, so it can announce again later
                const inRange = new Set(result.map(task => task.id));
                announced.forEach(id => {
                    if (!inRange.has(id)) announced.delete(id);
                });

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

                {watching && (
                    <button
                        type="button"
                        onClick={stop}
                        className="flex items-center gap-1.5 text-xs text-stone-400
                                   transition-colors hover:text-stone-600"
                    >
                        <span className="relative flex h-1.5 w-1.5">
                            <span className="absolute inline-flex h-full w-full animate-ping
                                             rounded-full bg-stone-400 opacity-75" />
                            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-stone-500" />
                        </span>
                        Stop
                    </button>
                )}
            </div>

            {!watching && status !== 'error' && (
                <button
                    type="button"
                    onClick={start}
                    className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5
                               text-sm text-stone-600 transition-all duration-200
                               hover:border-stone-300 hover:text-stone-900 active:scale-[0.99]"
                >
                    Watch for tasks around me
                </button>
            )}

            {status === 'locating' && (
                <p className="text-sm text-stone-400">Finding you…</p>
            )}

            {status === 'error' && (
                <div>
                    <p className="text-sm text-red-600">{error}</p>
                    <button
                        type="button"
                        onClick={start}
                        className="mt-2 text-xs text-stone-500 underline underline-offset-2
                                   transition-colors hover:text-stone-800"
                    >
                        Try again
                    </button>
                </div>
            )}

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
