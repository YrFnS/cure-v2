import React, { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { bookAppointment, getDoctorAvailability } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { useTranslation } from '@/lib/settings-store';
import { cn } from '@/lib/cn';
import { bookingDates } from '@/lib/booking-dates';
import type { AvailableSlot } from '@/lib/types';

export default function DoctorBooking({ doctorId }: { doctorId: string }) {
  const { t, isRTL } = useTranslation();
  const patientId = useAuthStore(s => s.patient?.id);
  const verified = useAuthStore(s => Boolean(s.patient?.verified));
  const queryClient = useQueryClient();
  const [dates] = useState<string[]>(bookingDates);
  const [date, setDate] = useState<string>(dates[0]);
  const [slotId, setSlotId] = useState<string | null>(null);
  const textStyle = { fontFamily: 'Cairo_600SemiBold', textAlign: isRTL ? 'right' as const : 'left' as const };
  const availability = useQuery<AvailableSlot[]>({
    queryKey: ['doctor-availability', patientId, doctorId, date],
    queryFn: () => getDoctorAvailability(doctorId, date),
    enabled: verified,
    staleTime: 0,
    refetchOnMount: 'always',
  });
  const booking = useMutation({
    mutationFn: () => bookAppointment({ doctorId, date, slotId: slotId! }),
    onSuccess: () => {
      setSlotId(null);
      void queryClient.invalidateQueries({ queryKey: ['appointments', patientId] });
      void queryClient.invalidateQueries({ queryKey: ['doctor-availability', patientId, doctorId] });
    },
    onError: () => { void availability.refetch(); },
  });
  const selected = availability.data?.find(s => s.slotId === slotId);

  return (
    <View className="bg-white dark:bg-slate-800 rounded-2xl p-5 mb-6 gap-4">
      <Text style={textStyle} className="text-lg text-medical-text dark:text-slate-100">{t.bookAppointment}</Text>
      <Text style={textStyle} className="text-medical-textSecondary dark:text-slate-400">{t.chooseBookingDate}</Text>
      <FlatList
        horizontal
        inverted={isRTL}
        style={{ flexGrow: 0 }}
        data={dates}
        keyExtractor={item => item}
        extraData={date}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: item === date, disabled: booking.isPending }}
            disabled={booking.isPending}
            onPress={() => { setDate(item); setSlotId(null); booking.reset(); }}
            className={cn('rounded-xl p-3 mx-1', item === date ? 'bg-medical-primary' : 'bg-slate-100 dark:bg-slate-700')}
          >
            <Text style={{ fontFamily: 'Cairo_600SemiBold' }} className={item === date ? 'text-white' : 'text-medical-text dark:text-slate-100'}>
              {new Date(`${item}T00:00:00Z`).toLocaleDateString(t.dateLocale, { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })}
            </Text>
          </Pressable>
        )}
      />
      <Text style={textStyle} className="text-medical-text dark:text-slate-100">{t.availableSlots}</Text>
      {availability.isLoading ? <ActivityIndicator color="#0891B2" /> : null}
      {availability.isError ? (
        <Pressable accessibilityRole="button" onPress={() => { void availability.refetch(); }} className="p-3">
          <Text style={textStyle} className="text-rose-600 dark:text-rose-300">{t.availabilityLoadFailed} · {t.retry}</Text>
        </Pressable>
      ) : null}
      {availability.isSuccess && availability.data.length === 0 ? (
        <Text style={textStyle} className="text-medical-textSecondary dark:text-slate-400">{t.noAvailableSlots}</Text>
      ) : null}
      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: 8 }}>
        {availability.data?.map(slot => (
          <Pressable
            key={slot.slotId}
            accessibilityRole="button"
            accessibilityState={{ selected: slotId === slot.slotId, disabled: booking.isPending }}
            disabled={booking.isPending}
            onPress={() => { setSlotId(slot.slotId); booking.reset(); }}
            className={cn('rounded-xl p-3', slotId === slot.slotId ? 'bg-medical-primary' : 'bg-cyan-50 dark:bg-slate-700')}
          >
            <Text style={{ fontFamily: 'Cairo_600SemiBold', writingDirection: 'ltr' }} className={slotId === slot.slotId ? 'text-white' : 'text-cyan-700 dark:text-cyan-300'}>{slot.from} – {slot.to}</Text>
            <Text style={textStyle} className={slotId === slot.slotId ? 'text-white' : 'text-cyan-700 dark:text-cyan-300'}>{t.remainingPlaces}: {slot.remaining}</Text>
          </Pressable>
        ))}
      </View>
      {booking.isError ? <Text selectable style={textStyle} className="text-rose-600 dark:text-rose-300">{t.bookingFailed}</Text> : null}
      {booking.isSuccess ? <Text style={textStyle} className="text-emerald-700 dark:text-emerald-300">{t.bookingConfirmed}</Text> : null}
      <Pressable
        accessibilityRole="button"
        disabled={!verified || !selected || booking.isPending || availability.isError}
        onPress={() => booking.mutate()}
        className={cn('rounded-xl p-4 bg-medical-primary', (!selected || booking.isPending || availability.isError) && 'opacity-40')}
      >
        <Text style={{ fontFamily: 'Cairo_700Bold', textAlign: 'center' }} className="text-white">{booking.isPending ? t.loading : t.confirmBooking}</Text>
      </Pressable>
      <Link href="/appointments" style={textStyle} className="text-medical-primary dark:text-cyan-300 py-2">{t.myAppointments}</Link>
    </View>
  );
}
