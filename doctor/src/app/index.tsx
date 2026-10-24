import { useRef, useState } from "react";
import { Image, ScrollView, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Redirect, router } from "expo-router";
import { useAuthStore } from "@/lib/auth-store";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";
import { Button, Row, T } from "@/components/ui";
import { LanguageButton } from "@/components/language-button";
import { useTranslation } from "@/lib/settings-store";

const images = [
  require("../../assets/images/welcome-patients.png"),
  require("../../assets/images/welcome-bookings.png"),
  require("../../assets/images/welcome-care.png"),
];
export default function Welcome() {
  const { t, isRTL } = useTranslation();
  const [page, setPage] = useState<number>(0);
  const carousel = useRef<ScrollView>(null);
  const { width } = useWindowDimensions();
  const authenticated = useAuthStore((s) => s.authenticated);
  const slideWidth = width - 40;
  const titles = [t.welcome1, t.welcome2, t.welcome3];
  const bodies = [t.welcomeBody1, t.welcomeBody2, t.welcomeBody3];
  if (authenticated) return <Redirect href="/(tabs)/home" />;
  return (
    <SafeAreaView
      className="flex-1 bg-white"
      style={{ direction: isRTL ? "rtl" : "ltr" }}
    >
      <Svg
        height={160}
        width="100%"
        viewBox="0 0 400 160"
        preserveAspectRatio="none"
        style={{ position: "absolute", top: 0 }}
      >
        <Defs>
          <LinearGradient id="wave" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#e3e9f6" />
            <Stop offset="1" stopColor="#f0f4ff" />
          </LinearGradient>
        </Defs>
        <Path
          d="M0 0H400V110Q300 145 200 112Q100 80 0 120Z"
          fill="url(#wave)"
        />
      </Svg>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, padding: 20, gap: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <Row className="justify-between">
          <Image
            source={require("../../assets/images/logo.png")}
            style={{ width: 56, height: 56 }}
            resizeMode="contain"
            accessibilityLabel={t.appName}
          />
          <LanguageButton />
          <Button
            title={t.skip}
            variant="secondary"
            onPress={() => router.push("/login")}
          />
        </Row>
        <View className="flex-1 justify-center" style={{ direction: "ltr" }}>
          <ScrollView
            ref={carousel}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            style={{ flexGrow: 0 }}
            onMomentumScrollEnd={(event) =>
              setPage(
                Math.round(event.nativeEvent.contentOffset.x / slideWidth),
              )
            }
          >
            {images.map((source, index) => (
              <View
                key={index}
                style={{
                  width: slideWidth,
                  direction: isRTL ? "rtl" : "ltr",
                  gap: 24,
                  paddingVertical: 20,
                }}
              >
                <Image
                  source={source}
                  style={{ width: "100%", height: Math.min(width * 0.7, 330) }}
                  resizeMode="contain"
                  accessibilityLabel={titles[index]}
                />
                <T className="text-center font-din text-3xl text-indigo">
                  {titles[index]}
                </T>
                <T className="px-3 text-center text-muted">{bodies[index]}</T>
              </View>
            ))}
          </ScrollView>
        </View>
        <Row className="justify-center">
          {images.map((_, index) => (
            <View
              key={index}
              className={
                index === page
                  ? "h-2 w-10 rounded-full bg-primary"
                  : "h-2 w-2 rounded-full bg-soft"
              }
            />
          ))}
        </Row>
        {page < 2 ? (
          <Button
            title={t.next}
            onPress={() => {
              carousel.current?.scrollTo({
                x: (page + 1) * slideWidth,
                animated: true,
              });
              setPage(page + 1);
            }}
          />
        ) : (
          <View className="gap-3">
            <Button title={t.login} onPress={() => router.push("/login")} />
            <Button
              title={t.register}
              variant="secondary"
              onPress={() => router.push("/register")}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
