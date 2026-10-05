import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  User,
  Settings,
  Edit3,
  ChevronLeft,
  FileText,
  Building2,
  Calendar,
  UserCircle,
  Droplet,
  Heart,
  Phone,
  Mail,
  MapPin,
  AlertCircle,
} from 'lucide-react-native';
import { FadeInDownView } from '@/components/FadeInDownView';
import { useAuthStore } from '@/lib/auth-store';
import { useTranslation } from '@/lib/settings-store';
import { resolveAssetUrl } from '@/lib/api/api';
import { useQuery } from '@tanstack/react-query';
import { getLinkedHospitals } from '@/lib/api';
import type { Hospital } from '@/lib/types';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();
  const patient = useAuthStore(s => s.patient);
  const { data: linkedHospitals = [], isLoading } = useQuery<Hospital[]>({
    queryKey: ['linked-hospitals'],
    queryFn: getLinkedHospitals,
  });

  // Default values pulled from the normalized patient store (no fabricated/empty stubs).
  const patientData = {
    displayName: patient?.nameAr || (patient as any)?.fullNameAr || patient?.name || (patient as any)?.fullName || null,
    mrn: patient?.mrn || null,
    profileImage: patient?.profileImage || null,
  };
  const profileImageUri = resolveAssetUrl(patientData.profileImage);

  const formatDate = (value?: string) => {
    if (!value) return null;
    const date = new Date(value);
    if (isNaN(date.getTime())) return value;
    return date.toLocaleDateString();
  };

  const genderLabel =
    patient?.gender === 'male' ? t.male : patient?.gender === 'female' ? t.female : null;

  type ProfileFieldIcon = React.ComponentType<{ size?: number; color?: string }>;
  const personalInfoFields: {
    label: string;
    value: string | null;
    icon: ProfileFieldIcon;
  }[] = [
    { label: t.dateOfBirth, value: formatDate(patient?.dateOfBirth), icon: Calendar },
    { label: t.gender, value: genderLabel, icon: UserCircle },
    { label: t.bloodType, value: patient?.bloodType || null, icon: Droplet },
    { label: t.maritalStatus, value: patient?.maritalStatus || null, icon: Heart },
    { label: t.phone, value: patient?.phone || null, icon: Phone },
    { label: t.email, value: patient?.email || null, icon: Mail },
    { label: t.address, value: patient?.address || null, icon: MapPin },
    { label: t.emergencyContact, value: patient?.emergencyContact || null, icon: AlertCircle },
  ];

  return (
    <View className="flex-1 bg-white dark:bg-slate-900">
      {/* Header */}
      <LinearGradient
        colors={['#0891B2', '#0E7490']}
        style={{ paddingTop: insets.top, paddingBottom: 24 }}
      >
        <View className="px-5 py-4">
          <View className="flex-row items-center justify-between">
            <Pressable
              onPress={() => router.push('/settings')}
              className="w-12 h-12 rounded-full bg-white/20 items-center justify-center"
            >
              <Settings size={24} color="#FFFFFF" />
            </Pressable>
            <Text
              style={{ fontFamily: 'Cairo_700Bold', fontSize: 22 }}
              className="text-white"
            >
              {t.account}
            </Text>
            <View className="w-12" />
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{
          paddingBottom: 40,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card with Photo */}
        <FadeInDownView
          delay={100} duration={500}
          className="mx-5 mt-4"
        >
          <View
            className="bg-white dark:bg-slate-800 rounded-3xl p-6 items-center"
            style={{
              shadowColor: '#000',
              shadowOpacity: 0.1,
              shadowRadius: 12,
              elevation: 5,
            }}
          >
            <View className="relative">
              {profileImageUri ? (
                <Image
                  source={{ uri: profileImageUri }}
                  className="w-32 h-32 rounded-full"
                  style={{ borderWidth: 4, borderColor: '#0891B2' }}
                />
              ) : (
                <View
                  className="w-32 h-32 rounded-full bg-gray-200 dark:bg-slate-700 items-center justify-center"
                  style={{ borderWidth: 4, borderColor: '#0891B2' }}
                >
                  <User size={36} color="#94A3B8" />
                </View>
              )}
              <Pressable
                onPress={() => router.push('/edit-profile')}
                className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-teal-500 items-center justify-center"
              >
                <Edit3 size={18} color="#FFFFFF" />
              </Pressable>
            </View>

            <Text
              style={{ fontFamily: 'Cairo_700Bold', fontSize: 28 }}
              className="text-gray-900 dark:text-slate-100 mt-4"
            >
              {patientData.displayName || '—'}
            </Text>

            {/* MRN Badge */}
            <View className="flex-row gap-1 justify-center items-center mt-3 bg-teal-100 dark:bg-teal-900/30 px-6 py-3 rounded-full">
              <Text
                style={{ fontFamily: 'Cairo_700Bold', fontSize: 20 }}
                className="text-teal-700 dark:text-teal-300"
              >
                {patientData.mrn || '—'}
              </Text>
              <Text
                style={{ fontFamily: 'Cairo_500Medium', fontSize: 14 }}
                className="text-teal-600 dark:text-teal-300 mr-2"
              >
                {t.medicalNumber}:
              </Text>
              <FileText size={20} color="#0891B2" />
            </View>
          </View>
        </FadeInDownView>

        {/* Personal Information */}
        <FadeInDownView
          delay={200} duration={500}
          className="mx-5 mt-6"
        >
          <Text
            style={{ fontFamily: 'Cairo_700Bold', fontSize: 20 }}
            className="text-gray-900 dark:text-slate-100 text-right mb-4"
          >
            {t.personalInfo}
          </Text>

          <View className="bg-gray-50 dark:bg-slate-800 rounded-3xl p-4">
            {personalInfoFields.map((field, index) => (
              <View
                key={field.label}
                className={`flex-row items-center justify-end py-4 ${
                  index < personalInfoFields.length - 1 ? 'border-b border-gray-200 dark:border-slate-700' : ''
                }`}
              >
                <View className="flex-1 items-end mr-3">
                  <Text
                    style={{ fontFamily: 'Cairo_500Medium', fontSize: 12 }}
                    className="text-gray-400 dark:text-slate-400 mb-1"
                  >
                    {field.label}
                  </Text>
                  <Text
                    style={{ fontFamily: 'Cairo_600SemiBold', fontSize: 16 }}
                    className={
                      field.value
                        ? 'text-gray-900 dark:text-slate-100'
                        : 'text-gray-400 dark:text-slate-500'
                    }
                  >
                    {field.value ?? t.notSpecified}
                  </Text>
                </View>
                <View className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-900/30 items-center justify-center">
                  <field.icon size={20} color="#0891B2" />
                </View>
              </View>
            ))}
          </View>
        </FadeInDownView>

        {/* Connected Hospitals */}
        <FadeInDownView
          delay={300} duration={500}
          className="mx-5 mt-8"
        >
          <View className="flex-row items-center justify-between mb-4">
            <Pressable
              onPress={() => router.push('/hospitals')}
              className="flex-row items-center"
            >
              <ChevronLeft size={20} color="#0891B2" />
              <Text
                style={{ fontFamily: 'Cairo_600SemiBold', fontSize: 14 }}
                className="text-teal-600 dark:text-teal-300"
              >
                {t.viewAll}
              </Text>
            </Pressable>
            <Text
              style={{ fontFamily: 'Cairo_700Bold', fontSize: 20 }}
              className="text-gray-900 dark:text-slate-100"
            >
              {t.supportedHospitals}
            </Text>
          </View>

          <View className="bg-gray-50 dark:bg-slate-800 rounded-3xl p-4">
            {isLoading ? (
              <View className="space-y-3">
                {[0, 1, 2].map((key) => (
                  <View key={key} className="bg-white dark:bg-slate-700 rounded-2xl p-4">
                    <View className="h-16 bg-slate-200/80 dark:bg-slate-600 rounded-xl mb-2" />
                    <View className="h-4 bg-slate-200/80 dark:bg-slate-600 rounded-md" />
                  </View>
                ))}
              </View>
            ) : (
              <View className="space-y-3">
                {linkedHospitals.length > 0 ? (
                  linkedHospitals.slice(0, 3).map((hospital, index) => (
                    <View
                      key={hospital.id}
                      className={`bg-white dark:bg-slate-700 rounded-2xl p-4 ${index < Math.min(linkedHospitals.length, 3) - 1 ? 'mb-3' : ''}`}
                    >
                      <View className="flex-row items-center justify-end">
                        <View className="flex-1 items-end mr-3">
                          <Text
                            style={{ fontFamily: 'Cairo_700Bold', fontSize: 16 }}
                            className="text-gray-900 dark:text-slate-100"
                          >
                            {hospital.name}
                          </Text>
                          <Text
                            style={{ fontFamily: 'Cairo_500Medium', fontSize: 14 }}
                            className="text-gray-500 dark:text-slate-400 mt-1"
                          >
                            {hospital.location}
                          </Text>
                        </View>
                        <View className="w-12 h-12 rounded-xl bg-teal-100 dark:bg-teal-900/30 items-center justify-center">
                          <Building2 size={24} color="#0891B2" />
                        </View>
                      </View>
                    </View>
                  ))
                ) : (
                  <View className="bg-white dark:bg-slate-700 rounded-2xl p-4">
                    <Text
                      style={{ fontFamily: 'Cairo_500Medium', fontSize: 14 }}
                      className="text-gray-500 dark:text-slate-400 text-right"
                    >
                      {t.noSupportedHospitals}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {!isLoading && linkedHospitals.length > 3 && (
              <Pressable
                onPress={() => router.push('/hospitals')}
                className="bg-teal-50 dark:bg-teal-900/20 rounded-2xl p-4 mt-3 items-center"
              >
                <Text
                  style={{ fontFamily: 'Cairo_600SemiBold', fontSize: 14 }}
                  className="text-teal-600 dark:text-teal-300"
                >
                  +{linkedHospitals.length - 3} {t.otherHospitals}
                </Text>
              </Pressable>
            )}
          </View>
        </FadeInDownView>

        {/* Settings Link */}
        <FadeInDownView
          delay={400} duration={500}
          className="mx-5 mt-6"
        >
          <Pressable
            onPress={() => router.push('/settings')}
            className="bg-gray-100 dark:bg-slate-800 rounded-2xl p-4 flex-row items-center active:bg-gray-200"
          >
            <ChevronLeft size={24} color="#94A3B8" />
            <Text
              style={{ fontFamily: 'Cairo_600SemiBold', fontSize: 16 }}
              className="text-gray-700 dark:text-slate-200 flex-1 text-right mr-3"
            >
              {t.settings}
            </Text>
            <View className="w-12 h-12 rounded-xl bg-white dark:bg-slate-700 items-center justify-center">
              <Settings size={24} color="#64748B" />
            </View>
          </Pressable>
        </FadeInDownView>
      </ScrollView>
    </View>
  );
}
