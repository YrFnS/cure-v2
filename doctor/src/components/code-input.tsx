import { useRef } from "react";
import { TextInput, View } from "react-native";
import { useTranslation } from "@/lib/settings-store";

export function CodeInput({
  code,
  onChange,
  disabled,
}: {
  code: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  const refs = useRef<(TextInput | null)[]>([]);
  const { t } = useTranslation();
  return (
    <View
      className="flex-row justify-center gap-2"
      style={{ direction: "ltr" }}
    >
      {Array.from({ length: 6 }, (_, index) => (
        <TextInput
          key={index}
          ref={(ref) => {
            refs.current[index] = ref;
          }}
          accessibilityLabel={`${t.verify} ${index + 1}`}
          editable={!disabled}
          keyboardType="number-pad"
          autoComplete={index === 0 ? "sms-otp" : "off"}
          textContentType={index === 0 ? "oneTimeCode" : "none"}
          selectTextOnFocus
          maxLength={6}
          value={code[index] === " " ? "" : (code[index] ?? "")}
          className="h-14 min-w-0 flex-1 rounded-xl border border-primary bg-white text-center font-bold text-xl text-indigo"
          style={{ maxWidth: 52 }}
          onChangeText={(value) => {
            const digits = value.replace(/[^0-9]/g, "");
            const next = code.padEnd(6, " ").split("");
            if (!digits) next[index] = " ";
            else
              for (let i = 0; i < digits.length && index + i < 6; i++)
                next[index + i] = digits[i];
            onChange(next.join(""));
            if (digits)
              refs.current[Math.min(index + digits.length, 5)]?.focus();
          }}
          onKeyPress={(event) => {
            if (
              event.nativeEvent.key === "Backspace" &&
              (!code[index] || code[index] === " ") &&
              index > 0
            )
              refs.current[index - 1]?.focus();
          }}
        />
      ))}
    </View>
  );
}
