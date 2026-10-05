import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  Linking,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import {
  Phone,
  Clock,
  User,
} from 'lucide-react-native';
import { FadeInDownView } from '@/components/FadeInDownView';
import { useSettingsStore, useTranslation } from '@/lib/settings-store';
import { useAuthStore } from '@/lib/auth-store';
import { resolveAssetUrl } from '@/lib/api/api';
import { useQuery } from '@tanstack/react-query';
import { getDoctorById } from '@/lib/api';
import type { Doctor } from '@/lib/types';

export default function DoctorDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const patient = useAuthStore(s => s.patient);
  const theme = useSettingsStore(s => s.theme);
  const isDark = theme === 'dark';

  const { data: doctor, isLoading } = useQuery<Doctor>({
    queryKey: ['doctor-details', id],
    queryFn: () => getDoctorById(id),
    enabled: Boolean(id),
  });
  const [imageFailed, setImageFailed] = useState(false);

  if (isLoading) {
    return (
      <View className="flex-1 bg-medical-bg dark:bg-slate-900">
        <Stack.Screen
          options={{
            title: 'تفاصيل الطبيب',
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
          <View>
            <View className="bg-white dark:bg-slate-800 rounded-2xl p-6 mb-6">
              <View className="h-24 bg-slate-200/80 dark:bg-slate-700 rounded-xl mb-3" />
              <View className="h-4 bg-slate-200/80 dark:bg-slate-700 rounded-md mb-2" />
              <View className="h-4 bg-slate-200/80 dark:bg-slate-700 rounded-md" />
            </View>
            <View className="bg-white dark:bg-slate-800 rounded-2xl p-5 mb-6">
              <View className="h-16 bg-slate-200/80 dark:bg-slate-700 rounded-xl mb-3" />
              <View className="h-4 bg-slate-200/80 dark:bg-slate-700 rounded-md mb-2" />
              <View className="h-4 bg-slate-200/80 dark:bg-slate-700 rounded-md" />
            </View>
            <View className="bg-white dark:bg-slate-800 rounded-2xl p-5 mb-6">
              <View className="h-16 bg-slate-200/80 dark:bg-slate-700 rounded-xl mb-3" />
              <View className="h-4 bg-slate-200/80 dark:bg-slate-700 rounded-md" />
            </View>
            <View className="flex-row">
              <View className="flex-1 bg-slate-200/80 dark:bg-slate-700 rounded-2xl py-6 ml-3" />
              <View className="flex-1 bg-slate-200/80 dark:bg-slate-700 rounded-2xl py-6" />
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  if (!doctor) {
    return (
      <View className="flex-1 bg-medical-bg dark:bg-slate-900 items-center justify-center">
        <Text
          style={{ fontFamily: 'Cairo_500Medium' }}
          className="text-medical-textSecondary dark:text-slate-400"
        >
          الطبيب غير موجود
        </Text>
      </View>
    );
  }

  const handleCall = () => {
    if (doctor?.phone) {
      Linking.openURL(`tel:${doctor.phone}`);
    }
  };

  const dayLabels: Record<string, string> = {
    Sunday: 'الأحد',
    Monday: 'الاثنين',
    Tuesday: 'الثلاثاء',
    Wednesday: 'الأربعاء',
    Thursday: 'الخميس',
    Friday: 'الجمعة',
    Saturday: 'السبت',
  };
  const availableDays = Array.isArray(doctor.availableDays)
    ? doctor.availableDays
    : doctor.availableDays && typeof doctor.availableDays === 'object'
      ? Object.keys(doctor.availableDays)
      : [];

  return (
    <View className="flex-1 bg-medical-bg dark:bg-slate-900">
      <Stack.Screen
        options={{
          title: 'تفاصيل الطبيب',
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

        {/* Doctor Profile */}
        <FadeInDownView
          delay={100} duration={500}
          className="bg-white dark:bg-slate-800 rounded-2xl p-6 items-center mb-6"
          style={{
            shadowColor: '#000',
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: 3,
          }}
        >
          {resolveAssetUrl(doctor.photo) && !imageFailed ? (
            <Image
              source={{ uri: resolveAssetUrl(doctor.photo) }}
              className="w-32 h-32 rounded-2xl mb-4"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <View className="w-32 h-32 rounded-2xl bg-gray-100 dark:bg-slate-700 items-center justify-center mb-4">
              <User size={32} color="#94A3B8" />
            </View>
          )}
          <Text
            style={{ fontFamily: 'Cairo_700Bold' }}
            className="text-medical-text dark:text-slate-100 text-2xl text-center"
          >
            {doctor.nameAr}
          </Text>
          {doctor.specialtyAr ? (
            <Text
              style={{ fontFamily: 'Cairo_500Medium' }}
              className="text-medical-primary dark:text-cyan-300 text-lg mt-1"
            >
              {doctor.specialtyAr}
            </Text>
          ) : null}
          {doctor.departmentAr ? (
            <Text
              // style={{ fontFamily: 'Cairo_400Regular' }}
              // className="text-medical-textSecondary dark:text-slate-400 text-sm mt-1"
            >
              {/* {doctor.departmentAr} */}
            </Text>
          ) : null}

        </FadeInDownView>

        {/* Available Days */}
        <FadeInDownView
          delay={300} duration={500}
          className="bg-white dark:bg-slate-800 rounded-2xl p-5 mb-6"
          style={{
            shadowColor: '#000',
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 2,
          }}
        >
          <View className="flex-row items-center justify-end mb-4">
            <Text
              style={{ fontFamily: 'Cairo_600SemiBold' }}
              className="text-medical-text dark:text-slate-100 text-lg"
            >
              أيام العمل
            </Text>
            <View style={{ marginLeft: 8 }}>
              <Clock size={20} color="#0891B2" />
            </View>
          </View>
          <View className="flex-row flex-wrap justify-end">
            {availableDays.length > 0 ? (
              availableDays.map((day, index) => (
              <View
                key={index}
                className="bg-cyan-100 dark:bg-cyan-900/30 px-4 py-2 rounded-lg m-1"
              >
                <Text
                  style={{ fontFamily: 'Cairo_500Medium' }}
                  className="text-cyan-700 dark:text-cyan-300 text-sm"
                >
                  {dayLabels[day] || day}
                </Text>
              </View>
              ))
            ) : (
              <View className="bg-gray-100 dark:bg-slate-700 rounded-lg px-4 py-2">
                <Text
                  style={{ fontFamily: 'Cairo_500Medium' }}
                  className="text-gray-500 dark:text-slate-300 text-sm"
                >
                  لا توجد بيانات
                </Text>
              </View>
            )}
          </View>
        </FadeInDownView>

        {/* Actions */}
        <FadeInDownView
          delay={500} duration={500}
          className="flex-row gap-2"
        >
          <Pressable
            onPress={handleCall}
            className="flex-1 bg-green-100 dark:bg-emerald-900/30 rounded-2xl py-4 flex-row items-center justify-center active:opacity-80"
          >
            <Text
              style={{ fontFamily: 'Cairo_600SemiBold' }}
              className="text-green-700 dark:text-emerald-300 mr-2"
            >
              {t.call}
            </Text>
            <Phone size={20} color="#059669" />
          </Pressable>
        </FadeInDownView>
      </ScrollView>
    </View>
  );
}
