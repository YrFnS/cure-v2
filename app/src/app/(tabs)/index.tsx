import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import {
  Bell,
  QrCode,
  Stethoscope,
  FileText,
  FlaskConical,
  ChevronLeft,
  Building2,
  User,
} from 'lucide-react-native';
import { useAuthStore } from '@/lib/auth-store';
import { useTranslation } from '@/lib/settings-store';
import {
  getLinkedHospitals,
  getRecentNotifications,
  getUnreadCount,
} from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { resolveAssetUrl } from '@/lib/api/api';
import type { Notification } from '@/lib/types';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();
  const patient = useAuthStore(s => s.patient);
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const hasHydrated = useAuthStore(s => s.hasHydrated);
  const canFetch = hasHydrated && isAuthenticated;
  const [refreshing, setRefreshing] = useState(false);

  const { data: unread = { count: 0 }, refetch: refetchUnread } = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: getUnreadCount,
    enabled: canFetch,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnReconnect: true,
    refetchInterval: 3000,
    refetchIntervalInBackground: false,
  });
  const unreadNotifications = unread.count ?? 0;

  const { data: linkedHospitals = [], isLoading, refetch: refetchHospitals } = useQuery({
    queryKey: ['linked-hospitals'],
    queryFn: getLinkedHospitals,
    enabled: canFetch,
    staleTime: 2 * 60 * 1000,
    refetchOnMount: false,
  });
  const { data: recentNotifications = [], isLoading: isNotificationsLoading, refetch: refetchNotifications } = useQuery<Notification[]>({
    queryKey: ['notifications', 'recent'],
    queryFn: () => getRecentNotifications(3),
    enabled: canFetch,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnReconnect: true,
    refetchInterval: 3000,
    refetchIntervalInBackground: false,
  });
  const safeRecentNotifications = useMemo(() => {
    const normalized = recentNotifications.filter((item) => item && item.id);
    const seen = new Set();
    return normalized.filter((item) => {
      const actionType = String((item as any)?.actionType ?? '').trim();
      const actionId = String((item as any)?.actionId ?? '').trim();
      const key = actionType && actionId ? `action:${actionType}:${actionId}` : String(item.id);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [recentNotifications]);
  const connectedHospitalsCount = linkedHospitals.length;
  const patientImageUri = resolveAssetUrl(patient?.profileImage ?? '');

  const onRefresh = () => {
    setRefreshing(true);
    Promise.all([
      refetchUnread(),
      refetchHospitals(),
      refetchNotifications(),
    ]).finally(() => setRefreshing(false));
  };

  useFocusEffect(
    useCallback(() => {
      if (!canFetch) return;
      refetchUnread();
      refetchHospitals();
      refetchNotifications();
    }, [canFetch, refetchUnread, refetchHospitals, refetchNotifications])
  );

  const quickAccessItems = [
    {
      id: 'lab-code',
      title: t.labCode,
      icon: QrCode,
      color: '#0891B2',
      bg: '#CFFAFE',
      onPress: () => router.push('/lab-code'),
    },
    {
      id: 'doctors',
      title: t.doctors,
      icon: Stethoscope,
      color: '#0891B2',
      bg: '#E8F5E9',
      onPress: () => router.push('/(tabs)/doctors'),
    },
    {
      id: 'lab',
      title: t.laboratory,
      icon: FlaskConical,
      color: '#0891B2',
      bg: '#FFF3E0',
      onPress: () => router.push({ pathname: '/reports-list', params: { type: 'laboratory' } }),
    },
    {
      id: 'hospitals',
      title: t.hospitals,
      icon: Building2,
      color: '#0891B2',
      bg: '#E0F2FE',
      onPress: () => router.push('/hospitals'),
    },
  ];

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-900">
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top,
          paddingBottom: insets.bottom + 32,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#0891B2"
          />
        }
      >
        {/* Header with Patient Photo and Name */}
        <View
          className="bg-white dark:bg-slate-900 px-5 py-5 border-b border-gray-100 dark:border-slate-800"
        >
          <View className="flex-row items-center justify-between">
            <Pressable
              onPress={() => router.push('/notifications')}
              className="w-14 h-14 rounded-full bg-gray-100 dark:bg-slate-800 items-center justify-center relative"
            >
              <Bell size={26} color="#475569" />
              {unreadNotifications > 0 && (
                <View className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-red-500 items-center justify-center">
                  <Text
                    style={{ fontFamily: 'Cairo_700Bold', fontSize: 12 }}
                    className="text-white"
                  >
                    {unreadNotifications}
                  </Text>
                </View>
              )}
            </Pressable>

            <View className="flex-1 items-end mx-4">
              <Text
                style={{ fontFamily: 'Cairo_500Medium', fontSize: 16 }}
                className="text-gray-500 dark:text-slate-400"
              >
                {t.hello}
              </Text>
              <Text
                style={{ fontFamily: 'Cairo_700Bold', fontSize: 26 }}
                className="text-gray-900 dark:text-slate-100"
              >
                {patient?.nameAr || (patient as any)?.fullNameAr || patient?.name || (patient as any)?.fullName || '—'}
              </Text>
            </View>

            <Pressable
              onPress={() => router.push('/(tabs)/profile')}
              className="active:opacity-80"
            >
              {patientImageUri ? (
                <Image
                  source={{ uri: patientImageUri }}
                  style={{ width: 72, height: 72, borderWidth: 3, borderColor: '#0891B2', borderRadius: 36 }}
                />
              ) : (
                <View
                  className="w-[72px] h-[72px] rounded-full bg-gray-200 dark:bg-slate-700 items-center justify-center"
                  style={{ borderWidth: 3, borderColor: '#0891B2' }}
                >
                  <User size={28} color="#94A3B8" />
                </View>
              )}
            </Pressable>
          </View>
        </View>

        {/* UMN Card - Always Visible with Large Font */}
        <View
          className="mx-5 mt-5"
        >
          <LinearGradient
            colors={['#0891B2', '#0E7490']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              borderRadius: 24,
              padding: 24,
            }}
          >
            <View className="flex-row items-center justify-between">
              <View className="w-16 h-16 rounded-full bg-white/20 items-center justify-center">
                <FileText size={32} color="#FFFFFF" />
              </View>
              <View className="items-end flex-1 ml-4">
                <Text
                  style={{ fontFamily: 'Cairo_600SemiBold', fontSize: 16 }}
                  className="text-white/90"
                >
                  {t.umn}
                </Text>
                <Text
                  style={{ fontFamily: 'Cairo_700Bold', fontSize: 42, letterSpacing: 4 }}
                  className="text-white"
                >
                  {patient?.mrn || '—'}
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Connected Hospitals Card */}
        <View
          className="mx-5 mt-5"
        >
          <Pressable
            onPress={() => router.push('/hospitals')}
            className="bg-teal-50 dark:bg-teal-900/20 rounded-2xl p-5 flex-row items-center justify-between border border-teal-100 dark:border-teal-800 active:opacity-90"
          >
            <ChevronLeft size={24} color="#0891B2" />
            <View className="flex-row items-center flex-1 justify-end">
              <View className="items-end mr-4">
                <Text
                  style={{ fontFamily: 'Cairo_600SemiBold', fontSize: 16 }}
                  className="text-teal-700 dark:text-teal-300"
                >
                  {t.linkedHospitals}
                </Text>
                {isLoading ? (
                  <View className="items-end">
                    <View className="h-7 bg-slate-200/80 dark:bg-slate-700 rounded-full w-10 mb-2" />
                    <View className="h-3 bg-slate-200/80 dark:bg-slate-700 rounded-full w-16" />
                  </View>
                ) : (
                  <Text
                    style={{ fontFamily: 'Cairo_700Bold', fontSize: 32 }}
                    className="text-teal-600 dark:text-teal-300"
                  >
                    {connectedHospitalsCount}
                  </Text>
                )}
              </View>
              <View className="w-16 h-16 rounded-xl bg-teal-100 dark:bg-teal-900/40 items-center justify-center">
                <Building2 size={32} color="#0891B2" />
              </View>
            </View>
          </Pressable>
        </View>

        {/* Quick Access - 3 Column Grid */}
        <View
          className="mt-6 px-5"
        >
          <Text
            style={{ fontFamily: 'Cairo_700Bold', fontSize: 22 }}
            className="text-gray-900 dark:text-slate-100 mb-4 text-right"
          >
            {t.quickServices}
          </Text>

          <View className="flex-row flex-wrap justify-between">
            {quickAccessItems.map((item, index) => (
              <View
                key={item.id}
                className="w-[31%] mb-4"
              >
                <Pressable
                  onPress={item.onPress}
                  className="bg-white dark:bg-slate-800 rounded-2xl p-4 items-center active:scale-95"
                  style={{
                    shadowColor: '#0891B2',
                    shadowOpacity: 0.08,
                    shadowRadius: 8,
                    elevation: 3,
                  }}
                >
                  <View
                    className="w-16 h-16 rounded-xl items-center justify-center mb-3"
                    style={{ backgroundColor: item.bg }}
                  >
                    <item.icon size={32} color={item.color} />
                  </View>
                  <Text
                    style={{ fontFamily: 'Cairo_600SemiBold', fontSize: 14 }}
                    className="text-gray-800 dark:text-slate-100 text-center"
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>
                </Pressable>
              </View>
            ))}
          </View>
        </View>

        {/* Recent Notifications */}
        <View
          className="mt-4 px-5"
        >
          <View className="flex-row items-center justify-between mb-4">
            <Pressable
              onPress={() => router.push('/notifications')}
              className="flex-row items-center"
            >
              <ChevronLeft size={22} color="#0891B2" />
              <Text
                style={{ fontFamily: 'Cairo_600SemiBold', fontSize: 14 }}
                className="text-teal-600"
              >
                {t.viewAll}
              </Text>
            </Pressable>
            <Text
              style={{ fontFamily: 'Cairo_700Bold', fontSize: 20 }}
              className="text-gray-900 dark:text-slate-100"
            >
              {t.recentNotifications}
            </Text>
          </View>

          {isNotificationsLoading ? (
            <View className="space-y-3">
              {[0, 1, 2].map((key) => (
                <View
                  key={key}
                  className="bg-white dark:bg-slate-800 rounded-2xl p-4 mb-3"
                  style={{
                    shadowColor: '#000',
                    shadowOpacity: 0.05,
                    shadowRadius: 8,
                    elevation: 2,
                  }}
                >
                  <View className="h-16 bg-slate-200/80 dark:bg-slate-700 rounded-xl mb-3" />
                  <View className="h-4 bg-slate-200/80 dark:bg-slate-700 rounded-md mb-2" />
                  <View className="h-4 bg-slate-200/80 dark:bg-slate-700 rounded-md" />
                </View>
              ))}
            </View>
          ) : safeRecentNotifications.length > 0 ? (
            safeRecentNotifications.map((notification, index) => (
              <Pressable
                key={`${notification.id}-${index}`}
                onPress={() => {
                  if (notification.id.startsWith('local-welcome-')) {
                    router.push({
                      pathname: '/notification-details',
                      params: {
                        id: notification.id,
                        local: '1',
                        titleAr: notification.titleAr,
                        messageAr: notification.messageAr,
                        date: notification.date,
                        type: notification.type,
                      },
                    });
                    return;
                  }
                  router.push({
                    pathname: '/notification-details',
                    params: { id: notification.id },
                  });
                }}
                className={`rounded-2xl p-4 mb-3 flex-row items-center active:scale-98 ${
                  notification.read
                    ? 'bg-white dark:bg-slate-800'
                    : 'bg-teal-50 dark:bg-teal-900/20 border-2 border-teal-200 dark:border-teal-800'
                }`}
                style={{
                  shadowColor: '#000',
                  shadowOpacity: 0.05,
                  shadowRadius: 8,
                  elevation: 2,
                }}
              >
                <View style={{ marginTop: 2 }}>
                  <ChevronLeft size={22} color="#94A3B8" />
                </View>
                <View className="flex-1 mr-4">
                  <Text
                    style={{ fontFamily: 'Cairo_700Bold', fontSize: 16 }}
                    className={`text-right ${
                      notification.read
                        ? 'text-gray-900 dark:text-slate-100'
                        : 'text-teal-700 dark:text-teal-300'
                    }`}
                  >
                    {notification.titleAr}
                  </Text>
                  <Text
                    style={{ fontFamily: 'Cairo_500Medium', fontSize: 14 }}
                    className="text-gray-500 dark:text-slate-400 text-right mt-1"
                    numberOfLines={1}
                  >
                    {notification.messageAr}
                  </Text>
                </View>
                <View
                  className={`w-12 h-12 rounded-xl items-center justify-center ${
                    notification.read
                      ? 'bg-gray-100 dark:bg-slate-700'
                      : 'bg-teal-100 dark:bg-teal-900/40'
                  }`}
                >
                  <Bell
                    size={24}
                    color={notification.read ? '#94A3B8' : '#0891B2'}
                  />
                </View>
              </Pressable>
            ))
          ) : (
            <View className="items-center justify-center py-10">
              <Bell size={48} color="#94A3B8" />
              <Text
                style={{ fontFamily: 'Cairo_500Medium' }}
                className="text-medical-textSecondary dark:text-slate-400 text-lg mt-4"
              >
                {t.noNotifications}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
