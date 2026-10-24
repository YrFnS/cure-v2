import { useEffect } from "react";
import { View } from "react-native";
import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import {
  QueryClientProvider,
  useQuery,
  useMutation,
} from "@tanstack/react-query";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { API_MOCK } from "@/lib/api";
import {
  localLogout,
  queryClient,
  restoreSession,
  useAuthStore,
} from "@/lib/auth-store";
import { useSettingsStore, useTranslation } from "@/lib/settings-store";
import { Button, ErrorMessage, Notice, Skeleton, T } from "@/components/ui";

void SplashScreen.preventAutoHideAsync().catch(() => {});
export default function RootLayout() {
  const [loaded, fontError] = useFonts({
    DINArabic: require("../../assets/fonts/din-next-arabic.ttf"),
    CairoRegular: require("../../assets/fonts/cairo-regular.ttf"),
    CairoMedium: require("../../assets/fonts/cairo-medium.ttf"),
    CairoSemiBold: require("../../assets/fonts/cairo-semibold.ttf"),
    CairoBold: require("../../assets/fonts/cairo-bold.ttf"),
  });
  const settingsReady = useSettingsStore((s) => s.hydrated);
  useEffect(() => {
    if ((loaded || fontError) && settingsReady) void SplashScreen.hideAsync();
  }, [loaded, fontError, settingsReady]);
  if ((!loaded && !fontError) || !settingsReady) return null;
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <RootLayoutNav />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
function RootLayoutNav() {
  const session = useQuery({
    queryKey: ["session"],
    queryFn: restoreSession,
    retry: false,
    staleTime: Infinity,
  });
  const authenticated = useAuthStore((s) => s.authenticated);
  const local = useMutation({ mutationFn: localLogout });
  const { t, isRTL } = useTranslation();
  if (session.data === undefined)
    return (
      <SafeAreaView className="flex-1 bg-canvas p-6">
        <View className="gap-5" style={{ direction: isRTL ? "rtl" : "ltr" }}>
          <T className="font-bold text-2xl">{t.appName}</T>
          {session.error ? (
            <>
              <ErrorMessage message={session.error.message} />
              <Button
                title={t.retry}
                onPress={() => {
                  void session.refetch();
                }}
              />
              <ErrorMessage message={local.error?.message} />
              <Button
                title={t.localLogout}
                variant="secondary"
                pending={local.isPending}
                onPress={() => local.mutate()}
              />
            </>
          ) : session.fetchStatus === "paused" ? (
            <Notice message={t.offline} />
          ) : (
            <Skeleton />
          )}
        </View>
      </SafeAreaView>
    );
  return (
    <View className="flex-1" style={{ direction: isRTL ? "rtl" : "ltr" }}>
      <StatusBar style="dark" />
      {API_MOCK && (
        <SafeAreaView edges={["top"]} className="bg-soft">
          <T className="py-1 text-center text-xs text-indigo">{t.mock}</T>
        </SafeAreaView>
      )}
      <Stack
        screenOptions={{
          headerTitleStyle: { fontFamily: "CairoBold" },
          headerTintColor: "#3F51B5",
          headerStyle: { backgroundColor: "#f0f4ff" },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: "#f0f4ff" },
          headerBackTitle: t.back,
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Protected guard={!authenticated}>
          <Stack.Screen name="login" options={{ title: t.login }} />
          <Stack.Screen name="register" options={{ title: t.register }} />
        </Stack.Protected>
        <Stack.Protected guard={authenticated}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack.Protected>
      </Stack>
    </View>
  );
}
