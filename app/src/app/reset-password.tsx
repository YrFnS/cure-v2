import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Eye, EyeOff, KeyRound } from 'lucide-react-native';
import { useAuthStore } from '@/lib/auth-store';
import { useSettingsStore, useTranslation } from '@/lib/settings-store';
import { resetPasswordWithOtp, sendPasswordResetOtp } from '@/lib/api';

function normalizeArabicDigits(value: string) {
  return value
    .replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
}

function normalizeIraqiPhone(value: string): string {
  const digits = normalizeArabicDigits(value).replace(/\D/g, '');
  if (digits.startsWith('00964') && digits.length >= 14) return `0${digits.slice(5, 15)}`;
  if (digits.startsWith('964') && digits.length >= 12) return `0${digits.slice(3, 13)}`;
  if (digits.startsWith('7') && digits.length === 10) return `0${digits}`;
  return digits.slice(0, 11);
}

function errorText(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : '';
  return message.replace(/^HTTP \d+ - /, '') || fallback;
}

export default function ResetPasswordScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const login = useAuthStore(s => s.login);
  const language = useSettingsStore(s => s.language);
  const { t } = useTranslation();
  const isAr = language === 'ar';

  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  const normalizedPhone = normalizeIraqiPhone(phone);

  const handleSend = async () => {
    if (!/^07\d{9}$/.test(normalizedPhone)) {
      setError(t.invalidPhoneFormat);
      return;
    }
    setError('');
    setIsBusy(true);
    try {
      await sendPasswordResetOtp(normalizedPhone);
      setStep('code');
    } catch (sendError) {
      setError(errorText(sendError, t.connectionFailed));
    } finally {
      setIsBusy(false);
    }
  };

  const handleReset = async () => {
    const otp = normalizeArabicDigits(code).replace(/\D/g, '');
    if (otp.length !== 6) {
      setError(isAr ? 'رمز التحقق يجب أن يكون 6 أرقام' : 'The code must be 6 digits');
      return;
    }
    if (newPassword.length < 6) {
      setError(t.passwordMinLength);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t.passwordsDoNotMatch);
      return;
    }
    setError('');
    setIsBusy(true);
    try {
      await resetPasswordWithOtp(normalizedPhone, otp, newPassword);
      const result = await login(normalizedPhone, newPassword, false);
      if (result.success) {
        router.replace('/(tabs)');
      } else {
        router.replace('/login');
      }
    } catch (resetError) {
      setError(errorText(resetError, t.connectionFailed));
    } finally {
      setIsBusy(false);
    }
  };

  const labelClass = `text-slate-700 dark:text-slate-200 mb-2 ${isAr ? 'text-right' : 'text-left'}`;
  const inputClass = `px-4 py-4 text-slate-800 dark:text-slate-100 ${isAr ? 'text-right' : 'text-left'}`;

  const passwordField = (label: string, value: string, onChange: (text: string) => void) => (
    <View className="mb-4">
      <Text style={{ fontFamily: 'Cairo_600SemiBold', fontSize: 15 }} className={labelClass}>
        {label}
      </Text>
      <View className="bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 flex-row items-center">
        <Pressable onPress={() => setShowPassword(!showPassword)} className="px-4 py-4">
          {showPassword ? <EyeOff size={24} color="#94A3B8" /> : <Eye size={24} color="#94A3B8" />}
        </Pressable>
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder="••••••••"
          placeholderTextColor="#94A3B8"
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoCorrect={false}
          className={`flex-1 py-4 pr-4 text-slate-800 dark:text-slate-100 ${isAr ? 'text-right' : 'text-left'}`}
          style={{ fontFamily: 'Cairo_500Medium' }}
        />
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-900">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <ScrollView
          contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <LinearGradient
            colors={['#0891B2', '#0E7490', '#164E63']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              paddingTop: insets.top + 32,
              paddingBottom: 80,
              paddingHorizontal: 24,
              borderBottomLeftRadius: 40,
              borderBottomRightRadius: 40,
              alignItems: 'center',
            }}
          >
            <KeyRound size={48} color="#FFFFFF" />
            <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 26 }} className="text-white text-center mt-3">
              {isAr ? 'استعادة كلمة المرور' : 'Reset Password'}
            </Text>
          </LinearGradient>

          <View
            className="mx-5 -mt-12 bg-white dark:bg-slate-800 rounded-3xl p-6"
            style={{ shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 12, elevation: 8 }}
          >
            <Text
              style={{ fontFamily: 'Cairo_500Medium', fontSize: 15 }}
              className="text-slate-500 dark:text-slate-400 text-center mb-6"
            >
              {step === 'phone'
                ? (isAr ? 'أدخل رقم هاتفك المسجل في المستشفى وسنرسل لك رمزاً عبر واتساب' : 'Enter the phone number registered at the hospital and we will send a code by WhatsApp')
                : (isAr ? `أدخل الرمز المرسل إلى ${normalizedPhone} عبر واتساب` : `Enter the code sent to ${normalizedPhone} by WhatsApp`)}
            </Text>

            {step === 'phone' ? (
              <View className="mb-6">
                <Text style={{ fontFamily: 'Cairo_600SemiBold', fontSize: 15 }} className={labelClass}>
                  {isAr ? 'رقم الهاتف' : 'Phone Number'}
                </Text>
                <View className="bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <TextInput
                    value={phone}
                    onChangeText={text => setPhone(normalizeArabicDigits(text).replace(/\D/g, '').slice(0, 14))}
                    placeholder={isAr ? 'مثال: 0770xxxxxxx' : 'e.g. 0770xxxxxxx'}
                    placeholderTextColor="#94A3B8"
                    keyboardType="phone-pad"
                    maxLength={14}
                    className={inputClass}
                    style={{ fontFamily: 'Cairo_500Medium' }}
                  />
                </View>
              </View>
            ) : (
              <View>
                <View className="mb-4">
                  <Text style={{ fontFamily: 'Cairo_600SemiBold', fontSize: 15 }} className={labelClass}>
                    {isAr ? 'رمز التحقق' : 'Verification Code'}
                  </Text>
                  <View className="bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <TextInput
                      value={code}
                      onChangeText={text => setCode(normalizeArabicDigits(text).replace(/\D/g, '').slice(0, 6))}
                      placeholder="••••••"
                      placeholderTextColor="#94A3B8"
                      keyboardType="number-pad"
                      textContentType="oneTimeCode"
                      autoComplete="sms-otp"
                      maxLength={6}
                      className={inputClass}
                      style={{ fontFamily: 'Cairo_500Medium', letterSpacing: 6 }}
                    />
                  </View>
                </View>
                {passwordField(isAr ? 'كلمة المرور الجديدة' : 'New Password', newPassword, setNewPassword)}
                {passwordField(isAr ? 'تأكيد كلمة المرور' : 'Confirm Password', confirmPassword, setConfirmPassword)}
              </View>
            )}

            {error ? (
              <View className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-4">
                <Text
                  style={{ fontFamily: 'Cairo_600SemiBold', fontSize: 14 }}
                  className="text-red-600 dark:text-red-400 text-center"
                >
                  {error}
                </Text>
              </View>
            ) : null}

            <Pressable
              onPress={step === 'phone' ? handleSend : handleReset}
              disabled={isBusy}
              className="overflow-hidden rounded-xl active:opacity-90"
            >
              <LinearGradient
                colors={['#0891B2', '#0E7490']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ paddingVertical: 18, alignItems: 'center', justifyContent: 'center' }}
              >
                {isBusy ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 18 }} className="text-white">
                    {step === 'phone'
                      ? (isAr ? 'إرسال الرمز' : 'Send Code')
                      : (isAr ? 'تغيير كلمة المرور' : 'Change Password')}
                  </Text>
                )}
              </LinearGradient>
            </Pressable>

            {step === 'code' ? (
              <Pressable onPress={handleSend} disabled={isBusy} className="mt-4 py-2">
                <Text style={{ fontFamily: 'Cairo_600SemiBold', fontSize: 15 }} className="text-teal-600 text-center">
                  {isAr ? 'إعادة إرسال الرمز' : 'Resend code'}
                </Text>
              </Pressable>
            ) : null}

            <Pressable onPress={() => router.replace('/login')} className="mt-2 py-2">
              <Text style={{ fontFamily: 'Cairo_600SemiBold', fontSize: 15 }} className="text-slate-500 dark:text-slate-400 text-center">
                {isAr ? 'العودة لتسجيل الدخول' : 'Back to login'}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
