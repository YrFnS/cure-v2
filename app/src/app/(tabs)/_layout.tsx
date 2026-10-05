import React from 'react';
import { Tabs } from 'expo-router';
import { View, Platform } from 'react-native';
import {
  Home,
  Stethoscope,
  FileText,
  User,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSettingsStore, useTranslation } from '@/lib/settings-store';

// Anchor the tabs navigator to Home so returning into (tabs) lands on Home,
// not the first-declared screen (profile). The Tabs.Screen declaration order
// below stays unchanged — it is the visible tab-bar order.
export const unstable_settings = {
  initialRouteName: 'index',
};

function TabBarIcon({
  icon: Icon,
  focused,
  isDark,
}: {
  icon: React.ComponentType<{ size: number; color: string; strokeWidth: number }>;
  focused: boolean;
  isDark: boolean;
}) {
  return (
    <View
      className={`items-center justify-center rounded-xl px-4 py-2 ${
        focused ? 'bg-medical-primary/10 dark:bg-slate-700/40' : ''
      }`}
    >
      <Icon
        size={24}
        color={focused ? '#0891B2' : isDark ? '#64748B' : '#94A3B8'}
        strokeWidth={focused ? 2 : 1.5}
      />
    </View>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const theme = useSettingsStore(s => s.theme);
  const { t } = useTranslation();
  const isDark = theme === 'dark';
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 8 : 0);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
          borderTopColor: isDark ? '#1F2937' : '#E2E8F0',
          borderTopWidth: 1,
          height: 62 + bottomInset,
          paddingTop: 8,
          paddingBottom: bottomInset,
        },
        tabBarActiveTintColor: '#0891B2',
        tabBarInactiveTintColor: isDark ? '#64748B' : '#94A3B8',
        tabBarLabelStyle: {
          fontFamily: 'Cairo_500Medium',
          fontSize: 11,
          marginTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="profile"
        options={{
          title: t.account,
          tabBarIcon: ({ focused }) => (
            <TabBarIcon icon={User} focused={focused} isDark={isDark} />
          ),
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: t.reports,
          tabBarIcon: ({ focused }) => (
            <TabBarIcon icon={FileText} focused={focused} isDark={isDark} />
          ),
        }}
      />
      <Tabs.Screen
        name="doctors"
        options={{
          title: t.doctors,
          tabBarIcon: ({ focused }) => (
            <TabBarIcon icon={Stethoscope} focused={focused} isDark={isDark} />
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: t.home,
          tabBarIcon: ({ focused }) => (
            <TabBarIcon icon={Home} focused={focused} isDark={isDark} />
          ),
        }}
      />
    </Tabs>
  );
}
