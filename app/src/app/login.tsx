import React, { useMemo, useState } from 'react';
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
import { Eye, EyeOff, ShieldCheck, Building2, Info, UserPlus, Globe } from 'lucide-react-native';
import { FadeInDownView } from '@/components/FadeInDownView';
import { useAuthStore } from '@/lib/auth-store';
import { useSettingsStore, useTranslation } from '@/lib/settings-store';
import { confirmSignup, sendSignupCode } from '@/lib/api';
import {
  useFonts,
  Cairo_400Regular,
  Cairo_500Medium,
  Cairo_600SemiBold,
  Cairo_700Bold,
} from '@expo-google-fonts/cairo';
import { errorText } from '@/lib/error-text';

type RegisterForm = {
  phone: string;
  password: string;
  confirmPassword: string;
  code: string;
};

const INITIAL_REGISTER_FORM: RegisterForm = {
  phone: '',
  password: '',
  confirmPassword: '',
  code: '',
};

function normalizeArabicDigits(value: string) {
  return value
    .replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
}

function normalizeIraqiPhone(value: string): string {
  const digits = normalizeArabicDigits(value).replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('00964') && digits.length >= 14) return `0${digits.slice(5, 15)}`;
  if (digits.startsWith('964') && digits.length >= 12) return `0${digits.slice(3, 13)}`;
  if (digits.startsWith('7') && digits.length === 10) return `0${digits}`;
  if (digits.startsWith('07') && digits.length >= 11) return digits.slice(0, 11);
  return digits.slice(0, 11);
}

function isAllowedLoginIdentifier(value: string): boolean {
  const raw = normalizeArabicDigits(value ?? '').trim();
  if (!raw) return false;
  if (raw.includes('@')) return false;

  const phone = normalizeIraqiPhone(raw);
  if (/^07\d{9}$/.test(phone)) return true;

  // MRN or username (no spaces, no email format).
  return /^[A-Za-z0-9._-]{3,32}$/.test(raw);
}

