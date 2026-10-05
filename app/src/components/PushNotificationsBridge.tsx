import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { useAuthStore } from '@/lib/auth-store';
import { registerPushToken, deletePushToken } from '@/lib/api';
import { useSettingsStore } from '@/lib/settings-store';
import { useQueryClient } from '@tanstack/react-query';
import { secureStorage } from '@/lib/secure-storage';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function registerForPushNotifications() {
  if (!Device.isDevice) return null;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0891B2',
    });
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  const tokenResponse = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined,
  );
  return tokenResponse.data;
}

export default function PushNotificationsBridge() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const patient = useAuthStore(s => s.patient);
  const notificationsEnabled = useSettingsStore(s => s.notificationsEnabled);

  useEffect(() => {
    let isActive = true;

    const setup = async () => {
      if (!patient?.id) return;
      const storedToken = await secureStorage.getItem('pushToken');

      if (!notificationsEnabled) {
        if (storedToken) {
          await deletePushToken({ token: storedToken });
          await secureStorage.removeItem('pushToken');
        }
        return;
      }

      const token = await registerForPushNotifications();
      if (!token || !isActive) return;
      if (token !== storedToken) {
        await registerPushToken({ token, platform: Platform.OS });
        await secureStorage.setItem('pushToken', token);
      }
    };

    setup();
    return () => {
      isActive = false;
    };
  }, [patient?.id, notificationsEnabled]);

  useEffect(() => {
    const receivedSubscription = Notifications.addNotificationReceivedListener(() => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications', 'recent'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    });

    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data ?? {};
        const notificationId = data.notificationId ?? data.notification_id;

        void queryClient.invalidateQueries({ queryKey: ['notifications'] });
        void queryClient.invalidateQueries({ queryKey: ['notifications', 'recent'] });
        void queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });

        if (notificationId) {
          router.push({
            pathname: '/notification-details',
            params: { id: String(notificationId) },
          });
        } else {
          router.push('/notifications');
        }
      },
    );

    return () => {
      receivedSubscription.remove();
      subscription.remove();
    };
  }, [router, queryClient]);

  return null;
}
