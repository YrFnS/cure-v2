import React, { useEffect } from 'react';
import { View, Text, Pressable, ActivityIndicator, Share } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import QRCode from 'react-native-qrcode-svg';
import { RefreshCw, Share2 } from 'lucide-react-native';
import { useTranslation } from '@/lib/settings-store';
import { createLabToken } from '@/lib/api';

// The patient shares a single-use upload link with the lab (QR or any messaging app).
// The link holds only a random code — no patient ID, no name.
export default function LabCodeScreen() {
  const { t, language } = useTranslation();
  const token = useMutation({ mutationFn: createLabToken });

  useEffect(() => {
    token.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const url: string | undefined = token.data?.url;
  const expires = token.data?.expiresAt
    ? new Date(token.data.expiresAt).toLocaleString(language === 'ar' ? 'ar-IQ' : 'en-GB', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : '';

  const share = () => {
    if (!url) return;
    void Share.share({ message: `${t.labLinkShareMessage}\n${url}` });
  };

  return (
    <View className="flex-1 bg-medical-bg dark:bg-slate-900 items-center px-6 pt-10">
      <View
        className="bg-white dark:bg-slate-800 rounded-3xl p-6 items-center w-full max-w-[380px]"
        style={{ shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 }}
      >
        {token.isError ? (
          <Text style={{ fontFamily: 'Cairo_600SemiBold' }} className="text-red-600 text-center">
            {token.error instanceof Error ? token.error.message : String(token.error)}
          </Text>
        ) : !url ? (
          <ActivityIndicator size="large" color="#0891B2" style={{ marginVertical: 80 }} />
        ) : (
          <>
            <QRCode value={url} size={220} color="#0F172A" backgroundColor="#FFFFFF" />
            <Text style={{ fontFamily: 'Cairo_500Medium', fontSize: 14 }} className="text-medical-textSecondary dark:text-slate-400 mt-4">
              {t.labLinkExpires} {expires}
            </Text>
            <Pressable
              onPress={share}
              className="mt-4 bg-medical-primary rounded-2xl px-8 py-3 flex-row items-center active:opacity-80"
            >
              <Share2 size={18} color="#FFFFFF" />
              <Text style={{ fontFamily: 'Cairo_600SemiBold' }} className="text-white ml-2">
                {t.shareLabLink}
              </Text>
            </Pressable>
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
          className="mt-4 bg-medical-cardAlt dark:bg-slate-700 rounded-2xl px-8 py-3 flex-row items-center active:opacity-80"
        >
          <RefreshCw size={18} color="#0891B2" />
          <Text style={{ fontFamily: 'Cairo_600SemiBold' }} className="text-medical-primary dark:text-cyan-300 ml-2">
            {t.newLabCode}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
