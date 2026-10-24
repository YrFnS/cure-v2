import { useState } from "react";
import { Image, View } from "react-native";
import { router } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { API_MOCK, api } from "@/lib/api";
import { acceptSession } from "@/lib/auth-store";
import { validPhone } from "@/lib/validation";
import { useTranslation } from "@/lib/settings-store";
import {
  Button,
  Card,
  ErrorMessage,
  Field,
  Notice,
  Screen,
  T,
} from "@/components/ui";
import { LanguageButton } from "@/components/language-button";

export default function Login() {
  const { t } = useTranslation();
  const [phone, setPhone] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const mutation = useMutation({
    mutationFn: async () => {
      if (!validPhone(phone)) throw new Error(t.invalidPhone);
      if (!password) throw new Error(t.required);
      await acceptSession(await api.login(phone, password));
      setPassword("");
    },
  });
  return (
    <Screen>
      <LanguageButton />
      <Image
        source={require("../../assets/images/login-hero.png")}
        style={{ width: 160, height: 160, alignSelf: "center" }}
        resizeMode="contain"
        accessibilityLabel={t.appName}
      />
      <View className="gap-3">
        <T className="text-center font-bold text-3xl">{t.login}</T>
        <T className="text-center text-muted">{t.loginIntro}</T>
      </View>
      <Card className="gap-5">
        <Field
          label={t.phone}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          autoComplete="tel"
          placeholder="07XXXXXXXXX"
          ltr
          editable={!mutation.isPending}
        />
        <Field
          label={t.password}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="current-password"
          ltr
          editable={!mutation.isPending}
          onSubmitEditing={() => mutation.mutate()}
        />
        <ErrorMessage message={mutation.error?.message} />
        <Button
          title={t.login}
          pending={mutation.isPending}
          onPress={() => mutation.mutate()}
        />
      </Card>
      {API_MOCK && <Notice message={t.mockHint} />}
      <Button
        title={t.register}
        variant="secondary"
        onPress={() => router.push("/register")}
      />
    </Screen>
  );
}
