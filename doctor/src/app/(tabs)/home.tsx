import { Image, Pressable, RefreshControl, View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { api } from "@/lib/api";
import { localDate } from "@/lib/validation";
import { useTranslation } from "@/lib/settings-store";
import { Card, QueryState, Row, Screen, T } from "@/components/ui";
import { Avatar } from "@/components/avatar";
import { LogoutButton } from "@/components/logout-button";
import { LanguageButton } from "@/components/language-button";

export default function Home() {
  const { t, language } = useTranslation();
  const date = localDate();
  const profile = useQuery({
    queryKey: ["doctor"],
    queryFn: () => api.profile(),
  });
  const stats = useQuery({
    queryKey: ["stats", date],
    queryFn: () => api.stats(date),
  });
  const name = profile.data
    ? language === "ar" && profile.data.nameAr
      ? profile.data.nameAr
      : `${profile.data.firstName} ${profile.data.lastName}`
    : "";
  return (
    <Screen
      refreshControl={
        <RefreshControl
          refreshing={profile.isRefetching || stats.isRefetching}
          onRefresh={() => {
            void profile.refetch();
            void stats.refetch();
          }}
          tintColor="#5c85d9"
        />
      }
    >
      <Row className="justify-between">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.profile}
          onPress={() => router.push("/(tabs)/profile")}
        >
          <Avatar url={profile.data?.photoUrl ?? null} name={name} />
        </Pressable>
        <LanguageButton />
      </Row>
      <QueryState query={profile} />
      {profile.data && (
        <View className="gap-2">
          <T className="font-bold text-2xl">
            {new Date().getHours() < 12 ? t.morning : t.evening}،{" "}
            <T className="font-bold text-2xl text-primary">
              {t.doctor} {name}
            </T>
          </T>
          <T className="text-sm text-muted">{t.homeIntro}</T>
        </View>
      )}
      <QueryState query={stats} />
      {stats.data && (
        <LinearGradient
          colors={["#5c85d9", "#3F51B5"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ padding: 25, borderRadius: 20, gap: 20 }}
        >
          <T className="font-bold text-lg text-white">{t.today}</T>
          <T className="text-sm text-white/80">{date}</T>
          <Row>
            <View className="flex-1 gap-2">
              <T className="text-center font-bold text-4xl text-white">
                {stats.data.patients}
              </T>
              <T className="text-center text-white">{t.patients}</T>
            </View>
            <View className="h-12 w-px bg-white/30" />
            <View className="flex-1 gap-2">
              <T className="text-center font-bold text-4xl text-white">
                {stats.data.appointments}
              </T>
              <T className="text-center text-white">{t.bookings}</T>
            </View>
          </Row>
        </LinearGradient>
      )}
      <T className="font-bold text-xl">{t.services}</T>
      <Row className="items-stretch">
        <Pressable
          className="flex-1"
          accessibilityRole="button"
          onPress={() => router.push("/(tabs)/bookings")}
        >
          <Card className="min-h-44 items-center justify-center gap-5">
            <View className="rounded-full bg-blue-50 p-4">
              <Image
                source={require("../../../assets/images/reservation.png")}
                style={{ width: 40, height: 40 }}
                resizeMode="contain"
                tintColor="#5c85d9"
              />
            </View>
            <T className="text-center font-semibold text-lg">{t.bookings}</T>
          </Card>
        </Pressable>
        <Pressable
          className="flex-1"
          accessibilityRole="button"
          onPress={() => router.push("/(tabs)/patients")}
        >
          <Card className="min-h-44 items-center justify-center gap-5">
            <View className="rounded-full bg-green-50 p-4">
              <Image
                source={require("../../../assets/images/user.png")}
                style={{ width: 40, height: 40 }}
                resizeMode="contain"
                tintColor="#4CAF50"
              />
            </View>
            <T className="text-center font-semibold text-lg">{t.patients}</T>
          </Card>
        </Pressable>
      </Row>
      <LogoutButton />
    </Screen>
  );
}
