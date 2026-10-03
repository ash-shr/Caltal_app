// The first file the app runs.
//
// The geofence task is registered here, before anything else, because the
// phone can start the app in the background just to say "they've arrived" —
// with no screen mounted at all. Code inside a component would never run then.
import './src/geofencing';

// Expo Router's own entry must come last: it starts the app from src/app/.
import 'expo-router/entry';
