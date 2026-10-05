import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import QRCode from 'react-native-qrcode-svg';
import { RefreshCw } from 'lucide-react-native';
import { useTranslation } from '@/lib/settings-store';
import { createLabToken } from '@/lib/api';

// The QR holds only a random single-use code — no patient ID, no URL.
export default function LabCodeScreen() {
  const { t } = useTranslation();
  const [now, setNow] = useState(Date.now());
  const token = useMutation({ mutationFn: createLabToken });

  useEffect(() => {
    token.mutate();
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const code: string | undefined = token.data?.code;
  const secondsLeft = token.data ? Math.max(0, Math.round((new Date(token.data.expiresAt).getTime() - now) / 1000)) : 0;
  const expired = Boolean(token.data) && secondsLeft === 0;

  return (
    <View className="flex-1 bg-medical-bg dark:bg-slate-900 items-center px-6 pt-10">
      <View
        className="bg-white dark:bg-slate-800 rounded-3xl p-6 items-center w-full max-w-[380px]"
        style={{ shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 }}
      >
        {token.isPending || !code ? (
          token.isError ? (
            <Text style={{ fontFamily: 'Cairo_600SemiBold' }} className="text-red-600 text-center">
              {token.error instanceof Error ? token.error.message : String(token.error)}
            </Text>
          ) : (
            <ActivityIndicator size="large" color="#0891B2" style={{ marginVertical: 80 }} />
          )
        ) : (
          <>
            <View style={{ opacity: expired ? 0.15 : 1 }}>
              <QRCode value={code} size={220} color="#0F172A" backgroundColor="#FFFFFF" />
            </View>
            <Text
              style={{ fontFamily: 'Cairo_700Bold', fontSize: 40, letterSpacing: 8 }}
              className="text-medical-text dark:text-slate-100 mt-5"
            >
              {code}
            </Text>
            <Text style={{ fontFamily: 'Cairo_600SemiBold', fontSize: 15 }} className={expired ? 'text-red-600' : 'text-teal-600'}>
              {expired ? '—' : `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')}`}
            </Text>
          </>
        )}

        <Text
          style={{ fontFamily: 'Cairo_500Medium', fontSize: 15, lineHeight: 24 }}
          className="text-medical-textSecondary dark:text-slate-400 text-center mt-5"
        >
          {t.labCodeHint}
        </Text>

        <Pressable
          onPress={() => token.mutate()}
          disabled={token.isPending}
          className="mt-6 bg-medical-primary rounded-2xl px-8 py-3 flex-row items-center active:opacity-80"
        >
          <RefreshCw size={18} color="#FFFFFF" />
          <Text style={{ fontFamily: 'Cairo_600SemiBold' }} className="text-white ml-2">
            {t.newLabCode}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
