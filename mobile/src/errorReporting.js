import * as Sentry from '@sentry/react-native';
import * as Updates from 'expo-updates';

// Crash and error reports from the app go to Sentry (sentry.io, stored in the
// EU), so problems on testers' and users' phones are seen without anyone
// having to report them.
//
// Off while developing, and off in any build made without a DSN (the
// EXPO_PUBLIC_SENTRY_DSN variable on Expo's servers). Kept to the minimum the
// privacy policy describes: no IP address or other personal details
// (sendDefaultPii false), no screen recordings, no performance tracing. A
// report carries the error, where in the code it happened, the app version and
// the phone's model and system version.
const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN ?? '';

export function startErrorReporting() {
  Sentry.init({
    dsn: DSN,
    enabled: !__DEV__ && DSN !== '',
    // "production" for Play Store builds, "preview" for test builds
    environment: Updates.channel || 'development',
    sendDefaultPii: false,
    tracesSampleRate: 0,
    attachScreenshot: false,
    attachViewHierarchy: false,
  });
}

// Wraps the app's root, so a crash anywhere in it is reported
export const withErrorReporting = Sentry.wrap;
