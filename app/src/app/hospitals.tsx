import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import {
  Building2,
  MapPin,
  CheckCircle,
  ChevronLeft,
  Phone,
} from 'lucide-react-native';
import { FadeInDownView } from '@/components/FadeInDownView';
import { useSettingsStore } from '@/lib/settings-store';
import { useQuery } from '@tanstack/react-query';
import { getLinkedHospitals } from '@/lib/api';
import type { Hospital } from '@/lib/types';

export default function HospitalsScreen() {
  const router = useRouter();
  const theme = useSettingsStore(s => s.theme);
  const isDark = theme === 'dark';
  const { data: linkedHospitals = [], isLoading } = useQuery<Hospital[]>({
    queryKey: ['linked-hospitals'],
    queryFn: getLinkedHospitals,
  });

  return (
    <View className="flex-1 bg-white dark:bg-slate-900">
      <Stack.Screen
        options={{
          title: 'المستشفيات الداعمة',
          headerStyle: { backgroundColor: isDark ? '#0F172A' : '#FFFFFF' },
          headerTintColor: isDark ? '#E2E8F0' : '#0F172A',
          headerTitleStyle: { fontFamily: 'Cairo_700Bold', fontSize: 18, color: isDark ? '#E2E8F0' : '#0F172A' },
          headerShadowVisible: false,
        }}
      />

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Info */}
        <FadeInDownView
          delay={100} duration={500}
          className="bg-teal-50 dark:bg-teal-900/20 rounded-2xl p-5 mb-6 border border-teal-100 dark:border-teal-900/40"
        >
          <View className="flex-row items-center justify-end mb-3">
            <Text
              style={{ fontFamily: 'Cairo_700Bold', fontSize: 18 }}
              className="text-teal-800 dark:text-teal-200 mr-3"
            >
              المستشفيات المرتبطة بحسابك
            </Text>
            <View className="w-12 h-12 rounded-xl bg-teal-100 dark:bg-teal-900/40 items-center justify-center">
              <Building2 size={24} color="#0891B2" />
            </View>
          </View>
          <Text
            style={{ fontFamily: 'Cairo_500Medium', fontSize: 14, lineHeight: 24 }}
            className="text-teal-700 dark:text-teal-200 text-right"
          >
            هذه قائمة بالمستشفيات التي يمكنك الوصول إلى سجلاتك الطبية من خلالها باستخدام الرقم الطبي الموحد.
          </Text>
        </FadeInDownView>

        {/* Connected Hospitals Count */}
        <FadeInDownView
          delay={150} duration={500}
          className="bg-gray-50 dark:bg-slate-800 rounded-2xl p-5 mb-6"
        >
          <View className="flex-row items-center justify-center">
            <View className="items-center">
              <Text
                style={{ fontFamily: 'Cairo_700Bold', fontSize: 48 }}
                className="text-teal-600 dark:text-teal-300"
              >
                {isLoading ? '—' : linkedHospitals.length}
              </Text>
              <Text
                style={{ fontFamily: 'Cairo_600SemiBold', fontSize: 16 }}
                className="text-gray-600 dark:text-slate-300"
              >
                مستشفى مرتبط
              </Text>
            </View>
          </View>
        </FadeInDownView>

        {/* Hospitals List */}
        <Text
          style={{ fontFamily: 'Cairo_700Bold', fontSize: 18 }}
          className="text-gray-900 dark:text-slate-100 text-right mb-4"
        >
          المستشفيات المرتبطة
        </Text>

        {isLoading ? (
          <View className="space-y-3">
            {[0, 1, 2].map((key) => (
              <View
                key={key}
                className="bg-white dark:bg-slate-800 rounded-2xl p-5 mb-3 border border-gray-100 dark:border-slate-700"
                style={{
                  shadowColor: '#000',
                  shadowOpacity: 0.05,
                  shadowRadius: 6,
                  elevation: 2,
                }}
              >
                <View className="h-20 bg-slate-200/80 dark:bg-slate-700 rounded-xl mb-3" />
                <View className="h-4 bg-slate-200/80 dark:bg-slate-700 rounded-md mb-2" />
                <View className="h-4 bg-slate-200/80 dark:bg-slate-700 rounded-md" />
              </View>
            ))}
          </View>
        ) : linkedHospitals.length > 0 ? (
          linkedHospitals.map((hospital, index) => (
            <FadeInDownView
              key={hospital.id}
              delay={200 + index * 50} duration={500}
            >
              <Pressable
                onPress={() => router.push({ pathname: '/hospital-details', params: { id: hospital.id } })}
                className="bg-white dark:bg-slate-800 rounded-2xl p-5 mb-4 border border-gray-100 dark:border-slate-700 active:scale-98"
                style={{
                  shadowColor: '#000',
                  shadowOpacity: 0.05,
                  shadowRadius: 8,
                  elevation: 2,
                }}
              >
                <View className="flex-row items-start justify-end">
                  <View className="flex-1 mr-4">
                    {/* Hospital Name */}
                    <Text
                      style={{ fontFamily: 'Cairo_700Bold', fontSize: 18 }}
                      className="text-gray-900 dark:text-slate-100 text-right mb-2"
                    >
                      {hospital.name}
                    </Text>

                    {/* Location */}
                    <View className="flex-row items-center justify-end mb-2">
                      <Text
                        style={{ fontFamily: 'Cairo_500Medium', fontSize: 14 }}
                        className="text-gray-500 dark:text-slate-400 mr-2"
                      >
                        {hospital.location}
                      </Text>
                      <MapPin size={16} color="#94A3B8" />
                    </View>

                    {/* Phone Number */}
                    <View className="flex-row items-center justify-end mb-3">
                      <Text
                        style={{ fontFamily: 'Cairo_500Medium', fontSize: 14 }}
                        className="text-teal-600 dark:text-teal-300 mr-2"
                      >
                        {hospital.phone}
                      </Text>
                      <Phone size={16} color="#0891B2" />
                    </View>

                    {/* Status Badge */}
                    <View className="flex-row items-center justify-end">
                      <View className="bg-green-100 dark:bg-emerald-900/30 px-4 py-2 rounded-full flex-row items-center">
                        <Text
                          style={{ fontFamily: 'Cairo_600SemiBold', fontSize: 14 }}
                          className="text-green-700 dark:text-emerald-300 mr-2"
                        >
                          مرتبط
                        </Text>
                        <CheckCircle size={16} color="#15803D" />
                      </View>
                    </View>
                  </View>

                  {/* Hospital Icon + Arrow */}
                  <View className="items-center">
                    <View className="w-16 h-16 rounded-2xl bg-teal-50 dark:bg-teal-900/30 items-center justify-center mb-2">
                      <Building2 size={32} color="#0891B2" />
                    </View>
                    <ChevronLeft size={20} color="#94A3B8" />
                  </View>
                </View>
              </Pressable>
            </FadeInDownView>
          ))
        ) : (
          <FadeInDownView
            delay={200} duration={500}
            className="bg-gray-50 dark:bg-slate-800 rounded-2xl p-8 items-center"
          >
            <Building2 size={56} color="#94A3B8" />
            <Text
              style={{ fontFamily: 'Cairo_600SemiBold', fontSize: 16 }}
              className="text-gray-500 dark:text-slate-300 mt-4 text-center"
            >
              لا توجد مستشفيات مرتبطة حالياً
            </Text>
            <Text
              style={{ fontFamily: 'Cairo_500Medium', fontSize: 14 }}
              className="text-gray-400 dark:text-slate-400 mt-2 text-center"
            >
              يرجى مراجعة أحد المستشفيات الداعمة لربط حسابك
            </Text>
          </FadeInDownView>
        )}

        {/* Info Notice */}
        <FadeInDownView
          delay={400} duration={500}
          className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-5 mt-4 border border-amber-100 dark:border-amber-900/30"
        >
          <Text
            style={{ fontFamily: 'Cairo_600SemiBold', fontSize: 14, lineHeight: 24 }}
            className="text-amber-700 dark:text-amber-200 text-right"
          >
            ملاحظة: لربط مستشفى جديد، يرجى مراجعة قسم الاستقبال في المستشفى مع إبراز هويتك ورقمك الطبي الموحد.
          </Text>
        </FadeInDownView>
      </ScrollView>
    </View>
  );
}
