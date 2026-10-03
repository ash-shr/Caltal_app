import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Splash from '../components/Splash';
import { SessionProvider, useSession } from '../session';
import { SettingsProvider } from '../settings';
import { colours } from '../theme';

// Keep the phone's own still splash up until the animated one is ready to
// take over, so there's no white flash in between.
SplashScreen.preventAutoHideAsync();

// The root layout wraps every screen in the app. Providers go here so that
// anything below can read the session and settings.
export default function RootLayout() {
  return (
    // Needed by anything that uses gestures — the bottom sheet, mainly.
    <GestureHandlerRootView style={styles.fill}>
      <SafeAreaProvider>
        <SettingsProvider>
          <SessionProvider>
            <RootNavigator />
          </SessionProvider>
        </SettingsProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function RootNavigator() {
  const { user, booting } = useSession();

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

      {booting && <Splash />}

      <StatusBar style="dark" />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colours.background },
});
