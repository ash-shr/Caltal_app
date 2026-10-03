import { Stack } from 'expo-router';
import { TasksProvider } from '../../tasks';
import { colours } from '../../theme';

// Everything a signed-in person can see. The task list is loaded here, once,
// and shared with every screen below. Signing out removes this whole group,
// so the next person never sees the last person's tasks.
export default function AppLayout() {
  return (
    <TasksProvider>
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
      </Stack>
    </TasksProvider>
  );
}
