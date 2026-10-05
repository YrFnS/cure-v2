import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Linking,
  Alert,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import {
  Building2,
  MapPin,
  Phone,
  CheckCircle,
  XCircle,
} from 'lucide-react-native';
import { FadeInDownView } from '@/components/FadeInDownView';
import { useQuery } from '@tanstack/react-query';
import { getHospitalById } from '@/lib/api';
import { useSettingsStore } from '@/lib/settings-store';

export default function HospitalDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useSettingsStore(s => s.theme);
  const isDark = theme === 'dark';

  const { data: hospital, isLoading } = useQuery({
    queryKey: ['hospital-details', id],
    queryFn: () => getHospitalById(id),
    enabled: Boolean(id),
  });
  const isLinked = hospital?.status === 'linked';

  if (isLoading) {
    return (
      <View className="flex-1 bg-white dark:bg-slate-900">
        <Stack.Screen
          options={{
            title: 'تفاصيل المستشفى',
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
          <View>
            <View className="bg-white dark:bg-slate-800 rounded-2xl p-6 mb-4">
              <View className="h-24 bg-slate-200/80 dark:bg-slate-700 rounded-xl mb-3" />
              <View className="h-4 bg-slate-200/80 dark:bg-slate-700 rounded-md mb-2" />
              <View className="h-4 bg-slate-200/80 dark:bg-slate-700 rounded-md" />
            </View>
            {[0, 1].map((key) => (
              <View
                key={key}
                className="bg-white dark:bg-slate-800 rounded-2xl p-6 mb-4"
              >
                <View className="h-16 bg-slate-200/80 dark:bg-slate-700 rounded-xl mb-3" />
                <View className="h-4 bg-slate-200/80 dark:bg-slate-700 rounded-md" />
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }

  if (!hospital) {
    return (
      <View className="flex-1 bg-white dark:bg-slate-900 items-center justify-center p-5">
        <Stack.Screen
          options={{
            title: 'تفاصيل المستشفى',
            headerStyle: { backgroundColor: isDark ? '#0F172A' : '#FFFFFF' },
            headerTintColor: isDark ? '#E2E8F0' : '#0F172A',
            headerTitleStyle: { fontFamily: 'Cairo_700Bold', fontSize: 18, color: isDark ? '#E2E8F0' : '#0F172A' },
            headerShadowVisible: false,
          }}
        />
        <Building2 size={64} color="#94A3B8" />
        <Text
          style={{ fontFamily: 'Cairo_600SemiBold', fontSize: 18 }}
          className="text-gray-500 dark:text-slate-400 mt-4 text-center"
        >
          لم يتم العثور على المستشفى
        </Text>
      </View>
    );
  }

  const handleCall = () => {
    const phoneNumber = hospital.phone?.replace(/\s/g, '');
    if (!phoneNumber) {
      return;
    }
    Linking.openURL(`tel:${phoneNumber}`).catch(() => {
      Alert.alert('خطأ', 'تعذر فتح تطبيق الهاتف');
    });
  };

  return (
    <View className="flex-1 bg-white dark:bg-slate-900">
      <Stack.Screen
        options={{
          title: 'تفاصيل المستشفى',
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
        {/* Hospital Icon */}
        <FadeInDownView
          delay={100} duration={500}
          className="items-center mb-6"
        >
          <View className="w-28 h-28 rounded-3xl bg-teal-50 dark:bg-teal-900/30 items-center justify-center mb-4">
            <Building2 size={56} color="#0891B2" />
          </View>
        </FadeInDownView>

        {/* Hospital Name */}
        <FadeInDownView
          delay={150} duration={500}
          className="bg-gray-50 dark:bg-slate-800 rounded-2xl p-6 mb-4"
        >
          <Text
            style={{ fontFamily: 'Cairo_500Medium', fontSize: 14 }}
            className="text-gray-400 dark:text-slate-400 text-right mb-2"
          >
            اسم المستشفى
          </Text>
          <Text
            style={{ fontFamily: 'Cairo_700Bold', fontSize: 24 }}
            className="text-gray-900 dark:text-slate-100 text-right"
          >
            {hospital.name}
          </Text>
        </FadeInDownView>

        {/* Location */}
        <FadeInDownView
          delay={200} duration={500}
          className="bg-gray-50 dark:bg-slate-800 rounded-2xl p-6 mb-4"
        >
          <View className="flex-row items-center justify-end mb-2">
            <Text
              style={{ fontFamily: 'Cairo_500Medium', fontSize: 14 }}
              className="text-gray-400 dark:text-slate-400 mr-2"
            >
              الموقع
            </Text>
            <MapPin size={18} color="#94A3B8" />
          </View>
          <Text
            style={{ fontFamily: 'Cairo_700Bold', fontSize: 20 }}
            className="text-gray-900 dark:text-slate-100 text-right"
          >
            {hospital.location}
          </Text>
        </FadeInDownView>

        {/* Phone Number */}
        <FadeInDownView
          delay={250} duration={500}
          className="bg-gray-50 dark:bg-slate-800 rounded-2xl p-6 mb-4"
        >
          <View className="flex-row items-center justify-end mb-2">
            <Text
              style={{ fontFamily: 'Cairo_500Medium', fontSize: 14 }}
              className="text-gray-400 dark:text-slate-400 mr-2"
            >
              رقم الهاتف
            </Text>
            <Phone size={18} color="#94A3B8" />
          </View>
          <Text
            style={{ fontFamily: 'Cairo_700Bold', fontSize: 22 }}
            className="text-teal-600 dark:text-teal-300 text-right"
            selectable
          >
            {hospital.phone}
          </Text>
        </FadeInDownView>

        {/* Link Status */}
        <FadeInDownView
          delay={300} duration={500}
          className="bg-gray-50 dark:bg-slate-800 rounded-2xl p-6 mb-6"
        >
          <Text
            style={{ fontFamily: 'Cairo_500Medium', fontSize: 14 }}
            className="text-gray-400 dark:text-slate-400 text-right mb-3"
          >
            حالة الارتباط
          </Text>
          <View className="flex-row items-center justify-end">
            {isLinked ? (
              <>
                <Text
                  style={{ fontFamily: 'Cairo_700Bold', fontSize: 20 }}
                  className="text-green-600 dark:text-emerald-300 mr-3"
                >
                  مرتبط
                </Text>
                <View className="w-12 h-12 rounded-full bg-green-100 dark:bg-emerald-900/30 items-center justify-center">
                  <CheckCircle size={28} color="#16A34A" />
                </View>
              </>
            ) : (
              <>
                <Text
                  style={{ fontFamily: 'Cairo_700Bold', fontSize: 20 }}
                  className="text-red-500 dark:text-red-300 mr-3"
                >
                  غير مرتبط
                </Text>
                <View className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 items-center justify-center">
                  <XCircle size={28} color="#EF4444" />
                </View>
              </>
            )}
          </View>
        </FadeInDownView>

        {/* Call Button */}
        <FadeInDownView
          delay={350} duration={500}
        >
          <Pressable
            onPress={handleCall}
            className="bg-teal-500 rounded-2xl py-5 flex-row items-center justify-center active:bg-teal-600"
            style={{
              shadowColor: '#0891B2',
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <Text
              style={{ fontFamily: 'Cairo_700Bold', fontSize: 20 }}
              className="text-white mr-3"
            >
              اتصال بالمستشفى
            </Text>
            <Phone size={26} color="#FFFFFF" />
          </Pressable>
        </FadeInDownView>

        {/* Notice for unlinked hospitals */}
        {!isLinked && (
          <FadeInDownView
          delay={400} duration={500}
          className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-5 mt-4 border border-amber-100 dark:border-amber-900/30"
        >
          <Text
            style={{ fontFamily: 'Cairo_600SemiBold', fontSize: 14, lineHeight: 24 }}
            className="text-amber-700 dark:text-amber-200 text-right"
          >
            لربط هذا المستشفى بحسابك، يرجى مراجعة قسم الاستقبال مع إبراز هويتك ورقمك الطبي الموحد.
          </Text>
        </FadeInDownView>
        )}
      </ScrollView>
    </View>
  );
}
