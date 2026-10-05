import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, Image, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useMutation } from '@tanstack/react-query';
import { Camera, IdCard, LogOut, ShieldCheck } from 'lucide-react-native';
import { useAuthStore } from '@/lib/auth-store';
import { useSettingsStore } from '@/lib/settings-store';
import { verifyNationalId } from '@/lib/api';

type Side = 'front' | 'back';
type Shot = { uri: string; dataUrl: string };

// Account is unusable until verified: scan both sides of the Iraqi national ID,
// the backend reads the card, fills the profile, and marks the account verified.
export default function VerifyIdScreen() {
  const insets = useSafeAreaInsets();
  const language = useSettingsStore(s => s.language);
  const ar = language === 'ar';
  const updatePatient = useAuthStore(s => s.updatePatient);
  const logout = useAuthStore(s => s.logout);
  const [shots, setShots] = useState<Record<Side, Shot | null>>({ front: null, back: null });
  const [error, setError] = useState('');

  const capture = async (side: Side) => {
    setError('');
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError(ar ? 'يجب السماح باستخدام الكاميرا لتصوير البطاقة' : 'Camera permission is needed to scan the card');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.6, base64: true, allowsEditing: true });
    const asset = result.canceled ? null : result.assets[0];
    if (!asset?.base64) return;
    const mime = asset.mimeType === 'image/png' ? 'image/png' : 'image/jpeg';
    setShots(prev => ({ ...prev, [side]: { uri: asset.uri, dataUrl: `data:${mime};base64,${asset.base64}` } }));
  };

  const verify = useMutation({
    mutationFn: () => verifyNationalId(shots.front!.dataUrl, shots.back!.dataUrl),
    onSuccess: patient => updatePatient(patient), // verified: true → layout routes into the app
    onError: e => setError(e instanceof Error ? e.message : String(e)),
  });

  const sides: { key: Side; ar: string; en: string }[] = [
    { key: 'front', ar: 'الوجه الأمامي للبطاقة', en: 'Front of the card' },
    { key: 'back', ar: 'الوجه الخلفي للبطاقة', en: 'Back of the card' },
  ];
  const ready = Boolean(shots.front && shots.back);

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-900">
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        <LinearGradient
          colors={['#0891B2', '#0E7490', '#164E63']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingTop: insets.top + 24, paddingBottom: 64, paddingHorizontal: 24, borderBottomLeftRadius: 40, borderBottomRightRadius: 40, alignItems: 'center' }}
        >
          <View className="w-20 h-20 rounded-3xl bg-white items-center justify-center mb-4">
            <IdCard size={40} color="#0891B2" />
          </View>
          <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 24 }} className="text-white text-center">
            {ar ? 'توثيق الحساب' : 'Verify your account'}
          </Text>
          <Text style={{ fontFamily: 'Cairo_500Medium', fontSize: 15 }} className="text-white/90 text-center mt-2">
            {ar ? 'صوّر البطاقة الوطنية من الجهتين وسنملأ بياناتك تلقائياً' : 'Scan both sides of your national ID and we fill in your details'}
          </Text>
        </LinearGradient>

        <View
          className="mx-5 -mt-10 bg-white dark:bg-slate-800 rounded-3xl p-5"
          style={{ shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 12, elevation: 8 }}
        >
          {sides.map(side => {
            const shot = shots[side.key];
            return (
              <Pressable
                key={side.key}
                onPress={() => capture(side.key)}
                disabled={verify.isPending}
                className="mb-4 rounded-2xl border border-dashed border-slate-300 dark:border-slate-600 overflow-hidden active:opacity-80"
                style={{ minHeight: 150 }}
              >
                {shot ? (
                  <Image source={{ uri: shot.uri }} style={{ width: '100%', height: 170 }} resizeMode="cover" />
                ) : (
                  <View className="flex-1 items-center justify-center py-8">
                    <Camera size={36} color="#0891B2" />
                    <Text style={{ fontFamily: 'Cairo_600SemiBold', fontSize: 16 }} className="text-slate-700 dark:text-slate-200 mt-2">
                      {ar ? side.ar : side.en}
                    </Text>
                    <Text style={{ fontFamily: 'Cairo_400Regular', fontSize: 13 }} className="text-slate-400 mt-1">
                      {ar ? 'اضغط للتصوير' : 'Tap to take a photo'}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}

          {error ? (
            <View className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-4">
              <Text style={{ fontFamily: 'Cairo_600SemiBold', fontSize: 14 }} className="text-red-600 dark:text-red-400 text-center">
                {error}
              </Text>
            </View>
          ) : null}

          <Pressable
            onPress={() => verify.mutate()}
            disabled={!ready || verify.isPending}
            className="overflow-hidden rounded-xl active:opacity-90"
            style={{ opacity: ready ? 1 : 0.5 }}
          >
            <LinearGradient
              colors={['#0891B2', '#0E7490']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ paddingVertical: 18, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}
            >
              {verify.isPending ? (
                <>
                  <ActivityIndicator size="small" color="#FFF" />
                  <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 16 }} className="text-white ml-2">
                    {ar ? 'جارٍ قراءة البطاقة…' : 'Reading your card…'}
                  </Text>
                </>
              ) : (
                <>
                  <ShieldCheck size={20} color="#FFF" />
                  <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 18 }} className="text-white ml-2">
                    {ar ? 'توثيق' : 'Verify'}
                  </Text>
                </>
              )}
            </LinearGradient>
          </Pressable>
        </View>

        <Pressable onPress={() => logout()} className="mt-6 py-2 flex-row items-center justify-center">
          <LogOut size={18} color="#94A3B8" />
          <Text style={{ fontFamily: 'Cairo_600SemiBold', fontSize: 15 }} className="text-slate-400 ml-2">
            {ar ? 'تسجيل الخروج' : 'Log out'}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
