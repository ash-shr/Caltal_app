import { Stack } from 'expo-router';
import { PlacesProvider } from '../../places';
import { TasksProvider } from '../../tasks';
import { colours } from '../../theme';

// Everything a signed-in person can see. The task list and saved places are
// loaded here, once, and shared with every screen below. Signing out removes
// this whole group, so the next person never sees the last person's data.
export default function AppLayout() {
  return (
    <TasksProvider>
      <PlacesProvider>
        <Stack
          screenOptions={{
            headerTintColor: colours.ink,
            headerShadowVisible: false,
            headerStyle: { backgroundColor: colours.background },
            headerTitleStyle: { fontWeight: '600' },
            contentStyle: { backgroundColor: colours.background },
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="settings" options={{ title: 'Settings' }} />
          <Stack.Screen name="terms" options={{ title: 'Terms and conditions' }} />
          <Stack.Screen name="places" options={{ title: 'Saved places' }} />
        </Stack>
      </PlacesProvider>
    </TasksProvider>
  );
}
