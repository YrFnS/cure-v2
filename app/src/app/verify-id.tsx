import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, Image, ActivityIndicator, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Camera, IdCard, LogOut, ShieldCheck } from 'lucide-react-native';
import { useAuthStore } from '@/lib/auth-store';
import { useTranslation } from '@/lib/settings-store';
import { getIdCheck, verifyNationalId } from '@/lib/api';

type Side = 'front' | 'back';
type Shot = { uri: string; dataUrl: string };

// Account is unusable until verified: scan both sides of the Iraqi national ID,
// the backend reads the card, fills the profile, and marks the account verified.
export default function VerifyIdScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const updatePatient = useAuthStore(s => s.updatePatient);
  const logout = useAuthStore(s => s.logout);
  const [shots, setShots] = useState<Record<Side, Shot | null>>({ front: null, back: null });
  const [error, setError] = useState('');

  const capture = async (side: Side) => {
    setError('');
    // Web has no in-app camera: a file chooser (phones offer their camera there) needs no permission.
    if (Platform.OS !== 'web') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setError(t.cameraPermissionNeeded);
        return;
      }
    }
    // No crop step: the AI reads the whole photo, and Android's cropper toolbar is barely visible.
    const options = { quality: 0.6, base64: true };
    const result = Platform.OS === 'web'
      ? await ImagePicker.launchImageLibraryAsync({ ...options, mediaTypes: ['images'] })
      : await ImagePicker.launchCameraAsync(options);
    const asset = result.canceled ? null : result.assets[0];
    if (!asset?.base64) return;
    const mime = asset.mimeType === 'image/png' ? 'image/png' : 'image/jpeg';
    setShots(prev => ({ ...prev, [side]: { uri: asset.uri, dataUrl: `data:${mime};base64,${asset.base64}` } }));
  };

  // A slow card read continues on the server; poll until it settles (also after reopening the app).
  const queryClient = useQueryClient();
  const check = useQuery({
    queryKey: ['id-check'],
    queryFn: getIdCheck,
    refetchInterval: query => (query.state.data?.status === 'pending' ? 4000 : false),
  });
  useEffect(() => {
    if (check.data?.status === 'verified') updatePatient(check.data.patient); // verified: true → layout routes into the app
    if (check.data?.status === 'failed') setError(check.data.message);
  }, [check.data, updatePatient]);

  const verify = useMutation({
    mutationFn: () => verifyNationalId(shots.front!.dataUrl, shots.back!.dataUrl),
    onSuccess: result => {
      if (result.status === 'verified') updatePatient(result.patient);
      else queryClient.setQueryData(['id-check'], result);
    },
    onError: e => setError(e instanceof Error ? e.message : String(e)),
  });
  const reviewing = check.data?.status === 'pending';
  const busy = verify.isPending || reviewing;

  const sides: { key: Side; label: string }[] = [
    { key: 'front', label: t.idCardFront },
    { key: 'back', label: t.idCardBack },
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
            {t.verifyYourAccount}
          </Text>
          <Text style={{ fontFamily: 'Cairo_500Medium', fontSize: 15 }} className="text-white/90 text-center mt-2">
            {t.verifySubtitle}
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
                disabled={busy}
                className="mb-4 rounded-2xl border border-dashed border-slate-300 dark:border-slate-600 overflow-hidden active:opacity-80"
                style={{ minHeight: 150 }}
              >
                {shot ? (
                  <Image source={{ uri: shot.uri }} style={{ width: '100%', height: 170 }} resizeMode="cover" />
                ) : (
                  <View className="flex-1 items-center justify-center py-8">
                    <Camera size={36} color="#0891B2" />
                    <Text style={{ fontFamily: 'Cairo_600SemiBold', fontSize: 16 }} className="text-slate-700 dark:text-slate-200 mt-2">
                      {side.label}
                    </Text>
                    <Text style={{ fontFamily: 'Cairo_400Regular', fontSize: 13 }} className="text-slate-400 mt-1">
                      {t.tapToTakePhoto}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}

          {reviewing ? (
            <View className="bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800 rounded-xl p-4 mb-4">
              <Text style={{ fontFamily: 'Cairo_600SemiBold', fontSize: 14 }} className="text-cyan-800 dark:text-cyan-300 text-center">
                {t.idReviewPending}
              </Text>
            </View>
          ) : null}

          {error ? (
            <View className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-4">
              <Text style={{ fontFamily: 'Cairo_600SemiBold', fontSize: 14 }} className="text-red-600 dark:text-red-400 text-center">
                {error}
              </Text>
            </View>
          ) : null}

          <Pressable
            onPress={() => verify.mutate()}
            disabled={!ready || busy}
            className="overflow-hidden rounded-xl active:opacity-90"
            style={{ opacity: ready || reviewing ? 1 : 0.5 }}
          >
            <LinearGradient
              colors={['#0891B2', '#0E7490']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ paddingVertical: 18, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}
            >
              {busy ? (
                <>
                  <ActivityIndicator size="small" color="#FFF" />
                  <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 16 }} className="text-white ml-2">
                    {reviewing ? t.reviewing : t.readingYourCard}
                  </Text>
                </>
              ) : (
                <>
                  <ShieldCheck size={20} color="#FFF" />
                  <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 18 }} className="text-white ml-2">
                    {t.verify}
                  </Text>
                </>
              )}
            </LinearGradient>
          </Pressable>
        </View>

        <Pressable onPress={() => logout()} className="mt-6 py-2 flex-row items-center justify-center">
          <LogOut size={18} color="#94A3B8" />
          <Text style={{ fontFamily: 'Cairo_600SemiBold', fontSize: 15 }} className="text-slate-400 ml-2">
            {t.logOut}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
