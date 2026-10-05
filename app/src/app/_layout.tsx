import React, { useEffect, useRef } from 'react';
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider, onlineManager } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View, Text, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import NetInfo from '@react-native-community/netinfo';
import PushNotificationsBridge from '@/components/PushNotificationsBridge';
import NetworkStatusToast from '@/components/NetworkStatusToast';
import { useColorScheme as useNativewindColorScheme } from 'nativewind';

// Safely import KeyboardProvider - it may not be linked in all environments
let KeyboardProvider: React.ComponentType<{ children: React.ReactNode }> | null = null;
try {
  const keyboardController = require('react-native-keyboard-controller');
  KeyboardProvider = keyboardController.KeyboardProvider;
} catch (error) {
  // KeyboardProvider not available - will use fallback
  console.warn('react-native-keyboard-controller not available, using fallback');
}
import { I18nManager } from 'react-native';
import { useAuthStore } from '@/lib/auth-store';
import { useSettingsStore, useTranslation } from '@/lib/settings-store';
import {
  useFonts,
  Cairo_400Regular,
  Cairo_500Medium,
  Cairo_600SemiBold,
  Cairo_700Bold,
} from '@expo-google-fonts/cairo';
import {
  getLinkedDoctors,
  getLinkedHospitals,
  getReports,
  getNotifications,
} from '@/lib/api';

export const unstable_settings = {
  initialRouteName: 'login',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// Keep layout direction fixed (LTR) regardless of device language.
I18nManager.allowRTL(false);
I18nManager.forceRTL(false);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      networkMode: 'always',
      staleTime: 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 1,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchInterval: false,
      refetchIntervalInBackground: false,
    },
  },
});

// Light theme for medical app - professional hospital look
const MedicalLightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#0891B2',
    background: '#F8FAFC',
    card: '#FFFFFF',
    text: '#0F172A',
    border: '#E2E8F0',
    notification: '#DC2626',
  },
};
const MedicalDarkTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#22D3EE',
    background: '#0B1220',
    card: '#0F172A',
    text: '#E2E8F0',
    border: '#1F2937',
    notification: '#F87171',
  },
};

