import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Splash from '../components/Splash';
import { startErrorReporting, withErrorReporting } from '../errorReporting';
import { SessionProvider, useSession } from '../session';
import { SettingsProvider } from '../settings';
import { colours } from '../theme';

// First, so an error anywhere after this is reported
startErrorReporting();

// Keep the phone's own still splash up until the animated one is ready to
// take over, so there's no white flash in between.
SplashScreen.preventAutoHideAsync();

// The root layout wraps every screen in the app. Providers go here so that
// anything below can read the session and settings.
export default withErrorReporting(RootLayout);

function RootLayout() {
  return (
    // Needed by anything that uses gestures — the bottom sheet, mainly.
    <GestureHandlerRootView style={styles.fill}>
      {/* Tracks the keyboard, so forms can keep the box being typed in above
          it. Android no longer shrinks the screen for the keyboard by itself
          now that apps draw edge to edge. */}
      <KeyboardProvider>
        <SafeAreaProvider>
          <SettingsProvider>
            <SessionProvider>
              <RootNavigator />
            </SessionProvider>
          </SettingsProvider>
        </SafeAreaProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}

function RootNavigator() {
  const { user, booting, waiting } = useSession();

  // The animated splash below is on screen from the very first render.
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <View style={styles.fill}>
      {/* Stack.Protected decides which screens exist. Signed in: the app
          screens in (app)/. Signed out: only sign-in. When `user` changes,
          Expo Router moves to the right one by itself. */}
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colours.background },
        }}
      >
        <Stack.Protected guard={user !== null}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>

        <Stack.Protected guard={user === null}>
          <Stack.Screen name="sign-in" />
        </Stack.Protected>
      </Stack>

      {/* Over everything, so it stays full screen while sign-in is swapped
          for the map underneath it */}
      {(booting || waiting) && <Splash />}

      <StatusBar style="dark" />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colours.background },
});
