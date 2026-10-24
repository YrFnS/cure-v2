import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { localLogout, logout } from "@/lib/auth-store";
import { useTranslation } from "@/lib/settings-store";
import { Button, Dialog, ErrorMessage, T } from "./ui";

export function LogoutButton() {
  const { t } = useTranslation();
  const [open, setOpen] = useState<boolean>(false);
  const mutation = useMutation({ mutationFn: logout });
  const local = useMutation({ mutationFn: localLogout });
  const pending = mutation.isPending || local.isPending;
  return (
    <>
      <Button
        title={t.logout}
        variant="danger"
        onPress={() => {
          mutation.reset();
          local.reset();
          setOpen(true);
        }}
      />
      <Dialog
        visible={open}
        title={t.logout}
        onClose={() => {
          if (!pending) setOpen(false);
        }}
      >
        <T>{t.logoutConfirm}</T>
        <ErrorMessage
          message={mutation.error ? t.logoutFailed : local.error?.message}
        />
        <Button
          title={t.logout}
          variant="danger"
          pending={pending}
          onPress={() =>
            mutation.mutate(undefined, { onSuccess: () => setOpen(false) })
          }
        />
        {mutation.error && (
          <Button
            title={t.localLogout}
            variant="secondary"
            disabled={pending}
            onPress={() =>
              local.mutate(undefined, { onSuccess: () => setOpen(false) })
            }
          />
        )}
        <Button
          title={t.cancel}
          variant="ghost"
          disabled={pending}
          onPress={() => setOpen(false)}
        />
      </Dialog>
    </>
  );
}
