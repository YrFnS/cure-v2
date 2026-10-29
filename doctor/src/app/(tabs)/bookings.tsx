import { useState } from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import {
  CalendarDays,
  Clock3,
  Pencil,
  Trash2,
  UsersRound,
} from "lucide-react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { days } from "@/lib/types";
import type { Day, SlotInput } from "@/lib/types";
import { scheduleError } from "@/lib/validation";
import { useTranslation } from "@/lib/settings-store";
import {
  Button,
  Card,
  Choice,
  Dialog,
  ErrorMessage,
  Field,
  Notice,
  QueryState,
  Row,
  Screen,
  T,
} from "@/components/ui";

export default function Bookings() {
  const { t } = useTranslation();
  const client = useQueryClient();
  const query = useQuery({ queryKey: ["schedule"], queryFn: api.schedule });
  const [editing, setEditing] = useState<boolean>(false);
  const [draft, setDraft] = useState<SlotInput[] | null>(null);
  const [day, setDay] = useState<Day>("SUN");
  const [from, setFrom] = useState<string>("09:00");
  const [to, setTo] = useState<string>("12:00");
  const [max, setMax] = useState<string>("10");
  const [validation, setValidation] = useState<string | null>(null);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [saved, setSaved] = useState<boolean>(false);
  const [confirm, setConfirm] = useState<boolean>(false);
  const [discard, setDiscard] = useState<boolean>(false);
  const slots = draft ?? query.data?.slots ?? [];
  const mutation = useMutation({
    mutationFn: async (input: SlotInput[]) => {
      const error = scheduleError(input);
      if (error) throw new Error(t[error]);
      return api.saveSchedule(
        input.map(({ day, from, to, maxAppointments }) => ({
          day,
          from,
          to,
          maxAppointments,
        })),
      );
    },
    onSuccess: (data) => {
      client.setQueryData(["schedule"], data);
      setDraft(null);
      setEditIndex(null);
      setConfirm(false);
      setSaved(true);
      setValidation(null);
    },
  });
  function addSlot() {
    const slot = {
      day,
      from: from.trim(),
      to: to.trim(),
      maxAppointments: Number(max),
    };
    const next =
      editIndex === null
        ? [...slots, slot]
        : slots.map((current, i) => (i === editIndex ? slot : current));
    const error = scheduleError(next);
    if (error) {
      setValidation(t[error]);
      return;
    }
    setDraft(next);
    setEditIndex(null);
    setValidation(null);
    setSaved(false);
    mutation.reset();
  }
  return (
    <Screen
      refreshControl={
        draft === null ? (
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
      <Row className="rounded-2xl bg-soft p-2">
        <View className="flex-1">
          <Button
            title={t.weekly}
            variant={editing ? "ghost" : "primary"}
            onPress={() => setEditing(false)}
          />
        </View>
        <View className="flex-1">
          <Button
            title={t.manage}
            variant={editing ? "primary" : "ghost"}
            onPress={() => setEditing(true)}
          />
        </View>
      </Row>
      <QueryState query={query} />
      {query.data !== undefined && (
        <>
          <Notice message={t.scheduleHint} />
          {draft !== null && <Notice message={t.unsaved} />}
          {saved && <Notice message={t.saved} />}
          {editing && (
            <Card className="gap-4">
              <Row>
                <CalendarDays size={22} color="#5c85d9" />
                <T className="font-bold text-lg">
                  {editIndex === null ? t.addSlot : t.editSlot}
                </T>
              </Row>
              <T className="text-sm">{t.day}</T>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ flexGrow: 0 }}
              >
                <Row className="pb-2">
                  {days.map((value) => (
                    <Choice
                      key={value}
                      label={t[value]}
                      selected={day === value}
                      disabled={mutation.isPending}
                      onPress={() => setDay(value)}
                    />
                  ))}
                </Row>
              </ScrollView>
              <Row className="items-start">
                <View className="flex-1">
                  <Field
                    label={`${t.from} (HH:mm)`}
                    value={from}
                    onChangeText={setFrom}
                    editable={!mutation.isPending}
                    placeholder="09:00"
                    ltr
                    maxLength={5}
                    keyboardType="numbers-and-punctuation"
                  />
                </View>
                <View className="flex-1">
                  <Field
                    label={`${t.to} (HH:mm)`}
                    value={to}
                    onChangeText={setTo}
                    editable={!mutation.isPending}
                    placeholder="12:00"
                    ltr
                    maxLength={5}
                    keyboardType="numbers-and-punctuation"
                  />
                </View>
              </Row>
              <Field
                label={t.max}
                value={max}
                onChangeText={setMax}
                editable={!mutation.isPending}
                keyboardType="number-pad"
                ltr
                maxLength={2}
              />
              <ErrorMessage message={validation} />
              <Button
                title={editIndex === null ? t.addSlot : t.updateSlot}
                variant="secondary"
                disabled={mutation.isPending}
                onPress={addSlot}
              />
              {editIndex !== null && (
                <Button
                  title={t.cancel}
                  variant="ghost"
                  onPress={() => {
                    setEditIndex(null);
                    setValidation(null);
                  }}
                />
              )}
            </Card>
          )}
          {slots.length === 0 && (
            <Card className="gap-3">
              <T className="font-bold text-lg">{t.noSlots}</T>
              <T className="text-muted">{t.addFirst}</T>
              {!editing && (
                <Button title={t.manage} onPress={() => setEditing(true)} />
              )}
            </Card>
          )}
          {days.map((value) => {
            const grouped = slots
              .map((slot, index) => ({ slot, index }))
              .filter(({ slot }) => slot.day === value)
              .sort((a, b) => a.slot.from.localeCompare(b.slot.from));
            return grouped.length > 0 ? (
              <Card key={value} className="gap-4">
                <Row>
                  <CalendarDays size={22} color="#3F51B5" />
                  <T className="font-bold text-lg text-indigo">{t[value]}</T>
                </Row>
                {grouped.map(({ slot, index }) => (
                  <View key={index} className="gap-3 rounded-xl bg-canvas p-4">
                    <Row>
                      <Clock3 size={18} color="#5c85d9" />
                      <T
                        className="flex-1 font-semibold"
                        style={{ writingDirection: "ltr" }}
                      >
                        {slot.from} – {slot.to}
                      </T>
                    </Row>
                    <Row>
                      <UsersRound size={18} color="#5c85d9" />
                      <T className="flex-1 text-sm">
                        {t.max}: {slot.maxAppointments}
                      </T>
                      {editing && (
                        <View>
                          <Pencil
                            color="#5c85d9"
                            size={18}
                            style={{ alignSelf: "center" }}
                          />
                          <Button
                            title={t.editSlotShort}
                            variant="ghost"
                            disabled={mutation.isPending}
                            onPress={() => {
                              setDay(slot.day);
                              setFrom(slot.from);
                              setTo(slot.to);
                              setMax(String(slot.maxAppointments));
                              setEditIndex(index);
                              setValidation(null);
                            }}
                          />
                        </View>
                      )}
                      {editing && (
                        <View>
                          <Trash2
                            color="#D32F2F"
                            size={18}
                            style={{ alignSelf: "center" }}
                          />
                          <Button
                            title={t.remove}
                            variant="danger"
                            disabled={mutation.isPending}
                            onPress={() => {
                              setDraft(slots.filter((_, i) => i !== index));
                              setEditIndex(null);
                              setSaved(false);
                              mutation.reset();
                            }}
                          />
                        </View>
                      )}
                    </Row>
                  </View>
                ))}
              </Card>
            ) : null;
          })}
          {editing && (
            <View className="gap-3">
              <ErrorMessage message={mutation.error?.message} />
              <Button
                title={t.saveSchedule}
                pending={mutation.isPending}
                disabled={draft === null}
                onPress={() => setConfirm(true)}
              />
              {draft !== null && (
                <Button
                  title={t.discard}
                  variant="ghost"
                  disabled={mutation.isPending}
                  onPress={() => setDiscard(true)}
                />
              )}
            </View>
          )}
        </>
      )}
      <Dialog
        visible={confirm}
        title={t.confirmSave}
        onClose={() => {
          if (!mutation.isPending) setConfirm(false);
        }}
      >
        <T>{t.replaceSchedule}</T>
        <ErrorMessage message={mutation.error?.message} />
        <Button
          title={t.saveSchedule}
          pending={mutation.isPending}
          onPress={() => mutation.mutate(slots)}
        />
        <Button
          title={t.cancel}
          variant="ghost"
          disabled={mutation.isPending}
          onPress={() => setConfirm(false)}
        />
      </Dialog>
      <Dialog
        visible={discard}
        title={t.unsaved}
        onClose={() => setDiscard(false)}
      >
        <T>{t.discardBody}</T>
        <Button
          title={t.discard}
          variant="danger"
          onPress={() => {
            setDraft(null);
            setEditIndex(null);
            setValidation(null);
            setDiscard(false);
            mutation.reset();
          }}
        />
        <Button
          title={t.back}
          variant="ghost"
          onPress={() => setDiscard(false)}
        />
      </Dialog>
    </Screen>
  );
}
