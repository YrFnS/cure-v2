import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  Modal,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, Stack, useFocusEffect } from 'expo-router';
import {
  Calendar,
  User,
  Download,
  Eye,
  FlaskConical,
  ScanLine,
  ClipboardList,
  Sparkles,
} from 'lucide-react-native';
import { FadeInDownView } from '@/components/FadeInDownView';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system/legacy';
import { useSettingsStore, useTranslation } from '@/lib/settings-store';
import { useAuthStore } from '@/lib/auth-store';
import type { ReportType } from '@/lib/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { askReportQuestion, getReportById, getToken } from '@/lib/api';

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

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const getFileNameFromUrl = (url?: string | null) => {
  const raw = String(url ?? '').trim();
  if (!raw) return '';
  const withoutQuery = raw.split('?')[0] || raw;
  const segment = withoutQuery.split('/').filter(Boolean).pop() || '';
  if (!segment) return '';
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
};

const isImageFileName = (name: string) => /\.(png|jpe?g|webp|gif|bmp|heic|heif)$/i.test(name);


export default function ReportDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string | string[] }>();
  const reportId = Array.isArray(id) ? id[0] : id;
  const { t } = useTranslation();
  const patient = useAuthStore(s => s.patient);
  const [showDetails, setShowDetails] = React.useState(false);
  const theme = useSettingsStore(s => s.theme);
  const isDark = theme === 'dark';

  const { data: report, isLoading, isError, refetch } = useQuery({
    queryKey: ['report', reportId ?? ''],
    queryFn: () => getReportById(reportId),
    enabled: Boolean(reportId),
    staleTime: 10 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    // Poll only while the lab result is pending; the AI summary is generated server-side once.
    refetchInterval: query => (query.state.data?.status === 'pending' ? 15000 : false),
    refetchIntervalInBackground: false,
    retry: 1,
  });

  const queryClient = useQueryClient();
  const [selectedQuestion, setSelectedQuestion] = React.useState<string | null>(null);
  const ask = useMutation({
    mutationFn: (question: string) => askReportQuestion(reportId, question),
    onSuccess: ({ question, answer }: { question: string; answer: string }) => {
      queryClient.setQueryData(['report', reportId ?? ''], (old: any) =>
        old ? { ...old, answers: { ...(old.answers ?? {}), [question]: answer } } : old,
      );
    },
  });

  useFocusEffect(
    React.useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const getReportTypeLabel = React.useCallback((reportType?: ReportType) => {
    switch (reportType) {
      case 'laboratory':
        return t.laboratoryReports;
      case 'radiology':
        return t.radiologyReports;
      default:
        return t.generalReports;
    }
  }, [t]);

  const buildReportPdfHtml = React.useCallback(() => {
    if (!report) return '';
    const patientName = report.patientNameAr || patient?.nameAr || patient?.name || '-';
    const doctorName = report.doctorNameAr || report.doctorName || '-';
    const hospitalName = report.hospitalName || '';
    const hospitalLocation = report.hospitalLocation || '';
    const hospitalRows = [
      hospitalName ? `<div class="row"><span class="label">المستشفى: </span><span class="value">${escapeHtml(hospitalName)}</span></div>` : '',
      hospitalLocation ? `<div class="row"><span class="label">الموقع: </span><span class="value">${escapeHtml(hospitalLocation)}</span></div>` : '',
    ].join('');
    const details = report.detailsAr || report.details || 'لا توجد تفاصيل إضافية.';
    const reportStatus = report.status === 'ready' ? t.ready : t.pending;
    const reportType = getReportTypeLabel(report.type);

    return `
      <html lang="ar" dir="rtl">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <style>
            body { font-family: Arial, sans-serif; color: #0f172a; padding: 24px; line-height: 1.7; }
            .header { border-bottom: 2px solid #0ea5e9; margin-bottom: 16px; padding-bottom: 10px; }
            .title { font-size: 22px; font-weight: 700; margin: 0; }
            .subtitle { font-size: 14px; color: #475569; margin: 6px 0 0 0; }
            .section { margin-top: 18px; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; }
            .row { margin: 6px 0; }
            .label { font-weight: 700; color: #334155; }
            .value { color: #0f172a; }
          </style>
        </head>
        <body>
          <div class="header">
            <p class="title">${escapeHtml(report.titleAr || report.title || 'تقرير')}</p>
            <p class="subtitle">MRN: ${escapeHtml(patient?.mrn || '-')}</p>
          </div>
          <div class="section">
            <div class="row"><span class="label">نوع التقرير: </span><span class="value">${escapeHtml(reportType)}</span></div>
            <div class="row"><span class="label">الحالة: </span><span class="value">${escapeHtml(reportStatus)}</span></div>
            <div class="row"><span class="label">التاريخ: </span><span class="value">${escapeHtml(report.date || '-')}</span></div>
            <div class="row"><span class="label">المريض: </span><span class="value">${escapeHtml(patientName)}</span></div>
            <div class="row"><span class="label">الطبيب: </span><span class="value">${escapeHtml(doctorName)}</span></div>
            ${hospitalRows}
          </div>
          <div class="section">
            <div class="row"><span class="label">ملخص التقرير</span></div>
            <div class="row value">${escapeHtml(details)}</div>
          </div>
        </body>
      </html>
    `;
  }, [getReportTypeLabel, patient?.mrn, patient?.name, patient?.nameAr, report, t.pending, t.ready]);

  if (isLoading) {
    return (
      <View className="flex-1 bg-medical-bg dark:bg-slate-900">
        <Stack.Screen
          options={{
            title: t.reportDetails,
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
          <View className="space-y-3">
            <View className="bg-white dark:bg-slate-800 rounded-2xl p-5">
              <View className="h-24 bg-slate-200/80 dark:bg-slate-700 rounded-xl mb-3" />
              <View className="h-4 bg-slate-200/80 dark:bg-slate-700 rounded-md mb-2" />
              <View className="h-4 bg-slate-200/80 dark:bg-slate-700 rounded-md" />
            </View>
            <View className="bg-white dark:bg-slate-800 rounded-2xl p-5">
              <View className="h-16 bg-slate-200/80 dark:bg-slate-700 rounded-xl mb-3" />
              <View className="h-4 bg-slate-200/80 dark:bg-slate-700 rounded-md" />
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  if (!report) {
    if (isError) {
      return (
        <View className="flex-1 bg-medical-bg dark:bg-slate-900 items-center justify-center px-6">
          <Text
            style={{ fontFamily: 'Cairo_500Medium' }}
            className="text-medical-textSecondary dark:text-slate-400 text-center"
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
      );
    }
    return (
      <View className="flex-1 bg-medical-bg dark:bg-slate-900 items-center justify-center">
        <Text
          style={{ fontFamily: 'Cairo_500Medium' }}
          className="text-medical-textSecondary dark:text-slate-400"
        >
          التقرير غير موجود
        </Text>
      </View>
    );
  }

  const reportFileName = getFileNameFromUrl(report.fileUrl);
  const hasReportFile = Boolean(report.fileUrl && reportFileName);
  const hasImageReport = hasReportFile && isImageFileName(reportFileName);

  const { icon: Icon, color, bg } = getReportIcon(report.type);

  const handleDownload = async () => {
    try {
      if (report.fileUrl) {
        const fallbackName = `report-${report.id}`;
        const downloadName = reportFileName || fallbackName;
        const targetUri = `${FileSystem.cacheDirectory}${Date.now()}-${downloadName}`;
        // The result PDF is private: the server only serves it with the patient's session.
        const token = await getToken();
        const downloaded = await FileSystem.downloadAsync(report.fileUrl, targetUri, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(downloaded.uri, {
            dialogTitle: downloadName,
          });
          return;
        }
      }

      const html = buildReportPdfHtml();
      if (!html) {
        Alert.alert('خطأ', 'تعذر إنشاء التقرير');
        return;
      }
      const pdfFile = await Print.printToFileAsync({ html });
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(pdfFile.uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'تحميل التقرير',
          UTI: 'com.adobe.pdf',
        });
        return;
      }
    } catch {
      Alert.alert('خطأ', 'حدث خطأ أثناء التحميل');
    }
  };

  const handleView = () => {
    if (hasImageReport && !report.fileUrl) return;
    setShowDetails(true);
  };

  return (
    <View className="flex-1 bg-medical-bg dark:bg-slate-900">
      <Modal
        visible={showDetails}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDetails(false)}
      >
        <View className="flex-1 bg-black/40 items-center justify-center px-6">
          <View className="bg-white dark:bg-slate-900 rounded-3xl p-5 w-full max-w-[360px]">
            <View className="flex-row-reverse items-center justify-between mb-3">
              <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 18 }} className="text-gray-900 dark:text-slate-100 text-right">
                تفاصيل التقرير
              </Text>
              <Pressable
                onPress={() => setShowDetails(false)}
                className="px-3 py-2 rounded-xl bg-gray-100 dark:bg-slate-800"
              >
                <Text style={{ fontFamily: 'Cairo_600SemiBold' }} className="text-gray-600 dark:text-slate-300">
                  إغلاق
                </Text>
              </Pressable>
            </View>

            <ScrollView className="max-h-[420px]" showsVerticalScrollIndicator={false}>
              {hasImageReport && report.fileUrl ? (
                <View className="mb-3">
                  <Image
                    source={{ uri: report.fileUrl }}
                    style={{ width: '100%', height: 210, borderRadius: 12, backgroundColor: isDark ? '#0F172A' : '#F1F5F9' }}
                    resizeMode="contain"
                  />
                  <Text
                    style={{ fontFamily: 'Cairo_500Medium' }}
                    className="text-gray-600 dark:text-slate-300 text-right mt-2"
                  >
                    الملف: {reportFileName}
                  </Text>
                </View>
              ) : null}

              <View className="mb-3">
                <Text style={{ fontFamily: 'Cairo_600SemiBold' }} className="text-gray-900 dark:text-slate-100 text-right">
                  {report.titleAr || report.title}
                </Text>
              </View>

              <View className="bg-gray-50 dark:bg-slate-800 rounded-2xl p-3 mb-3">
                <Text style={{ fontFamily: 'Cairo_500Medium' }} className="text-gray-700 dark:text-slate-200 text-right">
                  النوع: {getReportTypeLabel(report.type)}
                </Text>
                <Text style={{ fontFamily: 'Cairo_500Medium' }} className="text-gray-700 dark:text-slate-200 mt-1 text-right">
                  التاريخ: {report.date}
                </Text>
                <Text style={{ fontFamily: 'Cairo_500Medium' }} className="text-gray-700 dark:text-slate-200 mt-1 text-right">
                  الحالة: {report.status === 'ready' ? t.ready : t.pending}
                </Text>
              </View>

              <View className="bg-gray-50 dark:bg-slate-800 rounded-2xl p-3 mb-3">
                <Text style={{ fontFamily: 'Cairo_500Medium' }} className="text-gray-700 dark:text-slate-200 text-right">
                  المريض: {report.patientNameAr || patient?.nameAr || patient?.name || '-'}
                </Text>
                <Text style={{ fontFamily: 'Cairo_500Medium' }} className="text-gray-700 dark:text-slate-200 mt-1 text-right">
                  الطبيب: {report.doctorNameAr || '-'}
                </Text>
                {report.hospitalName ? (
                  <Text style={{ fontFamily: 'Cairo_500Medium' }} className="text-gray-700 dark:text-slate-200 mt-1 text-right">
                    المستشفى: {report.hospitalName}
                  </Text>
                ) : null}
                {report.hospitalLocation ? (
                  <Text style={{ fontFamily: 'Cairo_500Medium' }} className="text-gray-700 dark:text-slate-200 mt-1 text-right">
                    الموقع: {report.hospitalLocation}
                  </Text>
                ) : null}
                {hasReportFile ? (
                  <Text style={{ fontFamily: 'Cairo_500Medium' }} className="text-gray-700 dark:text-slate-200 mt-1 text-right">
                    الملف: {reportFileName}
                  </Text>
                ) : null}
              </View>

              <View className="bg-gray-50 dark:bg-slate-800 rounded-2xl p-3">
                <Text style={{ fontFamily: 'Cairo_600SemiBold' }} className="text-gray-900 dark:text-slate-100 mb-2 text-right">
                  ملخص التقرير
                </Text>
                <Text style={{ fontFamily: 'Cairo_400Regular' }} className="text-gray-600 dark:text-slate-300 leading-6 text-right">
                  {report.detailsAr || report.details || 'لا توجد تفاصيل إضافية.'}
                </Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
      <Stack.Screen
        options={{
          title: t.reportDetails,
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

        {/* Report Icon */}
        <FadeInDownView
          delay={100} duration={500}
          className="items-center mb-6"
        >
          <View
            className="w-24 h-24 rounded-2xl items-center justify-center"
            style={{ backgroundColor: bg }}
          >
            <Icon size={48} color={color} />
          </View>
        </FadeInDownView>

        {/* Report Title */}
        <FadeInDownView
          delay={200} duration={500}
          className="items-center mb-6"
        >
          <Text
            style={{ fontFamily: 'Cairo_700Bold', fontSize: 26 }}
            className="text-medical-text dark:text-slate-100 text-center"
          >
            {report.titleAr}
          </Text>
          <View
            className={`mt-3 px-4 py-1 rounded-full ${
              report.status === 'ready' ? 'bg-green-100 dark:bg-emerald-900/30' : 'bg-amber-100 dark:bg-amber-900/30'
            }`}
          >
            <Text
              style={{ fontFamily: 'Cairo_600SemiBold', fontSize: 16 }}
              className={`${
                report.status === 'ready' ? 'text-green-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'
              }`}
            >
              {report.status === 'ready' ? t.ready : t.pending}
            </Text>
          </View>
        </FadeInDownView>

        {/* Report Details */}
        <FadeInDownView
          delay={300} duration={500}
          className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden mb-6"
          style={{
            shadowColor: '#000',
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 2,
          }}
        >
          <View className="flex-row items-center p-4 border-b border-medical-border dark:border-slate-700">
            <Text
              style={{ fontFamily: 'Cairo_600SemiBold', fontSize: 18 }}
              className="text-medical-text dark:text-slate-100 flex-1 text-right"
            >
              {getReportTypeLabel(report.type)}
            </Text>
            <Text
              style={{ fontFamily: 'Cairo_400Regular', fontSize: 16 }}
              className="text-medical-textSecondary dark:text-slate-400 mx-3"
            >
              نوع التقرير
            </Text>
            <View
              className="w-10 h-10 rounded-xl items-center justify-center"
              style={{ backgroundColor: bg }}
            >
              <Icon size={20} color={color} />
            </View>
          </View>

          <View className="flex-row items-center p-4 border-b border-medical-border dark:border-slate-700">
            <Text
              style={{ fontFamily: 'Cairo_600SemiBold', fontSize: 18 }}
              className="text-medical-text dark:text-slate-100 flex-1 text-right"
            >
              {report.date}
            </Text>
            <Text
              style={{ fontFamily: 'Cairo_400Regular', fontSize: 16 }}
              className="text-medical-textSecondary dark:text-slate-400 mx-3"
            >
              {t.date}
            </Text>
            <View className="w-10 h-10 rounded-xl bg-cyan-100 dark:bg-cyan-900/30 items-center justify-center">
              <Calendar size={20} color="#0891B2" />
            </View>
          </View>

          <View className="flex-row items-center p-4">
            <Text
              style={{ fontFamily: 'Cairo_600SemiBold', fontSize: 18 }}
              className="text-medical-text dark:text-slate-100 flex-1 text-right"
            >
              {report.doctorNameAr}
            </Text>
            <Text
              style={{ fontFamily: 'Cairo_400Regular', fontSize: 16 }}
              className="text-medical-textSecondary dark:text-slate-400 mx-3"
            >
              {t.doctor}
            </Text>
            <View className="w-10 h-10 rounded-xl bg-green-100 dark:bg-emerald-900/30 items-center justify-center">
              <User size={20} color="#059669" />
            </View>
          </View>
        </FadeInDownView>

        {/* Report Content */}
        {(report.detailsAr || report.details) ? (
          <FadeInDownView
            delay={400} duration={500}
            className="bg-white dark:bg-slate-800 rounded-2xl p-5 mb-6"
            style={{
              shadowColor: '#000',
              shadowOpacity: 0.05,
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            <Text
              style={{ fontFamily: 'Cairo_700Bold', fontSize: 20 }}
              className="text-medical-text dark:text-slate-100 text-right mb-3"
            >
              ملخص التقرير
            </Text>
            <Text
              style={{ fontFamily: 'Cairo_400Regular', fontSize: 16 }}
              className="text-medical-textSecondary dark:text-slate-400 text-right leading-7"
            >
              {report.detailsAr || report.details}
            </Text>
          </FadeInDownView>
        ) : (
          <FadeInDownView
            delay={400} duration={500}
            className="bg-white dark:bg-slate-800 rounded-2xl p-5 mb-6 items-center"
            style={{
              shadowColor: '#000',
              shadowOpacity: 0.05,
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            <Text
              style={{ fontFamily: 'Cairo_500Medium', fontSize: 15 }}
              className="text-medical-textSecondary dark:text-slate-400 text-center"
            >
              {t.noReportContent}
            </Text>
          </FadeInDownView>
        )}

        {/* AI: suggested questions the patient can tap (not a free chat) */}
        {report.status === 'ready' && (report.suggestions?.length ?? 0) > 0 ? (
          <FadeInDownView
            delay={450} duration={500}
            className="bg-white dark:bg-slate-800 rounded-2xl p-5 mb-6"
            style={{
              shadowColor: '#000',
              shadowOpacity: 0.05,
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            <View className="flex-row items-center justify-end mb-3">
              <Text
                style={{ fontFamily: 'Cairo_700Bold', fontSize: 20 }}
                className="text-medical-text dark:text-slate-100 text-right mr-2"
              >
                {t.askAboutResult}
              </Text>
              <Sparkles size={20} color="#0891B2" />
            </View>
            <View className="flex-row flex-wrap justify-end">
              {(report.suggestions ?? []).map((question: string) => {
                const isSelected = selectedQuestion === question;
                return (
                  <Pressable
                    key={question}
                    onPress={() => {
                      setSelectedQuestion(question);
                      if (!report.answers?.[question]) ask.mutate(question);
                    }}
                    disabled={ask.isPending}
                    className={`rounded-2xl border px-4 py-2 mb-2 ml-2 ${
                      isSelected
                        ? 'bg-medical-primary border-medical-primary'
                        : 'bg-medical-primaryLight/40 dark:bg-cyan-900/20 border-cyan-200 dark:border-cyan-800'
                    }`}
                  >
                    <Text
                      style={{ fontFamily: 'Cairo_600SemiBold', fontSize: 14 }}
                      className={`text-right ${isSelected ? 'text-white' : 'text-medical-primaryDark dark:text-cyan-300'}`}
                    >
                      {question}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {selectedQuestion ? (
              <View className="bg-gray-50 dark:bg-slate-900 rounded-2xl p-4 mt-2">
                {report.answers?.[selectedQuestion] ? (
                  <Text
                    style={{ fontFamily: 'Cairo_400Regular', fontSize: 16 }}
                    className="text-medical-textSecondary dark:text-slate-300 text-right leading-7"
                  >
                    {report.answers[selectedQuestion]}
                  </Text>
                ) : ask.isError ? (
                  <Text style={{ fontFamily: 'Cairo_500Medium' }} className="text-red-600 text-right">
                    {ask.error instanceof Error ? ask.error.message : String(ask.error)}
                  </Text>
                ) : (
                  <ActivityIndicator size="small" color="#0891B2" />
                )}
              </View>
            ) : null}
            <Text
              style={{ fontFamily: 'Cairo_400Regular', fontSize: 12 }}
              className="text-medical-textMuted text-right mt-3"
            >
              {t.aiDisclaimer}
            </Text>
          </FadeInDownView>
        ) : null}

        {/* Actions */}
        {report.status === 'ready' && (
          <FadeInDownView
            delay={500} duration={500}
            className="gap-2 flex-row"
          >
            <Pressable
              onPress={handleDownload}
              className="flex-1 bg-medical-primary rounded-2xl py-4 flex-row items-center justify-center ml-3 active:opacity-80"
            >
              <Text
                style={{ fontFamily: 'Cairo_600SemiBold' }}
                className="text-white mr-2"
                numberOfLines={1}
              >
                {hasImageReport ? 'تحميل الصورة' : t.downloadReport}
              </Text>
              <Download size={20} color="#FFFFFF" />
            </Pressable>
            <Pressable
              onPress={handleView}
              className="flex-1 bg-medical-cardAlt dark:bg-slate-700 rounded-2xl py-4 flex-row items-center justify-center active:opacity-80"
            >
              <Text
                style={{ fontFamily: 'Cairo_600SemiBold' }}
                className="text-medical-text dark:text-slate-100 mr-2"
              >
                {t.viewReport}
              </Text>
              <Eye size={20} color="#0F172A" />
            </Pressable>
          </FadeInDownView>
        )}

        {report.status === 'pending' && (
          <FadeInDownView
            delay={500} duration={500}
            className="bg-amber-100 dark:bg-amber-900/30 rounded-2xl p-5"
          >
            <Text
              style={{ fontFamily: 'Cairo_500Medium' }}
              className="text-amber-700 dark:text-amber-200 text-center"
            >
              التقرير قيد الإعداد، سيتم إشعارك عند جاهزيته
            </Text>
          </FadeInDownView>
        )}
      </ScrollView>
    </View>
  );
}
