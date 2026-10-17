import React from 'react';
import { Tabs, useRouter } from 'expo-router';
import { View, Text, Pressable, Platform } from 'react-native';
import {
  Home,
  Stethoscope,
  FileText,
  User,
  Lock,
  ShieldCheck,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '@/lib/auth-store';
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
  const tabBarHeight = 62 + bottomInset;
  const isVerified = useAuthStore(s => Boolean(s.patient?.verified));
  const router = useRouter();

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
            borderTopColor: isDark ? '#1F2937' : '#E2E8F0',
            borderTopWidth: 1,
            height: tabBarHeight,
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
      {/* New accounts enter the app straight after the WhatsApp code, but every tab stays locked
          until the national ID is verified. */}
      {!isVerified ? (
        <View
          className="absolute left-0 right-0 top-0 items-center justify-center px-6 bg-slate-50/95 dark:bg-slate-900/95"
          style={{ bottom: tabBarHeight }}
        >
          <View
            className="bg-white dark:bg-slate-800 rounded-3xl p-6 items-center w-full max-w-[380px]"
            style={{ shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 12, elevation: 8 }}
          >
            <View className="w-16 h-16 rounded-2xl bg-cyan-100 dark:bg-cyan-900/30 items-center justify-center mb-4">
              <Lock size={32} color="#0891B2" />
            </View>
            <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 20 }} className="text-slate-900 dark:text-slate-100 text-center">
              {t.accountLocked}
            </Text>
            <Text style={{ fontFamily: 'Cairo_500Medium', fontSize: 15, lineHeight: 24 }} className="text-slate-500 dark:text-slate-400 text-center mt-2">
              {t.accountLockedHint}
            </Text>
            <Pressable
              onPress={() => router.push('/verify-id')}
              className="mt-5 bg-medical-primary rounded-2xl px-8 py-3 flex-row items-center active:opacity-80"
            >
              <ShieldCheck size={18} color="#FFFFFF" />
              <Text style={{ fontFamily: 'Cairo_600SemiBold' }} className="text-white ml-2">
                {t.verifyNow}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}
