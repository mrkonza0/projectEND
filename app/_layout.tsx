import { UserProvider } from '@/context/UserContext';
import { clearSession, setUnauthorizedHandler } from '@/services/api';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { router, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { LogBox, Platform } from 'react-native';
import { API_URL as BASE_URL } from '@/config';

SplashScreen.preventAutoHideAsync();

// Development-only warnings emitted by React Navigation/Reanimated internals.
// Keep real application warnings and errors visible.
LogBox.ignoreLogs([
  '"shadow*" style props are deprecated',
  'props.pointerEvents is deprecated',
  '[Reanimated] Reduced motion setting is enabled',
]);

export const unstable_settings = {
  initialRouteName: 'login',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    // Auto-logout: any 401 during app use → wipe session → login
    setUnauthorizedHandler(async () => {
      await clearSession();
      router.replace('/login');
    });

    (async () => {
      try {
        let token: string | null = null;
        if (Platform.OS === 'web') {
          token = localStorage.getItem('token');
        } else {
          const { default: AS } = await import('@react-native-async-storage/async-storage');
          token = await AS.getItem('token');
        }

        if (!token) {
          // No token → stay on login
          return;
        }

        // Validate token with backend
        try {
          const ctrl = new AbortController();
          setTimeout(() => ctrl.abort(), 3000);
          const res = await fetch(`${BASE_URL}/me`, {
            headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
            signal: ctrl.signal,
          });
          if (res.status === 401) {
            // Token expired/invalid → clear and show login
            await clearSession();
            return;
          }
          // 200 or backend unreachable (network error caught below) → allow
          router.replace('/(tabs)');
        } catch {
          // Backend down → allow demo mode with existing token
          router.replace('/(tabs)');
        }
      } finally {
        SplashScreen.hideAsync();
      }
    })();
  }, []);

  return (
    <UserProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack initialRouteName="login">
          <Stack.Screen name="login"    options={{ headerShown: false }} />
          <Stack.Screen name="register" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)"   options={{ headerShown: false }} />
          <Stack.Screen name="modal"    options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </UserProvider>
  );
}
