import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  FlaskConical,
  ScanLine,
  ClipboardList,
  ChevronLeft,
  FileText,
} from 'lucide-react-native';
import { FadeInDownView } from '@/components/FadeInDownView';
import { useTranslation } from '@/lib/settings-store';
import { useAuthStore } from '@/lib/auth-store';
import { useQuery } from '@tanstack/react-query';
import { getReports } from '@/lib/api';
import type { ReportType } from '@/lib/types';

export default function ReportsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();
  const patient = useAuthStore(s => s.patient);
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const hasHydrated = useAuthStore(s => s.hasHydrated);
  const canFetch = hasHydrated && isAuthenticated;

  const {
    data: allReports = [],
    isLoading: isReportsLoading,
    isError: isReportsError,
    refetch,
  } = useQuery({
    queryKey: ['reports', 'dashboard'],
    queryFn: () => getReports(),
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

  const labReports = React.useMemo(
    () => allReports.filter((report: any) => report.type === 'laboratory'),
    [allReports],
  );
  const radiologyReports = React.useMemo(
    () => allReports.filter((report: any) => report.type === 'radiology'),
    [allReports],
  );
  const medicalReports = React.useMemo(
    () => allReports.filter((report: any) => report.type === 'medical'),
    [allReports],
  );
  const recentReports = React.useMemo(
    () =>
      [...allReports]
        .sort((a: any, b: any) => {
          const dateA = new Date(a?.createdAt ?? a?.date ?? 0).getTime();
          const dateB = new Date(b?.createdAt ?? b?.date ?? 0).getTime();
          return dateB - dateA;
        })
        .slice(0, 5),
    [allReports],
  );

  const reportCategories: {
    type: ReportType;
    title: string;
    icon: React.ComponentType<{ size: number; color: string }>;
    color: string;
    bg: string;
    count: number;
  }[] = [
    {
      type: 'laboratory',
      title: t.laboratoryReports,
      icon: FlaskConical,
      color: '#D97706',
      bg: '#FEF3C7',
      count: labReports.length,
    },
    {
      type: 'radiology',
      title: t.radiologyReports,
      icon: ScanLine,
      color: '#7C3AED',
      bg: '#EDE9FE',
      count: radiologyReports.length,
    },
    {
      type: 'medical',
      title: t.generalReports,
      icon: ClipboardList,
      color: '#DB2777',
      bg: '#FCE7F3',
      count: medicalReports.length,
    },
  ];

  return (
    <View className="flex-1 bg-medical-bg dark:bg-slate-900">
      {/* Header */}
      <LinearGradient
        colors={['#0891B2', '#0E7490']}
        style={{ paddingTop: insets.top + 16, paddingBottom: 20, paddingHorizontal: 20 }}
      >
        <View className="flex-row items-center justify-between">
          <View className="bg-white/20 rounded-full px-3 py-1">
            <Text
              style={{ fontFamily: 'Cairo_600SemiBold' }}
              className="text-white text-sm"
            >
              {t.mrn}: {patient?.mrn}
            </Text>
          </View>
          <Text
            style={{ fontFamily: 'Cairo_700Bold' }}
            className="text-white text-xl"
          >
            {t.medicalReports}
          </Text>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Report Categories */}
        <Text
          style={{ fontFamily: 'Cairo_700Bold', fontSize: 22 }}
          className="text-medical-text dark:text-slate-100 text-right mb-4"
        >
          {t.reportCategories}
        </Text>

        {isReportsLoading ? (
          <View className="space-y-3">
            {[0, 1, 2].map((key) => (
              <View
                key={key}
                className="bg-white dark:bg-slate-800 rounded-2xl p-5 mb-3"
                style={{
                  shadowColor: '#000',
                  shadowOpacity: 0.06,
                  shadowRadius: 6,
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
          reportCategories.map((category, index) => (
            <FadeInDownView
              key={category.type}
              delay={index * 100} duration={400}
            >
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: '/reports-list',
                    params: { type: category.type },
                  })
                }
                className="bg-white dark:bg-slate-800 rounded-2xl p-5 mb-4 flex-row items-center active:opacity-80"
                style={{
                  shadowColor: '#000',
                  shadowOpacity: 0.08,
                  shadowRadius: 8,
                  elevation: 3,
                }}
              >
                <ChevronLeft size={24} color="#94A3B8" />
                <View className="flex-1 mr-4">
                  <Text
                    style={{ fontFamily: 'Cairo_600SemiBold', fontSize: 20 }}
                    className="text-medical-text dark:text-slate-100 text-right"
                  >
                    {category.title}
                  </Text>
                  <Text
                    style={{ fontFamily: 'Cairo_500Medium', fontSize: 16 }}
                    className="text-medical-textSecondary dark:text-slate-400 text-right"
                  >
                    {category.count} {t.reportsCount}
                  </Text>
                </View>
                <View
                  className="w-14 h-14 rounded-xl items-center justify-center"
                  style={{ backgroundColor: category.bg }}
                >
                  <category.icon size={28} color={category.color} />
                </View>
              </Pressable>
            </FadeInDownView>
          ))
        )}

        {/* Recent Reports */}
        <Text
          style={{ fontFamily: 'Cairo_700Bold', fontSize: 22 }}
          className="text-medical-text dark:text-slate-100 text-right mb-4 mt-6"
        >
          {t.recentReportsTitle}
        </Text>

        {isReportsLoading ? (
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
        ) : recentReports.length > 0 ? (
          recentReports.map((report, index) => (
            <FadeInDownView
              key={report.id}
              delay={300 + index * 50} duration={400}
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
                  <View className="flex-row items-center justify-end mt-1">
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
                  className="w-10 h-10 rounded-xl items-center justify-center"
                  style={{
                    backgroundColor:
                      report.type === 'laboratory'
                        ? '#FEF3C7'
                        : report.type === 'radiology'
                        ? '#EDE9FE'
                        : '#FCE7F3',
                  }}
                >
                  <FileText
                    size={20}
                    color={
                      report.type === 'laboratory'
                        ? '#D97706'
                        : report.type === 'radiology'
                        ? '#7C3AED'
                        : '#DB2777'
                    }
                  />
                </View>
              </Pressable>
            </FadeInDownView>
          ))
        ) : isReportsError ? (
          <View className="items-center justify-center py-10">
            <FileText size={48} color="#94A3B8" />
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
          <View className="items-center justify-center py-10">
            <FileText size={48} color="#94A3B8" />
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
