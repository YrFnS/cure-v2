import { useState } from "react";
import { TextInput, View } from "react-native";
import { useTranslation } from "@/lib/settings-store";
import { cn } from "@/lib/cn";
import { T } from "@/components/ui";

// One real input under six boxes: typing, backspace, paste and SMS autofill all behave natively.
export function CodeInput({
  code,
  onChange,
  disabled,
}: {
  code: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  const { t } = useTranslation();
  const [focused, setFocused] = useState<boolean>(false);
  return (
    <View
      className="flex-row justify-center gap-2"
      style={{ direction: "ltr" }}
    >
      {Array.from({ length: 6 }, (_, index) => (
        <View
          key={index}
          className={cn(
            "h-14 min-w-0 flex-1 items-center justify-center rounded-xl border border-primary bg-white",
            focused && index === Math.min(code.length, 5) && "border-2",
          )}
          style={{ maxWidth: 52 }}
        >
          <T className="text-center font-bold text-xl text-indigo">
            {code[index] ?? ""}
          </T>
        </View>
      ))}
      <TextInput
        accessibilityLabel={t.verify}
        editable={!disabled}
        autoFocus
        keyboardType="number-pad"
        autoComplete="sms-otp"
        textContentType="oneTimeCode"
        caretHidden
        value={code}
        onChangeText={(value) =>
          onChange(
            value
              .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
              .replace(/[^0-9]/g, "")
              .slice(0, 6),
          )
        }
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
          opacity: 0,
        }}
      />
    </View>
  );
}
