import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

export default function RootLayout() {
  return (
    <ThemeProvider value={DefaultTheme}>
      <Stack>
        {/* Load the top-level index (landing) screen as the app entrypoint */}
        <Stack.Screen name="index" options={{ headerShown: false }} />
        {/* Main dashboard after auth */}
        <Stack.Screen name="dashboard" options={{ headerShown: false }} />
        {/* AI chat assistant */}
        <Stack.Screen name="chat" options={{ headerShown: false }} />
        {/* Detail screens */}
        <Stack.Screen name="prescriptions/[id]" options={{ title: 'Prescription' }} />
        <Stack.Screen name="reports/[id]" options={{ title: 'Lab Report' }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      {/* Dark content for light theme background */}
      <StatusBar style="dark" />
    </ThemeProvider>
  );
}
