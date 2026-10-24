import type { PropsWithChildren, ReactElement } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import type {
  TextProps,
  TextInputProps,
  ViewProps,
  RefreshControlProps,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "@/lib/settings-store";
import { cn } from "@/lib/cn";

export function T({
  className,
  style,
  ...props
}: TextProps & { className?: string }) {
  const { isRTL } = useTranslation();
  return (
    <Text
      selectable
      {...props}
      className={cn(
        "font-regular text-base text-ink",
        isRTL ? "text-right" : "text-left",
        className,
      )}
      style={[
        {
          writingDirection: isRTL ? "rtl" : "ltr",
        },
        style,
      ]}
    />
  );
}
export function Row({
  className,
  ...props
}: ViewProps & { className?: string }) {
  return (
    <View {...props} className={cn("flex-row items-center gap-3", className)} />
  );
}
export function Card({
  className,
  ...props
}: ViewProps & { className?: string }) {
  return (
    <View
      {...props}
      className={cn("rounded-2xl bg-white p-5", className)}
      style={[
        {
          shadowColor: "#3F51B5",
          shadowOpacity: 0.07,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 2,
        },
        props.style,
      ]}
    />
  );
}
export function Screen({
  children,
  refreshControl,
  scroll = true,
}: PropsWithChildren<{
  refreshControl?: ReactElement<RefreshControlProps>;
  scroll?: boolean;
}>) {
  const insets = useSafeAreaInsets();
  const { isRTL } = useTranslation();
  return (
    <KeyboardAvoidingView
      className="flex-1 bg-canvas"
      style={{ direction: isRTL ? "rtl" : "ltr" }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 96 : 0}
    >
      {scroll ? (
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          refreshControl={refreshControl}
          contentContainerStyle={{
            padding: 20,
            gap: 20,
            paddingBottom: Math.max(insets.bottom, 20) + 24,
            flexGrow: 1,
          }}
        >
          <View className="w-full max-w-2xl self-center gap-5">{children}</View>
        </ScrollView>
      ) : (
        children
      )}
    </KeyboardAvoidingView>
  );
}
export function Button({
  title,
  onPress,
  pending = false,
  disabled = false,
  variant = "primary",
}: {
  title: string;
  onPress: () => void;
  pending?: boolean;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger" | "ghost";
}) {
  const blocked = pending || disabled;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: blocked, busy: pending }}
      onPress={onPress}
      disabled={blocked}
      className={cn(
        "min-h-12 items-center justify-center rounded-xl px-4 py-3",
        variant === "primary" && "bg-primary",
        variant === "secondary" && "border border-soft bg-white",
        variant === "danger" && "bg-red-50",
        blocked && "opacity-50",
      )}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : blocked ? 0.5 : 1 })}
    >
      {pending ? (
        <ActivityIndicator
          color={variant === "primary" ? "white" : "#5c85d9"}
        />
      ) : (
        <T
          className={cn(
            "text-center font-semibold",
            variant === "primary"
              ? "text-white"
              : variant === "danger"
                ? "text-danger"
                : "text-primary",
          )}
        >
          {title}
        </T>
      )}
    </Pressable>
  );
}
export function Field({
  label,
  ltr = false,
  ...props
}: TextInputProps & { label: string; ltr?: boolean }) {
  const { isRTL } = useTranslation();
  return (
    <View className="gap-2">
      <T className="font-medium text-sm">{label}</T>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor="#8590a7"
        {...props}
        className={cn(
          "min-h-14 rounded-xl border border-soft bg-white px-4 py-3 font-regular text-base text-ink",
          props.multiline && "min-h-24",
        )}
        style={[
          {
            textAlign: ltr ? "left" : isRTL ? "right" : "left",
            writingDirection: ltr ? "ltr" : isRTL ? "rtl" : "ltr",
          },
          props.style,
        ]}
      />
    </View>
  );
}
export function ErrorMessage({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <T
      accessibilityRole="alert"
      className="rounded-xl bg-red-50 p-3 text-sm text-danger"
    >
      {message}
    </T>
  );
}
export function Notice({ message }: { message: string }) {
  return (
    <T className="rounded-xl bg-soft p-3 text-sm text-indigo">{message}</T>
  );
}
export function Skeleton() {
  const { t } = useTranslation();
  return (
    <View
      accessibilityLabel={t.loading}
      accessibilityRole="progressbar"
      className="gap-4"
    >
      {[0, 1, 2].map((i) => (
        <View key={i} className="h-28 rounded-2xl bg-soft p-5">
          <View className="mb-4 h-4 w-2/3 rounded bg-white/60" />
          <View className="h-4 w-1/3 rounded bg-white/60" />
        </View>
      ))}
    </View>
  );
}
export function QueryState({
  query,
}: {
  query: {
    data: unknown;
    error: Error | null;
    fetchStatus: string;
    refetch: () => unknown;
  };
}) {
  const { t } = useTranslation();
  if (query.error)
    return (
      <View className="gap-2">
        <ErrorMessage message={query.error.message} />
        <Button
          title={t.retry}
          onPress={() => {
            void query.refetch();
          }}
          variant="secondary"
        />
      </View>
    );
  if (query.data === undefined)
    return query.fetchStatus === "paused" ? (
      <Notice message={t.offline} />
    ) : (
      <Skeleton />
    );
  return null;
}
export function Choice({
  label,
  selected,
  onPress,
  disabled,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      className={cn(
        "min-h-11 justify-center rounded-full border px-4 py-2",
        selected ? "border-primary bg-primary" : "border-soft bg-white",
        disabled && "opacity-50",
      )}
    >
      <T
        className={cn(
          "text-sm font-semibold",
          selected ? "text-white" : "text-indigo",
        )}
      >
        {label}
      </T>
    </Pressable>
  );
}
export function Dialog({
  visible,
  title,
  children,
  onClose,
}: PropsWithChildren<{
  visible: boolean;
  title: string;
  onClose: () => void;
}>) {
  const { isRTL } = useTranslation();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View
        className="flex-1 justify-center bg-black/40 p-6"
        style={{ direction: isRTL ? "rtl" : "ltr" }}
      >
        <View
          accessibilityViewIsModal
          className="max-h-[85%] w-full max-w-lg self-center rounded-3xl bg-white p-6"
        >
          <ScrollView keyboardShouldPersistTaps="handled">
            <View className="gap-5">
              <T className="font-bold text-xl">{title}</T>
              {children}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
