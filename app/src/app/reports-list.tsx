import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack, useFocusEffect } from 'expo-router';
import {
  FileText,
  ChevronLeft,
  FlaskConical,
  ScanLine,
  ClipboardList,
} from 'lucide-react-native';
import { FadeInDownView } from '@/components/FadeInDownView';
import { useSettingsStore, useTranslation } from '@/lib/settings-store';
import { useAuthStore } from '@/lib/auth-store';
import type { Report, ReportType } from '@/lib/types';
import { useQuery } from '@tanstack/react-query';
import { getReports } from '@/lib/api';

const getReportIcon = (type: ReportType) => {
  switch (type) {
    case 'laboratory':
      return { icon: FlaskConical, color: '#D97706', bg: '#FEF3C7' };
    case 'radiology':
      return { icon: ScanLine, color: '#7C3AED', bg: '#EDE9FE' };
    default:
      return { icon: ClipboardList, color: '#DB2777', bg: '#FCE7F3' };
  }
};

const getTitle = (type: string, t: Record<string, string>) => {
  switch (type) {
    case 'laboratory':
      return t.laboratoryReports;
    case 'radiology':
      return t.radiologyReports;
    case 'medical':
      return t.generalReports;
    default:
      return t.medicalReports;
  }
};

export default function ReportsListScreen() {
  const router = useRouter();
  const { type } = useLocalSearchParams<{ type: ReportType }>();
  const { t } = useTranslation();
  const patient = useAuthStore(s => s.patient);
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const hasHydrated = useAuthStore(s => s.hasHydrated);
  const canFetch = hasHydrated && isAuthenticated;
  const theme = useSettingsStore(s => s.theme);
  const isDark = theme === 'dark';

  const {
    data: filteredReports = [],
    isLoading,
    isError,
    refetch,
  } = useQuery<Report[]>({
    queryKey: ['reports', type ?? 'all'],
    queryFn: () => getReports({ type }),
    enabled: canFetch,
    staleTime: 15 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchInterval: 8000,
    refetchIntervalInBackground: false,
  });

  useFocusEffect(
    React.useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const title = type ? getTitle(type, t) : t.medicalReports;

  return (
    <View className="flex-1 bg-medical-bg dark:bg-slate-900">
      <Stack.Screen
        options={{
          title,
          headerStyle: { backgroundColor: isDark ? '#0F172A' : '#FFFFFF' },
          headerTintColor: isDark ? '#E2E8F0' : '#0F172A',
          headerTitleStyle: { fontFamily: 'Cairo_600SemiBold', color: isDark ? '#E2E8F0' : '#0F172A' },
          headerShadowVisible: false,
        }}
      />
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* MRN Badge */}
        <FadeInDownView
          delay={50} duration={400}
          className="flex-row items-center justify-end mb-4"
        >
          <View className="bg-medical-primary/10 dark:bg-cyan-900/30 rounded-full px-3 py-1">
            <Text
              style={{ fontFamily: 'Cairo_600SemiBold' }}
              className="text-medical-primary dark:text-cyan-300 text-sm"
            >
              {t.mrn}: {patient?.mrn}
            </Text>
          </View>
        </FadeInDownView>

        {isLoading ? (
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
                <View className="h-20 bg-slate-200/80 dark:bg-slate-700 rounded-xl mb-3" />
                <View className="h-4 bg-slate-200/80 dark:bg-slate-700 rounded-md mb-2" />
                <View className="h-4 bg-slate-200/80 dark:bg-slate-700 rounded-md" />
              </View>
            ))}
          </View>
        ) : filteredReports.length > 0 ? (
          filteredReports.map((report, index) => {
            const { icon: Icon, color, bg } = getReportIcon(report.type);

            return (
              <FadeInDownView
                key={report.id}
                delay={index * 50} duration={400}
              >
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: '/report-details',
                      params: { id: report.id },
                    })
                  }
                  className="bg-white dark:bg-slate-800 rounded-2xl p-4 mb-3 flex-row items-center active:opacity-80"
                  style={{
                    shadowColor: '#000',
                    shadowOpacity: 0.05,
                    shadowRadius: 4,
                    elevation: 2,
                  }}
                >
                  <ChevronLeft size={20} color="#94A3B8" />
                  <View className="flex-1 mr-3">
                    <Text
                      style={{ fontFamily: 'Cairo_600SemiBold', fontSize: 18 }}
                      className="text-medical-text dark:text-slate-100 text-right"
                    >
                      {report.titleAr}
                    </Text>
                    <Text
                      style={{ fontFamily: 'Cairo_400Regular', fontSize: 16 }}
                      className="text-medical-textSecondary dark:text-slate-400 text-right mt-1"
                    >
                      {report.doctorNameAr}
                    </Text>
                    <View className="flex-row items-center justify-end mt-2">
                      <View
                        className={`px-2 py-1 rounded ${
                          report.status === 'ready'
                            ? 'bg-green-100 dark:bg-emerald-900/30'
                            : 'bg-amber-100 dark:bg-amber-900/30'
                        }`}
                      >
                        <Text
                          style={{ fontFamily: 'Cairo_500Medium', fontSize: 14 }}
                          className={`${
                            report.status === 'ready'
                              ? 'text-green-700 dark:text-emerald-300'
                              : 'text-amber-700 dark:text-amber-300'
                          }`}
                        >
                          {report.status === 'ready' ? t.ready : t.pending}
                        </Text>
                      </View>
                      <Text
                        style={{ fontFamily: 'Cairo_400Regular', fontSize: 14 }}
                        className="text-medical-textSecondary dark:text-slate-400 mr-3"
                      >
                        {report.date}
                      </Text>
                    </View>
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
          })
        ) : isError ? (
          <View className="items-center justify-center py-20">
            <FileText size={64} color="#94A3B8" />
            <Text
              style={{ fontFamily: 'Cairo_500Medium' }}
              className="text-medical-textSecondary dark:text-slate-400 text-lg mt-4 text-center px-6"
            >
              {t.reportsLoadError}
            </Text>
            <Pressable
              onPress={() => refetch()}
              className="mt-6 bg-medical-primary rounded-2xl px-8 py-3 active:opacity-80"
            >
              <Text style={{ fontFamily: 'Cairo_600SemiBold' }} className="text-white">
                {t.retry}
              </Text>
            </Pressable>
          </View>
        ) : (
          <View className="items-center justify-center py-20">
            <FileText size={64} color="#94A3B8" />
            <Text
              style={{ fontFamily: 'Cairo_500Medium' }}
              className="text-medical-textSecondary dark:text-slate-400 text-lg mt-4"
            >
              {t.noReports}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
