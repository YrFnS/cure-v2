import React, { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { Link, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cancelAppointment, getAppointments } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { useTranslation } from '@/lib/settings-store';
import { cn } from '@/lib/cn';
import type { Appointment } from '@/lib/types';

export default function AppointmentsScreen() {
  const { t, isRTL, language } = useTranslation();
  const patientId = useAuthStore(s => s.patient?.id);
  const verified = useAuthStore(s => Boolean(s.patient?.verified));
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const textStyle = { fontFamily: 'Cairo_600SemiBold', textAlign: isRTL ? 'right' as const : 'left' as const };
  const appointments = useQuery<Appointment[]>({
    queryKey: ['appointments', patientId], queryFn: getAppointments, enabled: verified,
    staleTime: 0, refetchOnMount: 'always',
  });
  const cancel = useMutation({
    mutationFn: (id: string) => cancelAppointment(id),
    onSuccess: (updated: Appointment) => {
      setConfirmId(null);
      queryClient.setQueryData<Appointment[]>(['appointments', patientId], rows => rows?.map(a => a.id === updated.id ? updated : a));
      void queryClient.invalidateQueries({ queryKey: ['appointments', patientId] });
      void queryClient.invalidateQueries({ queryKey: ['doctor-availability', patientId, updated.doctor.id] });
    },
  });
  const labels = { SCHEDULED: t.appointmentScheduled, OPEN: t.appointmentOpen, CLOSED: t.appointmentClosed, CANCELLED: t.appointmentCancelled };
  const chips = {
    SCHEDULED: 'bg-cyan-100 dark:bg-cyan-900', OPEN: 'bg-amber-100 dark:bg-amber-900',
    CLOSED: 'bg-emerald-100 dark:bg-emerald-900', CANCELLED: 'bg-slate-200 dark:bg-slate-700',
  };

  return (
    <View className="flex-1 bg-medical-bg dark:bg-slate-900">
      <Stack.Screen options={{ title: t.myAppointments }} />
      <FlatList
        data={appointments.data ?? []}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 24, gap: 16 }}
        keyExtractor={item => item.id}
        refreshing={appointments.isFetching && !appointments.isLoading}
        onRefresh={() => { void appointments.refetch(); }}
        ListHeaderComponent={appointments.isError ? (
          <Pressable accessibilityRole="button" onPress={() => { void appointments.refetch(); }} className="p-4">
            <Text selectable style={textStyle} className="text-rose-600 dark:text-rose-300">{t.appointmentsLoadFailed} · {t.retry}</Text>
          </Pressable>
        ) : null}
        ListEmptyComponent={appointments.isLoading ? <ActivityIndicator color="#0891B2" /> : appointments.isSuccess ? (
          <View className="p-6 gap-4">
            <Text style={textStyle} className="text-medical-textSecondary dark:text-slate-400">{t.noAppointments}</Text>
            <Link href="/(tabs)/doctors" style={textStyle} className="text-medical-primary dark:text-cyan-300">{t.bookAppointment}</Link>
          </View>
        ) : null}
        renderItem={({ item }) => (
          <View className="bg-white dark:bg-slate-800 rounded-2xl p-5 gap-3">
            <Text style={textStyle} className="text-lg text-medical-text dark:text-slate-100">{language === 'ar' ? item.doctor.nameAr || item.doctor.name : item.doctor.name || item.doctor.nameAr}</Text>
            <Text style={textStyle} className="text-medical-textSecondary dark:text-slate-400">{item.doctor.specialty}</Text>
            <Text style={{ ...textStyle, writingDirection: 'ltr' }} className="text-medical-text dark:text-slate-100">{item.date} · {item.slot.from} – {item.slot.to}</Text>
            {item.doctor.hospital ? <Text style={textStyle} className="text-medical-textSecondary dark:text-slate-400">{item.doctor.hospital.name}</Text> : null}
            <View style={{ alignSelf: isRTL ? 'flex-end' : 'flex-start' }} className={cn('rounded-full px-4 py-2', chips[item.status])}>
              <Text style={textStyle} className="text-slate-800 dark:text-slate-100">{labels[item.status]}</Text>
            </View>
            {item.status === 'SCHEDULED' || item.status === 'OPEN' ? (
              confirmId === item.id ? (
                <View className="gap-3">
                  <Text style={textStyle} className="text-medical-text dark:text-slate-100">{t.cancelAppointmentQuestion}</Text>
                  {cancel.isError ? <Text selectable style={textStyle} className="text-rose-600 dark:text-rose-300">{t.appointmentCancelFailed}</Text> : null}
                  <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 12 }}>
                    <Pressable accessibilityRole="button" disabled={cancel.isPending} onPress={() => cancel.mutate(item.id)} className="flex-1 rounded-xl bg-rose-600 p-3">
                      <Text style={{ ...textStyle, textAlign: 'center' }} className="text-white">{cancel.isPending ? t.loading : t.cancelAppointment}</Text>
                    </Pressable>
                    <Pressable accessibilityRole="button" disabled={cancel.isPending} onPress={() => setConfirmId(null)} className="rounded-xl bg-slate-100 dark:bg-slate-700 p-3">
                      <Text style={textStyle} className="text-medical-text dark:text-slate-100">{t.back}</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Pressable accessibilityRole="button" disabled={cancel.isPending} onPress={() => { setConfirmId(item.id); cancel.reset(); }} className="rounded-xl bg-rose-50 dark:bg-rose-900/30 p-3">
                  <Text style={{ ...textStyle, textAlign: 'center' }} className="text-rose-700 dark:text-rose-300">{t.cancelAppointment}</Text>
                </Pressable>
              )
            ) : null}
          </View>
        )}
      />
    </View>
  );
}