export default function LoginScreen() {
  const currentYear = new Date().getFullYear();
  const insets = useSafeAreaInsets();
  const login = useAuthStore(s => s.login);
  const isLoading = useAuthStore(s => s.isLoading);
  const language = useSettingsStore(s => s.language);
  const setLanguage = useSettingsStore(s => s.setLanguage);
  const { t } = useTranslation();
  const router = useRouter();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [isRegisterLoading, setIsRegisterLoading] = useState(false);
  const [registerForm, setRegisterForm] = useState<RegisterForm>(INITIAL_REGISTER_FORM);
  // Signup is two steps: phone + password, then the WhatsApp code.
  const [codeSent, setCodeSent] = useState(false);

  const [fontsLoaded] = useFonts({
    Cairo_400Regular,
    Cairo_500Medium,
    Cairo_600SemiBold,
    Cairo_700Bold,
  });

  const isBusy = useMemo(
    () => isLoading || isRegisterLoading,
    [isLoading, isRegisterLoading],
  );

  const setRegisterValue = (key: keyof RegisterForm, value: string) => {
    setRegisterForm(prev => ({ ...prev, [key]: value }));
  };

  const validateRegister = () => {
    const normalizedPhone = normalizeIraqiPhone(registerForm.phone);
    if (!normalizedPhone) return t.pleaseEnterPhone;
    if (!/^07\d{9}$/.test(normalizedPhone)) return t.invalidPhoneFormat;
    if (!registerForm.password.trim()) return t.pleaseEnterPassword;
    if (registerForm.password.trim().length < 6) return t.passwordMinLength;
    if (registerForm.password !== registerForm.confirmPassword) {
      return t.passwordsDoNotMatch;
    }
    return '';
  };

  const handleLogin = async () => {
    if (!identifier.trim()) {
      setError(t.pleaseEnterMrnOrPhone);
      return;
    }
    if (!isAllowedLoginIdentifier(identifier)) {
      setError(t.onlyMrnOrPhoneAllowed);
      return;
    }
    if (!password.trim()) {
      setError(t.pleaseEnterPassword);
      return;
    }

    setError('');
    const result = await login(identifier.trim(), password.trim(), false);
    if (!result.success && result.error) {
      setError(result.error);
    }
  };

  const handleRegister = async () => {
    const normalizedPhone = normalizeIraqiPhone(registerForm.phone);
    const validationError = validateRegister();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setIsRegisterLoading(true);

    try {
      if (!codeSent) {
        await sendSignupCode(normalizedPhone);
        setCodeSent(true);
        return;
      }

      const password = registerForm.password;
      await confirmSignup(normalizedPhone, registerForm.code.trim(), password);
      setRegisterForm(INITIAL_REGISTER_FORM);
      setCodeSent(false);
      setIsRegisterMode(false);

      // New accounts go straight in; the layout then routes them to ID verification.
      const loginResult = await login(normalizedPhone, password, false);
      if (!loginResult.success) setError(loginResult.error ?? t.connectionFailed);
    } catch (registerError) {
      setError(errorText(registerError, t.accountCreationFailed));
    } finally {
      setIsRegisterLoading(false);
    }
  };

  const toggleMode = () => {
    setError('');
    setCodeSent(false);
    setRegisterForm(INITIAL_REGISTER_FORM);
    setIsRegisterMode(!isRegisterMode);
  };

  if (!fontsLoaded) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-slate-900">
        <ActivityIndicator size="large" color="#0891B2" />
      </View>
    );
  }

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
              paddingTop: insets.top + 16,
              paddingBottom: 80,
              paddingHorizontal: 24,
              borderBottomLeftRadius: 40,
              borderBottomRightRadius: 40,
            }}
          >
            {/* Language Toggle */}
            <Pressable
              onPress={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
              className="flex-row items-center self-start bg-white/20 rounded-full px-4 py-2 mb-4"
            >
              <Globe size={18} color="#FFFFFF" />
              <Text
                style={{ fontFamily: 'Cairo_600SemiBold', fontSize: 14 }}
                className="text-white ml-2"
              >
                {language === 'ar' ? 'English' : 'العربية'}
              </Text>
            </Pressable>

            <FadeInDownView delay={100} duration={600} className="items-center">
              <View className="w-24 h-24 rounded-3xl bg-white dark:bg-slate-800 items-center justify-center mb-4 overflow-hidden">
                <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 32 }} className="text-teal-600">
                  {t.cure}
                </Text>
              </View>
              <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 28 }} className="text-white text-center mb-2">
                {t.cure}
              </Text>
              <Text style={{ fontFamily: 'Cairo_500Medium', fontSize: 16 }} className="text-white/90 text-center">
                {t.patientPortal}
              </Text>
            </FadeInDownView>
          </LinearGradient>

          <View
            className="mx-5 -mt-12 bg-white dark:bg-slate-800 rounded-3xl p-6 relative z-10"
            style={{ shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 12, elevation: 8 }}
          >
            <View className="flex-row items-center justify-center mb-6">
              <Text
                style={{ fontFamily: 'Cairo_700Bold', fontSize: 22 }}
                className="text-slate-800 dark:text-slate-100 mr-3"
              >
                {isRegisterMode
                  ? t.createAccount
                  : t.login}
              </Text>
              {isRegisterMode ? <UserPlus size={28} color="#0891B2" /> : <ShieldCheck size={28} color="#0891B2" />}
            </View>

            <Text
              style={{ fontFamily: 'Cairo_500Medium', fontSize: 15 }}
              className="text-slate-500 dark:text-slate-400 text-center mb-6"
            >
              {isRegisterMode
                ? (codeSent
                  ? t.signupEnterCode
                  : t.signupSubtitle)
                : t.loginSubtitle}
            </Text>

            {isRegisterMode ? (
              <View>
                {codeSent ? (
                  <View className="mb-4">
                    <Text
                      style={{ fontFamily: 'Cairo_600SemiBold', fontSize: 15 }}
                      className={`text-slate-700 dark:text-slate-200 mb-2 ${language === 'ar' ? 'text-right' : 'text-left'}`}
                    >
                      {t.verificationCode}
                    </Text>
                    <View className="bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                      <TextInput
                        value={registerForm.code}
                        onChangeText={text => setRegisterValue('code', normalizeArabicDigits(text).replace(/\D/g, '').slice(0, 6))}
                        placeholder="000000"
                        placeholderTextColor="#94A3B8"
                        keyboardType="number-pad"
                        textContentType="oneTimeCode"
                        maxLength={6}
                        className="px-4 py-4 text-slate-800 dark:text-slate-100 text-center"
                        style={{ fontFamily: 'Cairo_700Bold', fontSize: 22, letterSpacing: 6 }}
                      />
                    </View>
                    <Pressable onPress={() => { setCodeSent(false); setRegisterValue('code', ''); }} className="mt-3 py-1">
                      <Text style={{ fontFamily: 'Cairo_600SemiBold', fontSize: 14 }} className="text-teal-600 text-center">
                        {t.changeNumberOrResend}
                      </Text>
                    </Pressable>
                  </View>
                ) : (
                  <View>
                    <View className="mb-4">
                      <Text
                        style={{ fontFamily: 'Cairo_600SemiBold', fontSize: 15 }}
                        className={`text-slate-700 dark:text-slate-200 mb-2 ${language === 'ar' ? 'text-right' : 'text-left'}`}
                      >
                        {t.phoneNumberWhatsapp}
                      </Text>
                      <View className="bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <TextInput
                          value={registerForm.phone}
                          onChangeText={text => setRegisterValue('phone', normalizeArabicDigits(text).replace(/\D/g, '').slice(0, 14))}
                          placeholder={t.phonePlaceholder}
                          placeholderTextColor="#94A3B8"
                          keyboardType="phone-pad"
                          maxLength={14}
                          className={`px-4 py-4 text-slate-800 dark:text-slate-100 ${language === 'ar' ? 'text-right' : 'text-left'}`}
                          style={{ fontFamily: 'Cairo_500Medium' }}
                        />
                      </View>
                    </View>

                {[
                  { key: 'password', label: t.password, placeholder: '••••••••' },
                  { key: 'confirmPassword', label: t.confirmPassword, placeholder: '••••••••' },
                ].map(field => (
                  <View className="mb-4" key={field.key}>
                    <Text
                      style={{ fontFamily: 'Cairo_600SemiBold', fontSize: 15 }}
                      className={`text-slate-700 dark:text-slate-200 mb-2 ${language === 'ar' ? 'text-right' : 'text-left'}`}
                    >
                      {field.label}
                    </Text>
                    <View className={`bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 flex-row items-center ${language === 'ar' ? '' : 'flex-row-reverse'}`}>
                      <Pressable onPress={() => setShowPassword(!showPassword)} className="px-4 py-4">
                        {showPassword ? <EyeOff size={24} color="#94A3B8" /> : <Eye size={24} color="#94A3B8" />}
                      </Pressable>
                      <TextInput
                        value={registerForm[field.key as keyof RegisterForm]}
                        onChangeText={text => setRegisterValue(field.key as keyof RegisterForm, text)}
                        placeholder={field.placeholder}
                        placeholderTextColor="#94A3B8"
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
                        autoCorrect={false}
                        className={`flex-1 py-4 px-4 text-slate-800 dark:text-slate-100 ${language === 'ar' ? 'text-right' : 'text-left'}`}
                        style={{ fontFamily: 'Cairo_500Medium' }}
                      />
                    </View>
                  </View>
                ))}
                  </View>
                )}
              </View>
            ) : (
              <View>
                <View className="mb-4">
                  <Text
                    style={{ fontFamily: 'Cairo_600SemiBold', fontSize: 15 }}
                    className={`text-slate-700 dark:text-slate-200 mb-2 ${language === 'ar' ? 'text-right' : 'text-left'}`}
                  >
                    {t.phoneNumber}
                  </Text>
                  <View className="bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <TextInput
                      value={identifier}
                      onChangeText={setIdentifier}
                      placeholder={t.phonePlaceholder}
                      placeholderTextColor="#94A3B8"
                      autoCapitalize="none"
                      className={`px-4 py-4 text-slate-800 dark:text-slate-100 ${language === 'ar' ? 'text-right' : 'text-left'}`}
                      style={{ fontFamily: 'Cairo_500Medium' }}
                    />
                  </View>
                </View>

                <View className="mb-6">
                  <Text
                    style={{ fontFamily: 'Cairo_600SemiBold', fontSize: 15 }}
                    className={`text-slate-700 dark:text-slate-200 mb-2 ${language === 'ar' ? 'text-right' : 'text-left'}`}
                  >
                    {t.password}
                  </Text>
                  <View className="bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 flex-row items-center">
                    <Pressable onPress={() => setShowPassword(!showPassword)} className="px-4 py-4">
                      {showPassword ? <EyeOff size={24} color="#94A3B8" /> : <Eye size={24} color="#94A3B8" />}
                    </Pressable>
                    <TextInput
                      value={password}
                      onChangeText={setPassword}
                      placeholder="••••••••"
                      placeholderTextColor="#94A3B8"
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      className={`flex-1 py-4 pr-4 text-slate-800 dark:text-slate-100 ${language === 'ar' ? 'text-right' : 'text-left'}`}
                      style={{ fontFamily: 'Cairo_500Medium' }}
                    />
                  </View>
                </View>
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
              onPress={isRegisterMode ? handleRegister : handleLogin}
              disabled={isBusy}
              className="overflow-hidden rounded-xl active:opacity-90"
            >
              <LinearGradient
                colors={['#0891B2', '#0E7490']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  paddingVertical: 18,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                }}
              >
                {isBusy ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={{ fontFamily: 'Cairo_700Bold', fontSize: 18 }} className="text-white">
                    {isRegisterMode
                      ? (codeSent
                        ? t.submitCreateAccount
                        : t.sendWhatsappCode)
                      : t.loginButton}
                  </Text>
                )}
              </LinearGradient>
            </Pressable>
            
            <Pressable onPress={toggleMode} className="mt-4 py-2">
              <Text style={{ fontFamily: 'Cairo_600SemiBold', fontSize: 15 }} className="text-teal-600 text-center">
                {isRegisterMode
                  ? t.haveAccountLogIn
                  : t.noAccountCreateOne}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                setError('');
                router.push('/reset-password');
              }}
              className="mt-4 py-2"
            >
              <Text style={{ fontFamily: 'Cairo_600SemiBold', fontSize: 15 }} className="text-teal-600 text-center">
                {t.forgotPassword}
              </Text>
            </Pressable>
          </View>

          <View className="mx-5 mt-6 p-5 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-200 dark:border-amber-800 relative z-0">
            <View className={`flex-row items-start ${language === 'ar' ? 'justify-end' : 'justify-start'}`}>
              {language !== 'ar' && (
                <View className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/40 items-center justify-center mr-3">
                  <Info size={24} color="#D97706" />
                </View>
              )}
              <View className="flex-1">
                <Text
                  style={{ fontFamily: 'Cairo_700Bold', fontSize: 15 }}
                  className={`text-amber-800 dark:text-amber-200 mb-2 ${language === 'ar' ? 'text-right' : 'text-left'}`}
                >
                  {t.importantNote}
                </Text>
                <Text
                  style={{ fontFamily: 'Cairo_500Medium', fontSize: 14, lineHeight: 24 }}
                  className={`text-amber-700 dark:text-amber-300 ${language === 'ar' ? 'text-right' : 'text-left'}`}
                >
                  {t.verifyInfoNote}
                </Text>
              </View>
              {language === 'ar' && (
                <View className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/40 items-center justify-center ml-3">
                  <Info size={24} color="#D97706" />
                </View>
              )}
            </View>
          </View>

          <View className="mt-8 pb-4">
            <View className="flex-row gap-2 items-center justify-center mb-2">
              <Building2 size={18} color="#94A3B8" />
              <Text style={{ fontFamily: 'Cairo_500Medium', fontSize: 13 }} className="text-slate-400 dark:text-slate-500 mr-2">
                {t.e2nextSoftware}
              </Text>
            </View>
            <Text style={{ fontFamily: 'Cairo_400Regular', fontSize: 12 }} className="text-slate-400 dark:text-slate-500 text-center">
              {`${t.allRightsReserved} © ${currentYear}`}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
