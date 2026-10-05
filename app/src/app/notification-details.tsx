import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Bell,
  Calendar,
  FileText,
  Pill,
  MessageSquare,
  ExternalLink,
} from 'lucide-react-native';
import { FadeInDownView } from '@/components/FadeInDownView';
import { useSettingsStore } from '@/lib/settings-store';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteNotification, getNotifications } from '@/lib/api';
import type { Notification, NotificationType } from '@/lib/types';

const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case 'appointment':
      return { icon: Calendar, color: '#3B82F6', bg: '#3B82F620' };
    case 'report':
      return { icon: FileText, color: '#10B981', bg: '#10B98120' };
    case 'reminder':
      return { icon: Pill, color: '#F59E0B', bg: '#F59E0B20' };
    default:
      return { icon: MessageSquare, color: '#8B5CF6', bg: '#8B5CF620' };
  }
};

export default function NotificationDetailsScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const notificationId = typeof id === 'string' ? id : '';
  const theme = useSettingsStore(s => s.theme);
  const isDark = theme === 'dark';
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ['notifications', 'all'],
    queryFn: () => getNotifications(),
  });
  const selectedNotification = notifications.find((n) => n.id === notificationId);
  const deleteMutation = useMutation({
    mutationFn: () => deleteNotification(notificationId),
    onSuccess: () => {
      queryClient.setQueriesData({ queryKey: ['notifications'] }, (data) => {
        if (!Array.isArray(data)) return data;
        return data.filter((item) => item.id !== notificationId);
      });
      queryClient.setQueriesData({ queryKey: ['notifications', 'recent'] }, (data) => {
        if (!Array.isArray(data)) return data;
        return data.filter((item) => item.id !== notificationId);
      });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'recent'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
      router.back();
    },
  });

  if (isLoading) {
    return (
      <View className="flex-1 bg-medical-bg dark:bg-navy-950 items-center justify-center">
        <Text
          style={{ fontFamily: 'Cairo_500Medium' }}
          className="text-medical-textSecondary dark:text-slate-400"
        >
          جاري التحميل...
        </Text>
      </View>
    );
  }

  if (!selectedNotification) {
    return (
      <View className="flex-1 bg-medical-bg dark:bg-navy-950 items-center justify-center">
        <Text
          style={{ fontFamily: 'Cairo_500Medium' }}
          className="text-medical-textSecondary dark:text-slate-400"
        >
          الإشعار غير موجود
        </Text>
      </View>
    );
  }

  const { icon: Icon, color, bg } = getNotificationIcon(selectedNotification.type);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-IQ', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const normalizeMixedText = (text: string) =>
    `\u200F${String(text ?? '')
      .replace(/(\d{1,2}:\d{2})/g, '\u200E$1\u200E')
      .replace(/(\d{4}-\d{2}-\d{2})/g, '\u200E$1\u200E')}\u200F`;

  const handleAction = () => {
    if (selectedNotification.actionType === 'report' && selectedNotification.actionId) {
      router.push({
        pathname: '/report-details',
        params: { id: selectedNotification.actionId },
      });
    }
  };
  const handleDelete = () => {
    if (!notificationId) return;
    deleteMutation.mutate();
  };

  return (
    <View className="flex-1 bg-medical-bg dark:bg-navy-950">
      <Stack.Screen
        options={{
          title: 'تفاصيل الإشعار',
          headerStyle: { backgroundColor: isDark ? '#0F172A' : '#FFFFFF' },
          headerTintColor: isDark ? '#FFFFFF' : '#0F172A',
          headerTitleStyle: { fontFamily: 'Cairo_600SemiBold', color: isDark ? '#FFFFFF' : '#0F172A' },
        }}
      />
      <LinearGradient
        colors={isDark ? ['#0F172A', '#1A2332', '#0F172A'] : ['#F8FAFC', '#FFFFFF', '#F8FAFC']}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            padding: 20,
            paddingBottom: insets.bottom + 24,
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* Icon */}
          <FadeInDownView
            delay={100} duration={500}
            className="items-center mb-6"
          >
            <View
              className="w-20 h-20 rounded-2xl items-center justify-center"
              style={{ backgroundColor: bg }}
            >
              <Icon size={40} color={color} />
            </View>
          </FadeInDownView>

          {/* Title */}
          <FadeInDownView
            delay={200} duration={500}
            className="items-center mb-6"
          >
            <Text
              style={{ fontFamily: 'Cairo_700Bold' }}
              className="text-medical-text dark:text-white text-2xl text-center"
            >
              {selectedNotification.titleAr}
            </Text>
            <Text
              style={{ fontFamily: 'Cairo_400Regular' }}
              className="text-medical-textSecondary dark:text-slate-400 text-sm mt-2"
            >
              {formatDate(selectedNotification.date)}
            </Text>
          </FadeInDownView>

          {/* Message */}
          <FadeInDownView
            delay={300} duration={500}
            className="bg-white dark:bg-slate-800 rounded-2xl p-5 mb-6"
          >
            <Text
              style={{ fontFamily: 'Cairo_500Medium' }}
              className="text-medical-text dark:text-white text-base text-right leading-7"
            >
              {normalizeMixedText(selectedNotification.messageAr)}
            </Text>
          </FadeInDownView>

          {/* Action Button */}
          {selectedNotification.actionId && selectedNotification.actionType && (
            <View className="mb-3">
              <Pressable
                onPress={handleAction}
                className="bg-medical-primary rounded-2xl py-4 flex-row items-center justify-center active:opacity-80"
              >
                <Text
                  style={{ fontFamily: 'Cairo_600SemiBold' }}
                  className="text-white text-lg"
                >
                  عرض التقرير
                </Text>
                <View style={{ marginLeft: 8 }}>
                  <ExternalLink size={20} color="#FFFFFF" />
                </View>
              </Pressable>
            </View>
          )}

          <View className="mb-2">
              <Pressable
                onPress={handleDelete}
                className="bg-rose-600 rounded-2xl py-4 flex-row items-center justify-center active:opacity-80"
                disabled={deleteMutation.isPending}
              >
                <Text
                  style={{ fontFamily: 'Cairo_600SemiBold' }}
                  className="text-white text-lg mr-2"
                >
                  {deleteMutation.isPending ? 'جارٍ الحذف...' : 'حذف الإشعار'}
                </Text>
                <View style={{ marginLeft: 8 }}>
                  <Bell size={20} color="#FFFFFF" />
                </View>
              </Pressable>
            </View>
        </ScrollView>
      </LinearGradient>
    </View>
  );
}
