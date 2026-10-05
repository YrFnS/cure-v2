import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  TextInput,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import {
  Search,
  Phone,
  Filter,
  X,
  ChevronDown,
  User,
} from 'lucide-react-native';
import { FadeInDownView } from '@/components/FadeInDownView';
import { useTranslation } from '@/lib/settings-store';
import { useAuthStore } from '@/lib/auth-store';
import { resolveAssetUrl } from '@/lib/api/api';
import { useQuery } from '@tanstack/react-query';
import { getLinkedDoctors } from '@/lib/api';
import type { Doctor } from '@/lib/types';

export default function DoctorsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();
  const patient = useAuthStore(s => s.patient);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [brokenDoctorImages, setBrokenDoctorImages] = useState<Record<string, boolean>>({});

  const patientScope = patient?.id || patient?.mrn || 'guest';
  const { data: doctors = [], isLoading, refetch } = useQuery<Doctor[]>({
    queryKey: ['linked-doctors', patientScope],
    queryFn: () => getLinkedDoctors(),
    enabled: Boolean(patientScope && patientScope !== 'guest'),
    placeholderData: [],
    staleTime: 0,
    refetchOnMount: true,
    refetchOnReconnect: true,
    refetchInterval: 3000,
    refetchIntervalInBackground: false,
  });

  useFocusEffect(
    useCallback(() => {
      if (!patientScope || patientScope === 'guest') return;
      void refetch();
    }, [patientScope, refetch]),
  );


  const specialties = useMemo(() => {
    const values = new Map<string, { id: string; nameAr: string }>();
    doctors.forEach((doctor: any) => {
      if (doctor.specialtyAr) {
        values.set(doctor.specialtyAr, { id: doctor.specialtyAr, nameAr: doctor.specialtyAr });
      }
    });
    return Array.from(values.values());
  }, [doctors]);

  const filteredDoctors = useMemo(() => {
    return doctors.filter((doctor: any) => {
      const matchesSearch =
        doctor.nameAr?.includes(searchQuery) ||
        doctor.specialtyAr?.includes(searchQuery) ||
        doctor.name?.includes(searchQuery) ||
        doctor.specialty?.includes(searchQuery);

      const matchesSpecialty =
        !selectedSpecialty || doctor.specialtyAr === selectedSpecialty;

      return matchesSearch && matchesSpecialty;
    });
  }, [doctors, searchQuery, selectedSpecialty]);

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const clearFilters = () => {
    setSelectedSpecialty(null);
    setShowFilters(false);
  };

  return (
    <View className="flex-1 bg-medical-bg dark:bg-slate-900">
      {/* Header */}
      <LinearGradient
        colors={['#0891B2', '#0E7490']}
        style={{ paddingTop: insets.top + 16, paddingBottom: 16, paddingHorizontal: 20 }}
      >
        <View className="flex-row items-center justify-between mb-4">
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
            {t.doctors}
          </Text>
        </View>

        {/* Search Bar */}
        <View className="flex-row items-center bg-white dark:bg-slate-800 rounded-xl px-4">
          <Search size={20} color="#94A3B8" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t.searchDoctors}
            placeholderTextColor="#94A3B8"
            className="flex-1 py-3 px-3 text-medical-text dark:text-slate-100 text-right"
            style={{ fontFamily: 'Cairo_400Regular' }}
          />
          {searchQuery ? (
            <Pressable onPress={() => setSearchQuery('')}>
              <X size={20} color="#94A3B8" />
            </Pressable>
          ) : null}
        </View>

        {/* Filter Button */}
        <Pressable
          onPress={() => setShowFilters(!showFilters)}
          className={`flex-row items-center justify-center mt-3 py-2 rounded-xl ${
            showFilters || selectedSpecialty
              ? 'bg-white'
              : 'bg-white/20'
          }`}
        >
          <ChevronDown
            size={18}
            color={showFilters || selectedSpecialty ? '#0891B2' : '#FFFFFF'}
            style={{ transform: [{ rotate: showFilters ? '180deg' : '0deg' }] }}
          />
          <Text
            style={{ fontFamily: 'Cairo_500Medium' }}
            className={`mr-2 ${
              showFilters || selectedSpecialty
                ? 'text-medical-primary'
                : 'text-white'
            }`}
          >
            {t.filterBy}
          </Text>
          <Filter
            size={18}
            color={showFilters || selectedSpecialty ? '#0891B2' : '#FFFFFF'}
          />
        </Pressable>
      </LinearGradient>

      {/* Filters */}
      {showFilters && (
        <FadeInDownView
          duration={300}
          className="bg-white dark:bg-slate-900 px-5 py-4 border-b border-medical-border dark:border-slate-700"
        >
          {/* Specialty Filter */}
          <Text
            style={{ fontFamily: 'Cairo_500Medium' }}
            className="text-medical-textSecondary dark:text-slate-400 text-sm text-right mb-2"
          >
            {t.specialty}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
            style={{ flexGrow: 0 }}
          >
            <Pressable
              onPress={() => setSelectedSpecialty(null)}
              className={`px-4 py-2 rounded-lg ${
                !selectedSpecialty ? 'bg-medical-primary' : 'bg-medical-cardAlt'
              }`}
            >
              <Text
                style={{ fontFamily: 'Cairo_500Medium' }}
                className={`text-sm ${!selectedSpecialty ? 'text-white' : 'text-medical-text dark:text-slate-100'}`}
              >
                {t.allSpecialties}
              </Text>
            </Pressable>
            {specialties.map((spec) => (
              <Pressable
                key={spec.id}
                onPress={() => setSelectedSpecialty(spec.nameAr)}
                className={`px-4 py-2 rounded-lg ${
                  selectedSpecialty === spec.nameAr
                    ? 'bg-medical-primary'
                    : 'bg-medical-cardAlt'
                }`}
              >
                <Text
                  style={{ fontFamily: 'Cairo_500Medium' }}
                  className={`text-sm ${
                    selectedSpecialty === spec.nameAr
                      ? 'text-white'
                      : 'text-medical-text dark:text-slate-100'
                  }`}
                >
                  {spec.nameAr}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {selectedSpecialty && (
            <Pressable
              onPress={clearFilters}
              className="mt-4 py-2 items-center"
            >
              <Text
                style={{ fontFamily: 'Cairo_500Medium' }}
                className="text-medical-error"
              >
                {t.clearFilter}
              </Text>
            </Pressable>
          )}
        </FadeInDownView>
      )}

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View className="space-y-3">
            {[0, 1, 2].map((key) => (
              <View
                key={key}
                className="bg-white dark:bg-slate-800 rounded-2xl p-4 mb-3"
                style={{
                  shadowColor: '#000',
                  shadowOpacity: 0.06,
                  shadowRadius: 6,
                  elevation: 2,
                }}
              >
                <View className="h-20 bg-slate-200/80 dark:bg-slate-700 rounded-xl mb-3" />
                <View className="h-4 bg-slate-200/80 dark:bg-slate-700 rounded-md mb-2" />
                <View className="h-4 bg-slate-200/80 dark:bg-slate-700 rounded-md mb-2" />
                <View className="h-4 bg-slate-200/80 dark:bg-slate-700 rounded-md" />
              </View>
            ))}
          </View>
        ) : filteredDoctors.length > 0 ? (
          filteredDoctors.map((doctor, index) => (
            <FadeInDownView
              key={doctor.id}
              delay={index * 100} duration={400}
            >
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: '/doctor-details',
                    params: { id: doctor.id },
                  })
                }
                className="bg-white dark:bg-slate-800 rounded-2xl p-4 mb-4 active:opacity-80"
                style={{
                  shadowColor: '#000',
                  shadowOpacity: 0.08,
                  shadowRadius: 8,
                  elevation: 3,
                }}
              >
                {(() => {
                  const doctorImageUri = resolveAssetUrl(doctor.photo);
                  const canShowImage = Boolean(doctorImageUri) && !brokenDoctorImages[String(doctor.id)];
                  return (
                <View className="flex-row items-center" style={{ minHeight: 64 }}>
                  <View className="flex-1 mr-3 items-end justify-center" style={{ minHeight: 56 }}>
                    <Text
                      style={{ fontFamily: 'Cairo_600SemiBold' }}
                      className="text-medical-text dark:text-slate-100 text-lg text-right w-full"
                    >
                      {doctor.nameAr}
                    </Text>
                  </View>
                  {canShowImage ? (
                    <Image
                      source={{ uri: doctorImageUri }}
                      className="w-16 h-16 rounded-xl"
                      onError={() => {
                        const id = String(doctor.id);
                        setBrokenDoctorImages(prev => (prev[id] ? prev : { ...prev, [id]: true }));
                      }}
                    />
                  ) : (
                    <View className="w-16 h-16 rounded-xl bg-gray-100 dark:bg-slate-700 items-center justify-center">
                      <User size={22} color="#94A3B8" />
                    </View>
                  )}
                </View>
                  );
                })()}
                {(doctor.specialtyAr || doctor.hospitalName || doctor.hospitalLocation) ? (
                  <View className="mt-2">
                    {!!doctor.specialtyAr && (
                      <Text
                        style={{ fontFamily: 'Cairo_400Regular' }}
                        className="text-medical-primary dark:text-teal-300 text-sm text-right"
                      >
                        {doctor.specialtyAr}
                      </Text>
                    )}
                    {(doctor.hospitalName || doctor.hospitalLocation) ? (
                      <Text
                        style={{ fontFamily: 'Cairo_400Regular' }}
                        className="text-medical-textSecondary dark:text-slate-400 text-xs text-right"
                      >
                        {doctor.hospitalName || doctor.hospitalLocation}
                      </Text>
                    ) : null}
                  </View>
                ) : null}
                {/* Actions */}
                <View className="flex-row gap-2 mt-3 pt-3 border-t border-medical-border dark:border-slate-700">
                  <Pressable
                    onPress={() => handleCall(doctor.phone)}
                    className="flex-1 flex-row items-center justify-center bg-medical-success/10 rounded-xl py-2.5"
                  >
                    <Text
                      style={{ fontFamily: 'Cairo_600SemiBold' }}
                      className="text-medical-success dark:text-emerald-300 mr-2"
                    >
                      {t.call}
                    </Text>
                    <Phone size={18} color="#059669" />
                  </Pressable>
                </View>
              </Pressable>
            </FadeInDownView>
          ))
        ) : (
          <View className="items-center justify-center py-20">
            <Search size={64} color="#94A3B8" />
            <Text
              style={{ fontFamily: 'Cairo_500Medium' }}
              className="text-medical-textSecondary dark:text-slate-400 text-lg mt-4"
            >
              {t.noResults}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
