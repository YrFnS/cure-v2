import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { PdfViewer } from '@/components/PdfViewer';
import { getToken } from '@/lib/api';
import { useSettingsStore, useTranslation } from '@/lib/settings-store';

// Full-screen view of the lab's original result PDF, opened from report-details.
export default function ReportPdfScreen() {
  const { uri } = useLocalSearchParams<{ uri: string }>();
  const { t } = useTranslation();
  const isDark = useSettingsStore(s => s.theme) === 'dark';
  const [failed, setFailed] = React.useState(false);
  const onError = React.useCallback(() => setFailed(true), []);
  const { data: token, isFetched } = useQuery({ queryKey: ['auth-token'], queryFn: getToken, staleTime: 0, gcTime: 0 });

  return (
    <View className="flex-1 bg-medical-bg dark:bg-slate-900">
      <Stack.Screen
        options={{
          title: t.viewReport,
          headerStyle: { backgroundColor: isDark ? '#0F172A' : '#FFFFFF' },
          headerTintColor: isDark ? '#E2E8F0' : '#0F172A',
          headerTitleStyle: { fontFamily: 'Cairo_600SemiBold', color: isDark ? '#E2E8F0' : '#0F172A' },
          headerShadowVisible: false,
        }}
      />
      {failed || !uri || (isFetched && !token) ? (
        <Text style={{ fontFamily: 'Cairo_500Medium' }} className="text-red-600 text-center mt-10 px-6">
          {t.downloadFailed}
        </Text>
      ) : token ? (
        <PdfViewer uri={uri} token={token} onError={onError} />
      ) : (
        <ActivityIndicator size="large" color="#0891B2" style={{ flex: 1 }} />
      )}
    </View>
  );
}
