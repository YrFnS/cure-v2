import { Tabs } from "expo-router";
import {
  CalendarDays,
  House,
  UserRound,
  UsersRound,
} from "lucide-react-native";
import { useTranslation } from "@/lib/settings-store";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export const unstable_settings = { initialRouteName: "home" };

export default function TabsLayout() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      initialRouteName="home"
      screenOptions={{
        headerStyle: { backgroundColor: "#f0f4ff" },
        headerShadowVisible: false,
        headerTintColor: "#3F51B5",
        headerTitleStyle: { fontFamily: "CairoBold" },
        tabBarActiveTintColor: "#5c85d9",
        tabBarInactiveTintColor: "#667085",
        tabBarLabelStyle: {
          fontFamily: "CairoSemiBold",
          fontSize: 11,
          lineHeight: 22,
          height: 22,
          flexShrink: 0,
        },
        tabBarStyle: {
          backgroundColor: "white",
          borderTopColor: "#e3e9f6",
          height: 72 + insets.bottom,
          paddingTop: 6,
          paddingBottom: Math.max(insets.bottom, 8),
        },
        sceneStyle: { backgroundColor: "#f0f4ff" },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: t.home,
          tabBarIcon: ({ color, size }) => <House color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: t.bookings,
          tabBarIcon: ({ color, size }) => (
            <CalendarDays color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="patients"
        options={{
          title: t.patients,
          headerStyle: { backgroundColor: "#5c85d9" },
          headerTintColor: "white",
          tabBarIcon: ({ color, size }) => (
            <UsersRound color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t.profile,
          tabBarIcon: ({ color, size }) => (
            <UserRound color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
