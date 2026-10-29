import { useState } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { Check, Stethoscope } from "lucide-react-native";
import { API_MOCK, api } from "@/lib/api";
import { acceptSession } from "@/lib/auth-store";
import type { Gender } from "@/lib/types";
import { validBirthDate, validPhone } from "@/lib/validation";
import { useTranslation } from "@/lib/settings-store";
import {
  Button,
  Card,
  Choice,
  Dialog,
  ErrorMessage,
  Field,
  Notice,
  Row,
  Screen,
  T,
} from "@/components/ui";
import { CodeInput } from "@/components/code-input";
import { DateField } from "@/components/date-field";

type Draft = {
  firstName: string;
  lastName: string;
  phone: string;
  password: string;
  birthDate: string;
  gender: Gender;
  specialty: string;
};
export default function Register() {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<Draft>({
    firstName: "",
    lastName: "",
    phone: "",
    password: "",
    birthDate: "",
    gender: "MALE",
    specialty: "",
  });
  const [agreed, setAgreed] = useState<boolean>(false);
  const [terms, setTerms] = useState<boolean>(false);
  const [verify, setVerify] = useState<boolean>(false);
  const [code, setCode] = useState<string>("");
  const [resent, setResent] = useState<boolean>(false);
  const send = useMutation({
    mutationFn: async () => {
      if (!draft.firstName.trim() || !draft.lastName.trim())
        throw new Error(t.required);
      if (!validPhone(draft.phone)) throw new Error(t.invalidPhone);
      if (draft.password.length < 6) throw new Error(t.passwordShort);
      if (!validBirthDate(draft.birthDate)) throw new Error(t.invalidDate);
      if (!agreed) throw new Error(t.termsRequired);
      return api.signupSend(draft.phone, draft.password);
    },
    onSuccess: () => {
      if (verify) setResent(true);
      setVerify(true);
    },
  });
  const confirm = useMutation({
    mutationFn: async () => {
      if (!/^\d{6}$/.test(code)) throw new Error(t.invalidCode);
      await acceptSession(
        await api.signupConfirm({
          phone: draft.phone.trim(),
          code,
          firstName: draft.firstName.trim(),
          lastName: draft.lastName.trim(),
          birthDate: draft.birthDate,
          gender: draft.gender,
          specialty: draft.specialty.trim() || undefined,
        }),
      );
      setDraft({ ...draft, password: "" });
      setCode("");
    },
  });
  const pending = send.isPending || confirm.isPending;
  const field = (key: keyof Draft, value: string) =>
    setDraft((current) => ({ ...current, [key]: value }));
  if (verify)
    return (
      <Screen>
        <Stethoscope
          color="#5c85d9"
          size={54}
          style={{ alignSelf: "center" }}
        />
        <T className="text-center font-bold text-2xl">{t.verifyPhone}</T>
        <T className="text-center text-muted">{t.codeSent}</T>
        <T className="text-center" style={{ writingDirection: "ltr" }}>
          {draft.phone}
        </T>
        <Card className="gap-5">
          <CodeInput code={code} onChange={setCode} disabled={pending} />
          <ErrorMessage
            message={confirm.error?.message ?? send.error?.message}
          />
          {resent && <Notice message={t.codeResent} />}
          <Button
            title={t.verify}
            pending={confirm.isPending}
            disabled={send.isPending}
            onPress={() => confirm.mutate()}
          />
          <Button
            title={t.resend}
            variant="secondary"
            pending={send.isPending}
            disabled={confirm.isPending}
            onPress={() => {
              confirm.reset();
              send.mutate();
            }}
          />
          <Button
            title={t.changeDetails}
            variant="ghost"
            disabled={pending}
            onPress={() => {
              setVerify(false);
              setCode("");
              setResent(false);
              confirm.reset();
              send.reset();
            }}
          />
        </Card>
        {API_MOCK && <Notice message={t.mockHint} />}
      </Screen>
    );
  return (
    <Screen>
      <View className="gap-2">
        <T className="font-bold text-2xl">{t.register}</T>
        <T className="text-muted">{t.signupIntro}</T>
      </View>
      <Card className="gap-5">
        <Field
          label={t.firstName}
          value={draft.firstName}
          onChangeText={(v) => field("firstName", v)}
          editable={!pending}
          autoComplete="given-name"
          maxLength={80}
        />
        <Field
          label={t.lastName}
          value={draft.lastName}
          onChangeText={(v) => field("lastName", v)}
          editable={!pending}
          autoComplete="family-name"
          maxLength={80}
        />
        <Field
          label={t.phone}
          value={draft.phone}
          onChangeText={(v) => field("phone", v)}
          editable={!pending}
          keyboardType="phone-pad"
          autoComplete="tel"
          placeholder="07XXXXXXXXX"
          ltr
        />
        <Field
          label={t.password}
          value={draft.password}
          onChangeText={(v) => field("password", v)}
          editable={!pending}
          secureTextEntry
          autoComplete="new-password"
          ltr
        />
        <DateField
          label={t.birthDate}
          value={draft.birthDate}
          onChange={(v) => field("birthDate", v)}
          disabled={pending}
        />
        <T className="font-medium text-sm">{t.gender}</T>
        <Row>
          <Choice
            label={t.male}
            selected={draft.gender === "MALE"}
            onPress={() => field("gender", "MALE")}
            disabled={pending}
          />
          <Choice
            label={t.female}
            selected={draft.gender === "FEMALE"}
            onPress={() => field("gender", "FEMALE")}
            disabled={pending}
          />
        </Row>
        <Field
          label={t.specialty}
          value={draft.specialty}
          onChangeText={(v) => field("specialty", v)}
          editable={!pending}
          maxLength={120}
        />
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: agreed }}
          disabled={pending}
          onPress={() => setAgreed(!agreed)}
        >
          <Row>
            <View
              className={
                agreed
                  ? "h-7 w-7 items-center justify-center rounded-lg bg-primary"
                  : "h-7 w-7 rounded-lg border border-primary"
              }
            >
              {agreed && <Check size={20} color="white" />}
            </View>
            <T className="flex-1 text-sm">{t.agree}</T>
          </Row>
        </Pressable>
        <Button
          title={t.terms}
          variant="ghost"
          onPress={() => setTerms(true)}
        />
        <ErrorMessage message={send.error?.message} />
        <Button
          title={t.register}
          pending={pending}
          onPress={() => send.mutate()}
        />
      </Card>
      <Button
        title={t.returnLogin}
        variant="ghost"
        onPress={() => router.replace("/login")}
      />
      <Dialog title={t.terms} visible={terms} onClose={() => setTerms(false)}>
        <T>{t.termsBody}</T>
        <Button title={t.close} onPress={() => setTerms(false)} />
      </Dialog>
    </Screen>
  );
}
