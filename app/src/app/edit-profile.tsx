import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  Alert,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import {
  User,
  Phone,
  Mail,
  MapPin,
  AlertCircle,
  Camera,
  Calendar,
  Droplet,
  Heart,
  UserCircle,
} from 'lucide-react-native';
import { FadeInDownView } from '@/components/FadeInDownView';
import { useAuthStore } from '@/lib/auth-store';
import * as ImagePicker from 'expo-image-picker';
import { updateProfile } from '@/lib/api';
import { useSettingsStore, useTranslation } from '@/lib/settings-store';
import { resolveAssetUrl } from '@/lib/api/api';

export default function EditProfileScreen() {
  const router = useRouter();
  const patient = useAuthStore(s => s.patient);
  const updatePatient = useAuthStore(s => s.updatePatient);
  const theme = useSettingsStore(s => s.theme);
  const isDark = theme === 'dark';
  const { t } = useTranslation();

  const [profileImage, setProfileImage] = useState(
    patient?.profileImage || ''
  );
  const [profileImageBase64, setProfileImageBase64] = useState<string | null>(null);
  const [profileImageMime, setProfileImageMime] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleChangePhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setProfileImage(asset.uri);
      setProfileImageBase64(asset.base64 ?? null);
      setProfileImageMime((asset as { mimeType?: string }).mimeType ?? 'image/jpeg');
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updated = await updateProfile({
        profileImageBase64: profileImageBase64 ?? undefined,
        profileImageMime: profileImageMime ?? undefined,
        profileImage: profileImageBase64 ? undefined : profileImage,
      });
      updatePatient({ profileImage: updated.profileImage ?? profileImage });
      Alert.alert('تم', 'تم تحديث الصورة الشخصية بنجاح');
      router.back();
    } catch (error) {
      Alert.alert('خطأ', error instanceof Error ? error.message : 'تعذر تحديث الصورة');
    } finally {
      setIsSaving(false);
    }
  };

  // Patient info fields (read-only display)
  const infoFields = [
    {
      label: 'الاسم الكامل',
      value: patient?.nameAr || (patient as any)?.fullNameAr || patient?.name || (patient as any)?.fullName || '--',
      icon: User,
    },
    {
      label: 'تاريخ الميلاد',
      value: patient?.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString('ar-IQ') : '--',
      icon: Calendar,
    },
    {
      label: 'الجنس',
      value: patient?.gender === 'male' ? 'ذكر' : patient?.gender === 'female' ? 'أنثى' : '--',
      icon: UserCircle,
    },
    {
      label: 'فصيلة الدم',
      value: patient?.bloodType || '--',
      icon: Droplet,
    },
    {
      label: t.maritalStatus,
      value: patient?.maritalStatus || '--',
      icon: Heart,
    },
    {
      label: 'رقم الهاتف',
      value: patient?.phone || '--',
      icon: Phone,
    },
    {
      label: 'البريد الإلكتروني',
      value: patient?.email || '--',
      icon: Mail,
    },
    {
      label: 'العنوان',
      value: patient?.address || '--',
      icon: MapPin,
    },
    {
      label: 'جهة اتصال الطوارئ',
      value:
        patient?.emergencyContact ||
        (patient as any)?.emergencyPhone ||
        (patient as any)?.emergency_contact ||
        patient?.phone ||
        '--',
      icon: AlertCircle,
    },
  ];
  const profileImageUri = resolveAssetUrl(profileImage);

  return (
    <View className="flex-1 bg-white dark:bg-slate-900">
      <Stack.Screen
        options={{
          title: 'تعديل الملف الشخصي',
          headerStyle: { backgroundColor: isDark ? '#0F172A' : '#FFFFFF' },
          headerTintColor: isDark ? '#E2E8F0' : '#0F172A',
          headerTitleStyle: { fontFamily: 'Cairo_700Bold', fontSize: 18, color: isDark ? '#E2E8F0' : '#0F172A' },
          headerShadowVisible: false,
          presentation: 'modal',
        }}
      />
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Photo Section */}
        <FadeInDownView
          delay={100} duration={500}
          className="items-center mb-8"
        >
          <View className="relative">
            {profileImageUri ? (
              <Image
                source={{ uri: profileImageUri }}
                className="w-36 h-36 rounded-full"
                style={{ borderWidth: 4, borderColor: '#0891B2' }}
              />
            ) : (
              <View
                className="w-36 h-36 rounded-full bg-gray-100 dark:bg-slate-700 items-center justify-center"
                style={{ borderWidth: 4, borderColor: '#0891B2' }}
              >
                <User size={34} color="#94A3B8" />
              </View>
            )}
            <Pressable
              onPress={handleChangePhoto}
              className="absolute bottom-0 right-0 w-12 h-12 rounded-full bg-teal-500 items-center justify-center"
              style={{
                shadowColor: '#000',
                shadowOpacity: 0.2,
                shadowRadius: 4,
                elevation: 4,
              }}
            >
              <Camera size={22} color="#FFFFFF" />
            </Pressable>
          </View>
          <Text
            style={{ fontFamily: 'Cairo_600SemiBold', fontSize: 16 }}
            className="text-teal-600 dark:text-teal-300 mt-4"
          >
            اضغط على أيقونة الكاميرا لتغيير الصورة
          </Text>
        </FadeInDownView>

        {/* Read-Only Info Section */}
        <FadeInDownView
          delay={200} duration={500}
          className="mb-6"
        >
          <Text
            style={{ fontFamily: 'Cairo_700Bold', fontSize: 18 }}
            className="text-gray-900 dark:text-slate-100 text-right mb-4"
          >
            المعلومات الشخصية
          </Text>

          <View className="bg-gray-50 dark:bg-slate-800 rounded-2xl p-4">
            {infoFields.map((field, index) => (
              <View
                key={field.label}
                className={`flex-row items-center justify-end py-4 ${
                  index < infoFields.length - 1 ? 'border-b border-gray-200 dark:border-slate-700' : ''
                }`}
              >
                <View className="flex-1 items-end mr-4">
                  <Text
                    style={{ fontFamily: 'Cairo_500Medium', fontSize: 12 }}
                    className="text-gray-400 dark:text-slate-400 mb-1"
                  >
                    {field.label}
                  </Text>
                  <Text
                    style={{ fontFamily: 'Cairo_600SemiBold', fontSize: 16 }}
                    className="text-gray-900 dark:text-slate-100"
                  >
                    {field.value}
                  </Text>
                </View>
                <View className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-slate-700 items-center justify-center">
                  <field.icon size={20} color="#64748B" />
                </View>
              </View>
            ))}
          </View>
        </FadeInDownView>

        {/* Notice */}
        <FadeInDownView
          delay={300} duration={500}
          className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-5 mb-6 border border-amber-100 dark:border-amber-900/30"
        >
          <Text
            style={{ fontFamily: 'Cairo_600SemiBold', fontSize: 14, lineHeight: 24 }}
            className="text-amber-700 dark:text-amber-200 text-right"
          >
            ملاحظة: المعلومات الشخصية للقراءة فقط ولا يمكن تعديلها من التطبيق.
            لتحديث أي معلومات، يرجى مراجعة قسم الاستقبال في المستشفى.
          </Text>
        </FadeInDownView>

        {/* Save Button */}
        <FadeInDownView
          delay={350} duration={500}
        >
          <Pressable
            onPress={handleSave}
            disabled={isSaving}
            className={`rounded-2xl py-4 flex-row items-center justify-center ${
              isSaving ? 'bg-teal-300' : 'bg-teal-500 active:bg-teal-600'
            }`}
            style={{
              shadowColor: '#0891B2',
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <Text
              style={{ fontFamily: 'Cairo_700Bold', fontSize: 18 }}
              className="text-white"
            >
              {isSaving ? 'جارٍ الحفظ...' : 'حفظ الصورة'}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.back()}
            className="bg-gray-100 dark:bg-slate-800 rounded-2xl py-4 flex-row items-center justify-center mt-3 active:bg-gray-200 dark:active:bg-slate-700"
          >
            <Text
              style={{ fontFamily: 'Cairo_600SemiBold', fontSize: 16 }}
              className="text-gray-700 dark:text-slate-200"
            >
              إلغاء
            </Text>
          </Pressable>
        </FadeInDownView>
      </ScrollView>
    </View>
  );
}
