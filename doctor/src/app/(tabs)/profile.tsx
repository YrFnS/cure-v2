import { useState } from "react";
import { RefreshControl, Switch, View } from "react-native";
import {
  CalendarDays,
  Phone,
  Stethoscope,
  UserRound,
  Building2,
} from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { API_MOCK, api } from "@/lib/api";
import type { Doctor, Gender } from "@/lib/types";
import { useTranslation } from "@/lib/settings-store";
import { Avatar } from "@/components/avatar";
import { LanguageButton } from "@/components/language-button";
import { LogoutButton } from "@/components/logout-button";
import {
  Button,
  Card,
  Choice,
  ErrorMessage,
  Field,
  Notice,
  QueryState,
  Row,
  Screen,
  T,
} from "@/components/ui";

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <Row>
      <View className="rounded-xl bg-canvas p-3">
        <Icon size={22} color="#5c85d9" />
      </View>
      <View className="flex-1 gap-1">
        <T className="text-sm text-muted">{label}</T>
        <T>{value}</T>
      </View>
    </Row>
  );
}
function ProfileEditor({
  doctor,
  onClose,
}: {
  doctor: Doctor;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const client = useQueryClient();
  const [firstName, setFirstName] = useState<string>(doctor.firstName);
  const [lastName, setLastName] = useState<string>(doctor.lastName);
  const [nameAr, setNameAr] = useState<string>(doctor.nameAr ?? "");
  const [specialty, setSpecialty] = useState<string>(doctor.specialty ?? "");
  const [bio, setBio] = useState<string>(doctor.bio ?? "");
  const [gender, setGender] = useState<Gender>(doctor.gender);
  const mutation = useMutation({
    mutationFn: async () => {
      if (!firstName.trim() || !lastName.trim()) throw new Error(t.required);
      return api.updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        nameAr: nameAr.trim(),
        specialty: specialty.trim(),
        bio: bio.trim(),
        gender,
      });
    },
    onSuccess: (data) => {
      client.setQueryData(["doctor"], data);
      onClose();
    },
  });
  return (
    <Card className="gap-5">
      <T className="font-bold text-xl">{t.edit}</T>
      <Field
        label={t.firstName}
        value={firstName}
        onChangeText={setFirstName}
        editable={!mutation.isPending}
        maxLength={80}
      />
      <Field
        label={t.lastName}
        value={lastName}
        onChangeText={setLastName}
        editable={!mutation.isPending}
        maxLength={80}
      />
      <Field
        label={t.nameAr}
        value={nameAr}
        onChangeText={setNameAr}
        editable={!mutation.isPending}
        maxLength={160}
      />
      <Field
        label={t.specialty}
        value={specialty}
        onChangeText={setSpecialty}
        editable={!mutation.isPending}
        maxLength={120}
      />
      <Field
        label={t.bio}
        value={bio}
        onChangeText={setBio}
        editable={!mutation.isPending}
        multiline
        maxLength={2000}
      />
      <T className="text-sm">{t.gender}</T>
      <Row>
        <Choice
          label={t.male}
          selected={gender === "MALE"}
          onPress={() => setGender("MALE")}
          disabled={mutation.isPending}
        />
        <Choice
          label={t.female}
          selected={gender === "FEMALE"}
          onPress={() => setGender("FEMALE")}
          disabled={mutation.isPending}
        />
      </Row>
      <ErrorMessage message={mutation.error?.message} />
      <Button
        title={t.save}
        pending={mutation.isPending}
        onPress={() => mutation.mutate()}
      />
      <Button
        title={t.cancel}
        variant="ghost"
        disabled={mutation.isPending}
        onPress={onClose}
      />
    </Card>
  );
}
export default function Profile() {
  const { t, language } = useTranslation();
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["doctor"],
    queryFn: () => api.profile(),
  });
  const [editing, setEditing] = useState<boolean>(false);
  const [preview, setPreview] = useState<string | null>(null);
  const status = useMutation({
    mutationFn: (active: boolean) =>
      api.updateProfile({ status: active ? "ACTIVE" : "INACTIVE" }),
    onSuccess: (data) => client.setQueryData(["doctor"], data),
  });
  const photo = useMutation({
    mutationFn: async () => {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) throw new Error(t.photoDenied);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });
      if (result.canceled) return null;
      const asset = result.assets[0];
      const mime = asset.mimeType ?? asset.file?.type;
      if (
        (mime !== "image/jpeg" && mime !== "image/png") ||
        (asset.fileSize ?? asset.file?.size ?? 0) > 5 * 1024 * 1024
      )
        throw new Error(t.invalidPhoto);
      const doctor = await api.photo(asset);
      return { doctor, uri: asset.uri };
    },
    onSuccess: (result) => {
      if (!result) return;
      client.setQueryData(["doctor"], result.doctor);
      if (API_MOCK) setPreview(result.uri);
    },
  });
  const doctor = query.data;
  const busy = photo.isPending || status.isPending;
  const name = doctor
    ? language === "ar" && doctor.nameAr
      ? doctor.nameAr
      : `${doctor.firstName} ${doctor.lastName}`
    : "";
  return (
    <Screen
      refreshControl={
        !editing ? (
          <RefreshControl
            refreshing={query.isRefetching}
            onRefresh={() => {
              void query.refetch();
            }}
            tintColor="#5c85d9"
          />
        ) : undefined
      }
    >
      <QueryState query={query} />
      {doctor && (
        <>
          <LinearGradient
            colors={["#5c85d9", "#3F51B5"]}
            style={{
              borderRadius: 32,
              padding: 24,
              alignItems: "center",
              gap: 12,
            }}
          >
            <Avatar url={preview ?? doctor.photoUrl} name={name} large />
            <T className="text-center font-bold text-2xl text-white">{name}</T>
            <View className="rounded-full bg-white/20 px-5 py-2">
              <T className="text-center text-white">
                {doctor.specialty || t.notSet}
              </T>
            </View>
          </LinearGradient>
          <ErrorMessage message={photo.error?.message} />
          <Button
            title={t.photo}
            variant="secondary"
            pending={photo.isPending}
            disabled={status.isPending || editing}
            onPress={() => photo.mutate()}
          />
          <T className="text-center text-xs text-muted">{t.photoHint}</T>
          {editing ? (
            <ProfileEditor doctor={doctor} onClose={() => setEditing(false)} />
          ) : (
            <Button
              title={t.edit}
              disabled={busy}
              onPress={() => setEditing(true)}
            />
          )}
          <Card className="gap-4">
            <Row className="justify-between">
              <T className="font-semibold text-lg">
                {doctor.status === "ACTIVE" ? t.active : t.inactive}
              </T>
              <Switch
                accessibilityLabel={t.active}
                // react-native-web positions the thumb with LTR offsets; under RTL it leaves the track.
                style={{ direction: "ltr" }}
                value={doctor.status === "ACTIVE"}
                disabled={busy || editing}
                trackColor={{ false: "#e3e9f6", true: "#5c85d9" }}
                onValueChange={(value) => status.mutate(value)}
              />
            </Row>
            <T className="text-sm text-muted">{t.activeHint}</T>
            <ErrorMessage message={status.error?.message} />
            {status.isPending && <Notice message={t.loading} />}
          </Card>
          <Card className="gap-5">
            <T className="font-bold text-lg">{t.contact}</T>
            <InfoRow icon={Phone} label={t.phone} value={doctor.phone} />
            <InfoRow
              icon={Building2}
              label={t.hospital}
              value={doctor.hospital?.name ?? t.notSet}
            />
          </Card>
          <Card className="gap-5">
            <T className="font-bold text-lg">{t.personal}</T>
            <InfoRow
              icon={UserRound}
              label={t.gender}
              value={doctor.gender === "MALE" ? t.male : t.female}
            />
            <InfoRow
              icon={CalendarDays}
              label={t.birthDate}
              value={doctor.birthDate?.slice(0, 10) || t.notSet}
            />
            <InfoRow
              icon={Stethoscope}
              label={t.specialty}
              value={doctor.specialty || t.notSet}
            />
            {doctor.bio && <T>{doctor.bio}</T>}
          </Card>
        </>
      )}
      <LanguageButton />
      <LogoutButton />
    </Screen>
  );
}
