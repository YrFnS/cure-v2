import { useMemo, useState } from "react";
import { FlatList, RefreshControl, ScrollView, View } from "react-native";
import { CalendarDays, Clock3, MapPin, UserRound } from "lucide-react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Appointment, Status } from "@/lib/types";
import { canTransition } from "@/lib/validation";
import { useTranslation } from "@/lib/settings-store";
import {
  Button,
  Card,
  Choice,
  Dialog,
  ErrorMessage,
  Field,
  QueryState,
  Row,
  Screen,
  T,
} from "@/components/ui";

const statuses: Status[] = ["SCHEDULED", "OPEN", "CLOSED", "CANCELLED"];
const statusColors: Record<Status, { color: string; backgroundColor: string }> =
  {
    SCHEDULED: { color: "#3F51B5", backgroundColor: "#e3e9f6" },
    OPEN: { color: "#287a2d", backgroundColor: "#edf7ed" },
    CLOSED: { color: "#667085", backgroundColor: "#f0f1f4" },
    CANCELLED: { color: "#D32F2F", backgroundColor: "#fff0f0" },
  };
export default function Patients() {
  const { t } = useTranslation();
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["appointments"],
    queryFn: () => api.appointments(),
  });
  const [search, setSearch] = useState<string>("");
  const [status, setStatus] = useState<Status | "ALL">("ALL");
  const [descending, setDescending] = useState<boolean>(false);
  const [cancelling, setCancelling] = useState<Appointment | null>(null);
  const mutation = useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string;
      status: Exclude<Status, "SCHEDULED">;
    }) => api.status(id, status),
    onSuccess: async () => {
      setCancelling(null);
      await Promise.all([
        client.invalidateQueries({ queryKey: ["appointments"] }),
        client.invalidateQueries({ queryKey: ["stats"] }),
      ]);
    },
  });
  const appointments = useMemo(
    () =>
      (query.data ?? [])
        .filter(
          (a) =>
            (status === "ALL" || a.status === status) &&
            a.patient.name
              .toLocaleLowerCase()
              .includes(search.trim().toLocaleLowerCase()),
        )
        .sort(
          (a, b) =>
            (descending ? -1 : 1) *
            `${a.date} ${a.slot.from}`.localeCompare(
              `${b.date} ${b.slot.from}`,
            ),
        ),
    [query.data, status, search, descending],
  );
  return (
    <Screen scroll={false}>
      <FlatList
        data={appointments}
        keyExtractor={(item) => item.id}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{
          padding: 20,
          gap: 16,
          paddingBottom: 40,
          flexGrow: 1,
        }}
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching}
            onRefresh={() => {
              void query.refetch();
            }}
            tintColor="#5c85d9"
          />
        }
        ListHeaderComponent={
          <View className="gap-4">
            <Field label={t.search} value={search} onChangeText={setSearch} />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ flexGrow: 0 }}
            >
              <Row className="pb-2">
                <Choice
                  label={t.all}
                  selected={status === "ALL"}
                  onPress={() => setStatus("ALL")}
                />
                {statuses.map((value) => (
                  <Choice
                    key={value}
                    label={t[value]}
                    selected={status === value}
                    onPress={() => setStatus(value)}
                  />
                ))}
              </Row>
            </ScrollView>
            <Button
              title={descending ? t.newest : t.oldest}
              variant="secondary"
              onPress={() => setDescending(!descending)}
            />
            <QueryState query={query} />
            <ErrorMessage message={mutation.error?.message} />
          </View>
        }
        ListEmptyComponent={
          query.data !== undefined ? (
            <Card className="gap-3">
              <T className="font-bold text-lg">{t.noAppointments}</T>
              <T className="text-muted">{t.changeFilters}</T>
              <Button
                title={t.clearFilters}
                variant="secondary"
                onPress={() => {
                  setSearch("");
                  setStatus("ALL");
                }}
              />
            </Card>
          ) : null
        }
        renderItem={({ item }) => (
          <Card className="gap-4 overflow-hidden border-s-4 border-primary">
            <Row className="items-start">
              <View className="rounded-full bg-soft p-3">
                <UserRound color="#5c85d9" size={26} />
              </View>
              <View className="flex-1 gap-1">
                <T className="font-bold">{item.patient.name}</T>
                <T className="text-sm text-muted">
                  {item.patient.gender
                    ? item.patient.gender === "MALE"
                      ? t.male
                      : t.female
                    : t.notSet}
                  {item.patient.age != null
                    ? ` · ${item.patient.age} ${t.years}`
                    : ""}
                </T>
              </View>
              <View
                className="rounded-full px-3 py-1"
                style={{
                  backgroundColor: statusColors[item.status].backgroundColor,
                }}
              >
                <T
                  className="font-semibold text-xs"
                  style={{ color: statusColors[item.status].color }}
                >
                  {t[item.status]}
                </T>
              </View>
            </Row>
            <View className="h-px bg-soft" />
            <Row>
              <CalendarDays size={18} color="#5c85d9" />
              <T className="text-sm">{item.date}</T>
            </Row>
            <Row>
              <Clock3 size={18} color="#5c85d9" />
              <T className="text-sm" style={{ writingDirection: "ltr" }}>
                {item.slot.from} – {item.slot.to}
              </T>
            </Row>
            {item.doctor.hospital && (
              <Row>
                <MapPin size={18} color="#5c85d9" />
                <T className="flex-1 text-sm">{item.doctor.hospital.name}</T>
              </Row>
            )}
            {(item.status === "SCHEDULED" || item.status === "OPEN") && (
              <Row className="flex-wrap">
                <View className="min-w-24 flex-1">
                  <Button
                    title={item.status === "SCHEDULED" ? t.start : t.done}
                    disabled={mutation.isPending}
                    pending={
                      mutation.isPending && mutation.variables?.id === item.id
                    }
                    onPress={() => {
                      const next =
                        item.status === "SCHEDULED" ? "OPEN" : "CLOSED";
                      if (canTransition(item.status, next))
                        mutation.mutate({ id: item.id, status: next });
                    }}
                  />
                </View>
                <View className="min-w-24 flex-1">
                  <Button
                    title={t.cancelAppointment}
                    variant="danger"
                    disabled={mutation.isPending}
                    onPress={() => {
                      mutation.reset();
                      setCancelling(item);
                    }}
                  />
                </View>
              </Row>
            )}
          </Card>
        )}
      />
      <Dialog
        visible={cancelling !== null}
        title={t.cancelAppointment}
        onClose={() => {
          if (!mutation.isPending) setCancelling(null);
        }}
      >
        <T>{t.cancelAppointmentBody}</T>
        <ErrorMessage message={mutation.error?.message} />
        <Button
          title={t.cancelAppointment}
          variant="danger"
          pending={mutation.isPending}
          onPress={() => {
            if (cancelling)
              mutation.mutate({ id: cancelling.id, status: "CANCELLED" });
          }}
        />
        <Button
          title={t.back}
          variant="ghost"
          disabled={mutation.isPending}
          onPress={() => setCancelling(null)}
        />
      </Dialog>
    </Screen>
  );
}
