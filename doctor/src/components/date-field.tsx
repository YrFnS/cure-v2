import { useState } from "react";
import { Platform, Pressable, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useTranslation } from "@/lib/settings-store";
import { localDate } from "@/lib/validation";
import { Button, T } from "@/components/ui";

export type DateFieldProps = {
  label: string;
  value: string; // YYYY-MM-DD or ""
  onChange: (value: string) => void;
  disabled?: boolean;
};

export function DateField({ label, value, onChange, disabled }: DateFieldProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState<boolean>(false);
  const ios = Platform.OS === "ios";
  return (
    <View className="gap-2">
      <T className="font-medium text-sm">{label}</T>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        disabled={disabled}
        onPress={() => setOpen(true)}
        className="min-h-14 justify-center rounded-xl border border-soft bg-white px-4 py-3"
      >
        <T className={value ? "" : "text-muted"}>{value || t.chooseDate}</T>
      </Pressable>
      {open && (
        <DateTimePicker
          value={value ? new Date(`${value}T12:00:00`) : new Date(1985, 0, 1)}
          mode="date"
          display={ios ? "spinner" : "default"}
          minimumDate={new Date(1900, 0, 1)}
          maximumDate={new Date()}
          onChange={(event, picked) => {
            if (!ios) setOpen(false); // Android's dialog closes itself; iOS stays inline until Done
            if (event.type === "set" && picked) onChange(localDate(picked));
          }}
        />
      )}
      {open && ios && (
        <Button title={t.done} variant="secondary" onPress={() => setOpen(false)} />
      )}
    </View>
  );
}
