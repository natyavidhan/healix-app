import {
  NotoSansDevanagari_400Regular,
  NotoSansDevanagari_500Medium,
  NotoSansDevanagari_600SemiBold,
  NotoSansDevanagari_700Bold,
} from '@expo-google-fonts/noto-sans-devanagari';
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { Text, TextInput } from 'react-native';
import 'react-native-reanimated';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    NotoSansDevanagari_400Regular,
    NotoSansDevanagari_500Medium,
    NotoSansDevanagari_600SemiBold,
    NotoSansDevanagari_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      // Apply default font to all Text and TextInput
      const baseText = (Text as any);
      baseText.defaultProps = baseText.defaultProps || {};
      baseText.defaultProps.style = [baseText.defaultProps.style, { fontFamily: 'NotoSansDevanagari_400Regular' }];

      const baseInput = (TextInput as any);
      baseInput.defaultProps = baseInput.defaultProps || {};
      baseInput.defaultProps.style = [baseInput.defaultProps.style, { fontFamily: 'NotoSansDevanagari_400Regular' }];

      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    console.log('Fonts not loaded yet');
    return null;
  }

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
