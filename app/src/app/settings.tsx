import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Switch,
  Alert,
  Linking,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import * as Application from 'expo-application';
import Constants from 'expo-constants';
import {
  Bell,
  Shield,
  FileText,
  Info,
  LogOut,
  ChevronLeft,
  Globe,
  Trash2,
  User,
} from 'lucide-react-native';
import { FadeInDownView } from '@/components/FadeInDownView';
import { useAuthStore } from '@/lib/auth-store';
import { useSettingsStore, useTranslation } from '@/lib/settings-store';

export default function SettingsScreen() {
  const router = useRouter();
  const logout = useAuthStore(s => s.logout);
  const notificationsEnabled = useSettingsStore(s => s.notificationsEnabled);
  const toggleNotifications = useSettingsStore(s => s.toggleNotifications);
  const theme = useSettingsStore(s => s.theme);
  const toggleTheme = useSettingsStore(s => s.toggleTheme);
  const language = useSettingsStore(s => s.language);
  const setLanguage = useSettingsStore(s => s.setLanguage);
  const { t } = useTranslation();
  const appVersion =
    Application.nativeApplicationVersion ??
    Constants.expoConfig?.version ??
    '1.0.0';
  const buildVersion =
    Application.nativeBuildVersion ??
    Constants.expoConfig?.android?.versionCode?.toString() ??
    Constants.expoConfig?.ios?.buildNumber ??
    '';
  const versionText = buildVersion
    ? `${t.version} ${appVersion} (${buildVersion})`
    : `${t.version} ${appVersion}`;
  const openLegalLink = (url: string) =>
    Linking.openURL(url).catch(() => Alert.alert(t.error, t.connectionFailed));

  const handleLogout = () => {
    Alert.alert(
      t.logout,
      t.logoutConfirm,
      [
        { text: t.no, style: 'cancel' },
        {
          text: t.yes,
          style: 'destructive',
          onPress: () => {
            logout();
            router.replace('/login');
          },
        },
      ]
    );
  };

  const settingsItems = [
    {
      icon: User,
      label: t.editProfile,
      color: '#0891B2',
      bg: '#DBEAFE',
      onPress: () => router.push('/edit-profile'),
      showArrow: true,
    },
    {
      icon: Bell,
      label: t.enableNotifications,
      color: '#D97706',
      bg: '#FEF3C7',
      isSwitch: true,
      switchValue: notificationsEnabled,
      onSwitch: toggleNotifications,
    },
    {
      icon: Info,
      label: t.darkMode,
      color: '#0EA5E9',
      bg: '#E0F2FE',
      isSwitch: true,
      switchValue: theme === 'dark',
      onSwitch: toggleTheme,
    },
    {
      icon: Shield,
      label: t.privacyPolicy,
      color: '#059669',
      bg: '#D1FAE5',
      onPress: () => openLegalLink('https://e2next.com/privacy-policy'),
      showArrow: true,
    },
    {
      icon: FileText,
      label: t.termsOfService,
      color: '#7C3AED',
      bg: '#EDE9FE',
      onPress: () => openLegalLink('https://e2next.com/terms-and-conditions'),
      showArrow: true,
    },
    {
      icon: Trash2,
      label: t.requestAccountDeletion,
      color: '#DC2626',
      bg: '#FEE2E2',
      onPress: () => openLegalLink('https://e2next.com/privacy-policy#p9'),
      showArrow: true,
    },
    {
      icon: Info,
      label: t.aboutApp,
      value: versionText,
      color: '#64748B',
      bg: '#F1F5F9',
      onPress: () => Alert.alert(t.aboutApp, t.aboutAppBody.replace('{version}', versionText)),
      showArrow: true,
    },
  ];

  return (
    <View className="flex-1 bg-gray-50 dark:bg-slate-900">
      <Stack.Screen
        options={{
          title: t.settings,
          headerStyle: { backgroundColor: theme === 'dark' ? '#0F172A' : '#FFFFFF' },
          headerTintColor: theme === 'dark' ? '#E2E8F0' : '#0F172A',
          headerTitleStyle: { fontFamily: 'Cairo_700Bold', fontSize: 18 },
          headerShadowVisible: false,
        }}
      />
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Language Selector */}
        <FadeInDownView
          delay={50} duration={500}
          className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden mb-6"
          style={{
            shadowColor: '#000',
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 2,
          }}
        >
          <View className="flex-row items-center p-4 border-b border-gray-100 dark:border-slate-700">
            <Text
              style={{ fontFamily: 'Cairo_600SemiBold', fontSize: 17 }}
              className="text-gray-800 dark:text-slate-100 flex-1 text-right mx-3"
            >
              {t.language}
            </Text>
            <View
              className="w-12 h-12 rounded-xl items-center justify-center"
              style={{ backgroundColor: '#DBEAFE' }}
            >
              <Globe size={24} color="#2563EB" />
            </View>
          </View>
          <View className="flex-row p-3 gap-3">
            <Pressable
              onPress={() => setLanguage('en')}
              className={`flex-1 py-3 rounded-xl items-center ${
                language === 'en'
                  ? 'bg-teal-600'
                  : 'bg-gray-100 dark:bg-slate-700'
              }`}
            >
              <Text
                style={{ fontFamily: 'Cairo_600SemiBold', fontSize: 16 }}
                className={language === 'en' ? 'text-white' : 'text-gray-700 dark:text-slate-300'}
              >
                English
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setLanguage('ar')}
              className={`flex-1 py-3 rounded-xl items-center ${
                language === 'ar'
                  ? 'bg-teal-600'
                  : 'bg-gray-100 dark:bg-slate-700'
              }`}
            >
              <Text
                style={{ fontFamily: 'Cairo_600SemiBold', fontSize: 16 }}
                className={language === 'ar' ? 'text-white' : 'text-gray-700 dark:text-slate-300'}
              >
                العربية
              </Text>
            </Pressable>
          </View>
        </FadeInDownView>

        {/* Settings Items */}
        <FadeInDownView
          delay={100} duration={500}
          className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden mb-6"
          style={{
            shadowColor: '#000',
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 2,
          }}
        >
          {settingsItems.map((item, index) => (
            <View key={index}>
              <Pressable
                onPress={item.onPress}
                className={`flex-row items-center p-4 ${
                  index !== settingsItems.length - 1
                    ? 'border-b border-gray-100 dark:border-slate-700'
                    : ''
                }`}
              >
                {item.showArrow && (
                  <ChevronLeft size={20} color={theme === 'dark' ? '#94A3B8' : '#94A3B8'} />
                )}

                {item.isSwitch ? (
                  <Switch
                    value={item.switchValue}
                    onValueChange={item.onSwitch}
                    trackColor={{ false: theme === 'dark' ? '#334155' : '#E2E8F0', true: '#0891B2' }}
                    thumbColor="#FFFFFF"
                  />
                ) : item.value ? (
                  <Text
                    style={{ fontFamily: 'Cairo_500Medium', fontSize: 14 }}
                    className="text-gray-500 dark:text-slate-400"
                  >
                    {item.value}
                  </Text>
                ) : null}

                <Text
                  style={{ fontFamily: 'Cairo_600SemiBold', fontSize: 17 }}
                  className="text-gray-800 dark:text-slate-100 flex-1 text-right mx-3"
                >
                  {item.label}
                </Text>
                <View
                  className="w-12 h-12 rounded-xl items-center justify-center"
                  style={{ backgroundColor: item.bg }}
                >
                  <item.icon size={24} color={item.color} />
                </View>
              </Pressable>
            </View>
          ))}
        </FadeInDownView>

        {/* Logout Button */}
        <FadeInDownView
          delay={200} duration={500}
        >
          <Pressable
            onPress={handleLogout}
            className="bg-red-100 dark:bg-red-900/30 rounded-2xl p-5 flex-row items-center justify-center active:opacity-80"
          >
            <Text
              style={{ fontFamily: 'Cairo_700Bold', fontSize: 18 }}
              className="text-red-600 dark:text-red-400 mr-3"
            >
              {t.logout}
            </Text>
            <LogOut size={24} color="#DC2626" />
          </Pressable>
        </FadeInDownView>

        {/* App Info */}
        <FadeInDownView
          delay={300} duration={500}
          className="mt-8 items-center"
        >
          <Text
            style={{ fontFamily: 'Cairo_700Bold', fontSize: 24 }}
            className="text-teal-600 dark:text-teal-400"
          >
            {t.cure}
          </Text>
          <Text
            style={{ fontFamily: 'Cairo_500Medium', fontSize: 14 }}
            className="text-gray-500 dark:text-slate-400 mt-1"
          >
            {t.patientPortal}
          </Text>
          <Text
            style={{ fontFamily: 'Cairo_400Regular', fontSize: 12 }}
            className="text-gray-400 dark:text-slate-500 mt-2"
          >
            {t.e2nextHospitals}
          </Text>
        </FadeInDownView>
      </ScrollView>
    </View>
  );
}
