// Expo's usual Metro setup, with Sentry's addition: it stamps each bundle and
// its source map with a matching ID, so error reports from the app can be
// turned back into readable file names and line numbers.
const { getSentryExpoConfig } = require('@sentry/react-native/metro');

module.exports = getSentryExpoConfig(__dirname);