function RootLayoutNav() {
  const router = useRouter();
  const segments = useSegments();
  const { t } = useTranslation();
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const isVerified = useAuthStore(s => Boolean(s.patient?.verified));
  const hasHydrated = useAuthStore(s => s.hasHydrated);
  const refreshProfile = useAuthStore(s => s.refreshProfile);
  const theme = useSettingsStore(s => s.theme);
  const isDark = theme === 'dark';

  useEffect(() => {
    if (!hasHydrated) return;
    const isPublicScreen = segments[0] === 'login' || segments[0] === 'reset-password';
    const isVerifyScreen = segments[0] === 'verify-id';

    if (!isAuthenticated) {
      if (!isPublicScreen) router.replace('/login');
    } else if (!isVerified) {
      // Nothing works until the national ID is verified (the backend enforces it too).
      if (!isVerifyScreen) router.replace('/verify-id');
    } else if (isPublicScreen || isVerifyScreen) {
      router.replace('/(tabs)');
    }
  }, [hasHydrated, isAuthenticated, isVerified, segments]);

  useEffect(() => {
    if (!hasHydrated || !isAuthenticated) return;
    void refreshProfile();
  }, [hasHydrated, isAuthenticated, refreshProfile]);

  return (
    <ThemeProvider value={isDark ? MedicalDarkTheme : MedicalLightTheme}>
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
          },
          headerTintColor: isDark ? '#E2E8F0' : '#0891B2',
          headerTitleStyle: {
            fontFamily: 'Cairo_600SemiBold',
            color: isDark ? '#E2E8F0' : '#0F172A',
          },
          contentStyle: {
            backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
          },
          headerBackTitle: t.back,
          headerShadowVisible: true,
          animation: 'slide_from_left',
        }}
      >
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="reset-password" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="verify-id" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen
          name="lab-code"
          options={{
            title: t.labCode,
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="notification-details"
          options={{
            title: t.notificationDetails,
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="doctor-details"
          options={{
            title: t.doctorDetails,
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="report-details"
          options={{
            title: t.reportDetails,
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="reports-list"
          options={{
            title: t.reports,
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="edit-profile"
          options={{
            title: t.editProfile,
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="notifications"
          options={{
            title: t.notifications,
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="settings"
          options={{
            title: t.settings,
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="hospitals"
          options={{
            title: t.supportedHospitals,
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="hospital-details"
          options={{
            title: t.hospitalDetails,
            presentation: 'card',
          }}
        />
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Cairo_400Regular,
    Cairo_500Medium,
    Cairo_600SemiBold,
    Cairo_700Bold,
  });
  const hasHydrated = useAuthStore(s => s.hasHydrated);
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const patient = useAuthStore(s => s.patient);
  const theme = useSettingsStore(s => s.theme);
  const nativewindScheme = useNativewindColorScheme();
  const colorScheme = nativewindScheme?.colorScheme;
  const setColorScheme = nativewindScheme?.setColorScheme;
  const rootBackgroundColor = theme === 'dark' ? '#0F172A' : '#F8FAFC';
  const wasOfflineRef = useRef(false);
  const warmCacheDoneRef = useRef(false);

  useEffect(() => {
    // Hide native splash early and render app-owned loading screen.
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  useEffect(() => {
    if (!hasHydrated || !isAuthenticated || !patient?.verified) {
      warmCacheDoneRef.current = false;
      return;
    }
    if (warmCacheDoneRef.current) return;
    warmCacheDoneRef.current = true;

    // Warm critical offline cache once after login/hydration.
    // Keys must match the ones the screens query, otherwise every screen
    // refetches from scratch (issue 5).
    const patientScope = patient?.id || patient?.mrn || 'guest';
    void Promise.allSettled([
      queryClient.prefetchQuery({ queryKey: ['linked-doctors', patientScope], queryFn: () => getLinkedDoctors() }),
      queryClient.prefetchQuery({ queryKey: ['linked-hospitals'], queryFn: getLinkedHospitals }),
      queryClient.prefetchQuery({ queryKey: ['reports'], queryFn: () => getReports({}) }),
      queryClient.prefetchQuery({ queryKey: ['notifications'], queryFn: () => getNotifications({}) }),
    ]);
  }, [hasHydrated, isAuthenticated, patient]);

  useEffect(() => {
    if (fontsLoaded && hasHydrated) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, hasHydrated]);

  useEffect(() => {
    const nextScheme = theme === 'dark' ? 'dark' : 'light';
    if (!setColorScheme) return;
    if (colorScheme !== nextScheme) {
      setColorScheme(nextScheme);
    }
  }, [theme, colorScheme, setColorScheme]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const isOnline = Boolean(state.isConnected) && state.isInternetReachable !== false;
      onlineManager.setOnline(isOnline);

      if (!isOnline) {
        wasOfflineRef.current = true;
        return;
      }
      if (wasOfflineRef.current) {
        wasOfflineRef.current = false;
        queryClient.invalidateQueries().catch(() => {});
      }
    });

    return unsubscribe;
  }, []);

  if (!fontsLoaded || !hasHydrated) {
    return (
      <LinearGradient
        colors={theme === 'dark' ? ['#0B1220', '#0F172A', '#111827'] : ['#0891B2', '#0E7490', '#164E63']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
      >
        <View
          style={{
            width: 112,
            height: 112,
            borderRadius: 28,
            backgroundColor: '#FFFFFF',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
            shadowColor: '#000',
            shadowOpacity: 0.2,
            shadowRadius: 12,
            elevation: 8,
          }}
        >
          <Text
            style={{
              fontWeight: '700',
              fontSize: 34,
              color: '#0D9488',
            }}
          >
            Cure
          </Text>
        </View>
        <Text
          style={{
            fontWeight: '700',
            fontSize: 26,
            color: '#FFFFFF',
            marginBottom: 6,
          }}
        >
          Cure
        </Text>
        <Text
          style={{
            fontWeight: '500',
            fontSize: 15,
            color: 'rgba(255,255,255,0.88)',
            marginBottom: 18,
          }}
        >
          Patient Portal
        </Text>
        <ActivityIndicator size="small" color="#E2E8F0" />
      </LinearGradient>
    );
  }

  const Content = (
    <>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      <PushNotificationsBridge />
      <RootLayoutNav />
      <NetworkStatusToast />
    </>
  );

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: rootBackgroundColor }}>
        {KeyboardProvider ? (
          <KeyboardProvider>
            <View className={theme === 'dark' ? 'dark flex-1' : 'flex-1'}>
              {Content}
            </View>
          </KeyboardProvider>
        ) : (
          <View className={theme === 'dark' ? 'dark flex-1' : 'flex-1'}>
            {Content}
          </View>
        )}
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
