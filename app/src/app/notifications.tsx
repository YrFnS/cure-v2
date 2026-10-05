import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import {
  Bell,
  Calendar,
  FileText,
  ChevronLeft,
  Check,
  Pill,
  MessageSquare,
} from 'lucide-react-native';
import { FadeInDownView } from '@/components/FadeInDownView';
import { useSettingsStore, useTranslation } from '@/lib/settings-store';
import { useAuthStore } from '@/lib/auth-store';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getNotifications, markAllNotificationsRead, markNotificationRead } from '@/lib/api';
import type { Notification, NotificationType } from '@/lib/types';

const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case 'appointment':
      return { icon: Calendar, color: '#0891B2', bg: '#CFFAFE' };
    case 'report':
      return { icon: FileText, color: '#059669', bg: '#D1FAE5' };
    case 'reminder':
      return { icon: Pill, color: '#D97706', bg: '#FEF3C7' };
    default:
      return { icon: MessageSquare, color: '#7C3AED', bg: '#EDE9FE' };
  }
};

export default function NotificationsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const patient = useAuthStore(s => s.patient);
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const hasHydrated = useAuthStore(s => s.hasHydrated);
  const canFetch = hasHydrated && isAuthenticated;
  const theme = useSettingsStore(s => s.theme);
  const isDark = theme === 'dark';
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
  const queryClient = useQueryClient();
  const { data: serverNotifications = [], isLoading, refetch } = useQuery<Notification[]>({
    queryKey: ['notifications', activeTab],
    queryFn: () => getNotifications({ read: activeTab === 'unread' ? false : undefined }),
    enabled: canFetch,
    placeholderData: () => {
      const recent = queryClient.getQueryData(['notifications', 'recent']);
      if (!Array.isArray(recent)) return [];
      if (activeTab === 'unread') {
        return recent.filter((item: any) => !item?.read);
      }
      return recent;
    },
    staleTime: 0,
    refetchOnMount: true,
    refetchOnReconnect: true,
    refetchInterval: 3000,
    refetchIntervalInBackground: false,
  });

  const dedupedNotifications = useMemo(() => {
    const seen = new Set<string>();
    const result: Notification[] = [];
    for (const item of serverNotifications) {
      const actionType = String(item?.actionType ?? '').trim();
      const actionId = String(item?.actionId ?? '').trim();
      const key = actionType && actionId ? `action:${actionType}:${actionId}` : `id:${item?.id ?? ''}`;
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(item);
    }
    return result;
  }, [serverNotifications]);
  const markAllMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      queryClient.setQueriesData({ queryKey: ['notifications', 'recent'] }, (data) => {
        if (!Array.isArray(data)) return data;
        return data.map((item) => ({ ...item, read: true }));
      });
      queryClient.setQueriesData({ queryKey: ['notifications'] }, (data) => {
        if (!Array.isArray(data)) return data;
        return data.map((item) => ({ ...item, read: true }));
      });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'recent'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });
  const markOneMutation = useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: (_data, id) => {
      queryClient.setQueriesData({ queryKey: ['notifications', 'recent'] }, (data) => {
        if (!Array.isArray(data)) return data;
        return data.map((item) => (item.id ? (item.id === id ? { ...item, read: true } : item) : item));
      });
      queryClient.setQueriesData({ queryKey: ['notifications'] }, (data) => {
        if (!Array.isArray(data)) return data;
        return data.map((item) => (item.id ? (item.id === id ? { ...item, read: true } : item) : item));
      });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'recent'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });
  const displayedNotifications =
    activeTab === 'all'
      ? dedupedNotifications
      : dedupedNotifications.filter((n) => !n.read);

  const markAllAsRead = () => {
    markAllMutation.mutate();
  };

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = () => {
    setRefreshing(true);
    refetch().finally(() => setRefreshing(false));
  };

  useFocusEffect(
    useCallback(() => {
      if (!canFetch) return () => {};
      refetch();
      queryClient.invalidateQueries({ queryKey: ['notifications', 'recent'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
      return () => {};
    }, [canFetch, refetch, queryClient]),
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'اليوم';
    } else if (diffDays === 1) {
      return 'أمس';
    } else if (diffDays < 7) {
      return `منذ ${diffDays} أيام`;
    } else {
      return date.toLocaleDateString('ar-IQ');
    }
  };

  return (
    <View className="flex-1 bg-medical-bg dark:bg-slate-900">
      <Stack.Screen
        options={{
          title: t.notifications,
          headerStyle: { backgroundColor: isDark ? '#0F172A' : '#FFFFFF' },
          headerTintColor: isDark ? '#E2E8F0' : '#0F172A',
          headerTitleStyle: { fontFamily: 'Cairo_600SemiBold', color: isDark ? '#E2E8F0' : '#0F172A' },
          headerShadowVisible: false,
        }}
      />

        <View className="px-5 py-4 bg-white dark:bg-slate-800 border-b border-medical-border dark:border-slate-700">
        {/* MRN Badge */}
        <View className="flex-row items-center justify-end mb-4">
          <View className="bg-medical-primary/10 dark:bg-cyan-900/30 rounded-full px-3 py-1">
            <Text
              style={{ fontFamily: 'Cairo_600SemiBold', fontSize: 16 }}
              className="text-medical-primary dark:text-cyan-300"
            >
              {t.mrn}: {patient?.mrn}
            </Text>
          </View>
        </View>

        <View className="flex-row bg-medical-cardAlt dark:bg-slate-700 rounded-xl p-1">
          <Pressable
            onPress={() => setActiveTab('unread')}
            className={`flex-1 py-3 rounded-lg ${
              activeTab === 'unread' ? 'bg-white dark:bg-slate-800' : ''
            }`}
            style={activeTab === 'unread' ? {
              shadowColor: '#000',
              shadowOpacity: 0.05,
              shadowRadius: 2,
              elevation: 1,
            } : undefined}
          >
            <Text
              style={{ fontFamily: 'Cairo_600SemiBold', fontSize: 16 }}
              className={`text-center ${
                activeTab === 'unread' ? 'text-medical-primary dark:text-cyan-300' : 'text-medical-textSecondary dark:text-slate-300'
              }`}
            >
              {t.unreadNotifications}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab('all')}
            className={`flex-1 py-3 rounded-lg ${
              activeTab === 'all' ? 'bg-white dark:bg-slate-800' : ''
            }`}
            style={activeTab === 'all' ? {
              shadowColor: '#000',
              shadowOpacity: 0.05,
              shadowRadius: 2,
              elevation: 1,
            } : undefined}
          >
            <Text
              style={{ fontFamily: 'Cairo_600SemiBold', fontSize: 16 }}
              className={`text-center ${
                activeTab === 'all' ? 'text-medical-primary dark:text-cyan-300' : 'text-medical-textSecondary dark:text-slate-300'
              }`}
            >
              {t.allNotifications}
            </Text>
          </Pressable>
        </View>

        {/* Mark All as Read */}
        {serverNotifications.some((n) => !n.read) && (
          <Pressable
            onPress={markAllAsRead}
            className="flex-row items-center justify-end mt-3"
          >
            <Text
              style={{ fontFamily: 'Cairo_500Medium', fontSize: 14 }}
              className="text-medical-primary dark:text-cyan-300"
            >
              {t.markAsRead}
            </Text>
            <View style={{ marginLeft: 4 }}>
              <Check size={16} color="#0891B2" />
            </View>
          </Pressable>
        )}
      </View>

      <FlatList
        data={displayedNotifications}
        keyExtractor={(item, index) => item?.id ?? `${index}`}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: insets.bottom + 32 }}
        refreshControl={(
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        )}
        ListEmptyComponent={isLoading ? (
          <View className="space-y-3">
            {[0, 1, 2].map((key) => (
              <View
                key={key}
                className="bg-white dark:bg-slate-800 rounded-2xl p-4 mb-3"
                style={{
                  shadowColor: '#000',
                  shadowOpacity: 0.05,
                  shadowRadius: 4,
                  elevation: 2,
                }}
              >
                <View className="h-16 bg-slate-200/80 dark:bg-slate-700 rounded-xl mb-3" />
                <View className="h-4 bg-slate-200/80 dark:bg-slate-700 rounded-md mb-2" />
                <View className="h-4 bg-slate-200/80 dark:bg-slate-700 rounded-md" />
              </View>
            ))}
          </View>
        ) : (
          <View className="items-center justify-center py-20">
            <Bell size={64} color="#94A3B8" />
            <Text
              style={{ fontFamily: 'Cairo_600SemiBold', fontSize: 20 }}
              className="text-medical-textSecondary dark:text-slate-400 mt-4"
            >
              {t.noNotifications}
            </Text>
          </View>
        )}
        renderItem={({ item, index }) => {
          const { icon: Icon, color, bg } = getNotificationIcon(
            item.type
          );

          return (
            <FadeInDownView
              delay={index * 50} duration={400}
            >
              <Pressable
                onPress={() => {
                  if (!item.read) {
                    markOneMutation.mutate(item.id);
                  }
                  router.push({
                    pathname: '/notification-details',
                    params: { id: item.id },
                  });
                }}
                className={`bg-white dark:bg-slate-800 rounded-2xl p-4 mb-3 flex-row items-start active:opacity-80 ${
                  !item.read ? 'border-l-4 border-medical-primary' : ''
                }`}
                style={{
                  shadowColor: '#000',
                  shadowOpacity: 0.05,
                  shadowRadius: 4,
                  elevation: 2,
                }}
              >
                <View style={{ marginTop: 4 }}>
                  <ChevronLeft size={20} color="#94A3B8" />
                </View>
                <View className="flex-1 mr-3">
                  <View className="flex-row items-center justify-between">
                    <Text
                      style={{ fontFamily: 'Cairo_400Regular', fontSize: 14 }}
                      className="text-medical-textMuted dark:text-slate-400"
                    >
                      {formatDate(item.date)}
                    </Text>
                    <Text
                      style={{ fontFamily: 'Cairo_600SemiBold', fontSize: 18 }}
                      className={`${
                        item.read ? 'text-medical-text dark:text-slate-100' : 'text-medical-primary dark:text-cyan-300'
                      }`}
                    >
                      {item.titleAr}
                    </Text>
                  </View>
                  <Text
                    style={{ fontFamily: 'Cairo_400Regular', fontSize: 16 }}
                    className="text-medical-textSecondary dark:text-slate-300 text-right mt-2"
                    numberOfLines={2}
                  >
                    {item.messageAr}
                  </Text>
                </View>
                <View
                  className="w-12 h-12 rounded-xl items-center justify-center"
                  style={{ backgroundColor: bg }}
                >
                  <Icon size={24} color={color} />
                </View>
              </Pressable>
            </FadeInDownView>
          );
        }}
      />
    </View>
  );
}
