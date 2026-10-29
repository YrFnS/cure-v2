import { View } from "react-native";
import { localDate } from "@/lib/validation";
import { T } from "@/components/ui";
import type { DateFieldProps } from "./date-field";

// The browser's own date input: a calendar on desktop, the system picker on phones.
export function DateField({ label, value, onChange, disabled }: DateFieldProps) {
  return (
    <View className="gap-2">
      <T className="font-medium text-sm">{label}</T>
      <input
        type="date"
        aria-label={label}
        value={value}
        disabled={disabled}
        min="1900-01-01"
        max={localDate()}
        onChange={(event) => onChange(event.target.value)}
        style={{
          minHeight: 56,
          borderRadius: 12,
          border: "1px solid #e3e9f6",
          background: "white",
          color: "#2D3142",
          padding: "12px 16px",
          fontSize: 16,
          fontFamily: "CairoRegular",
          direction: "ltr",
        }}
      />
    </View>
  );
}
