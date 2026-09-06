import { appTheme, modeFromSetting } from "@/src/lib/theme";
import { useRoutineStore } from "@/src/store/routineStore";
import { createContext, useContext, useMemo, type ReactNode } from "react";
import { Toaster, toast as sonnerToast } from "sonner-native";

type ToastKind = "success" | "error" | "info" | "warning";
type ToastInput = {
  title: string;
  message?: string;
  kind?: ToastKind;
  action?: { label: string; onPress: () => void };
  cancel?: { label: string; onPress: () => void };
};
type ToastPromiseMessages<T> = {
  loading: string;
  success: string | ((result: T) => string);
  error: string | ((error: unknown) => string);
};
type ToastApi = ((toast: ToastInput) => void) & {
  loading: (title: string, message?: string) => string | number;
  promise: <T>(promise: Promise<T>, messages: ToastPromiseMessages<T>) => string | number;
  dismiss: (id?: string | number) => void;
};

const noopToast = (() => undefined) as unknown as ToastApi;
noopToast.loading = () => "";
noopToast.promise = () => "";
noopToast.dismiss = () => undefined;

const ToastContext = createContext<ToastApi>(noopToast);

export function ToastProvider({ children }: { children: ReactNode }) {
  const settings = useRoutineStore((state) => state.settings);
  const theme = appTheme(modeFromSetting(settings.themeMode));

  const colors = useMemo(() => toastColors(theme), [theme]);

  const showToast = useMemo<ToastApi>(() => {
    const api = ((next: ToastInput) => {
      const kind = next.kind ?? "info";
      sonnerToast[kind](next.title, {
        description: next.message,
        action: next.action ? { label: next.action.label, onClick: next.action.onPress } : undefined,
        cancel: next.cancel ? { label: next.cancel.label, onClick: next.cancel.onPress } : undefined,
        style: { borderColor: colors[kind].border, backgroundColor: colors[kind].background },
      });
    }) as ToastApi;

    api.loading = (title, message) =>
      sonnerToast.loading(title, {
        description: message,
        duration: 3000,
        style: { borderColor: colors.info.border, backgroundColor: colors.info.background },
      });

    api.promise = (promise, messages) =>
      sonnerToast.promise(promise, {
        loading: messages.loading,
        success: (result) => (typeof messages.success === "function" ? messages.success(result) : messages.success),
        error: (error) => (typeof messages.error === "function" ? messages.error(error) : messages.error),
      });

    api.dismiss = (id) => {
      sonnerToast.dismiss(id);
    };

    return api;
  }, [colors]);

  const toasterProps = useMemo<React.ComponentProps<typeof Toaster>>(
    () => ({
      position: "top-center",
      offset: 54,
      visibleToasts: 4,
      closeButton: true,
      richColors: true,
      autoWiggleOnUpdate: "toast-change",
      gap: 10,
      duration: 3000,
      theme: theme.mode,
      swipeToDismissDirection: "up",
      toastOptions: {
        style: {
          width: "92%",
          minHeight: 70,
          paddingHorizontal: 14,
          paddingVertical: 12,
          borderRadius: 18,
          borderWidth: 1,
          borderColor: theme.border,
          backgroundColor: theme.mode === "dark" ? "#252525" : "#FFFFFF",
        },
        titleStyle: {
          color: theme.text,
          fontSize: 14,
          fontWeight: "800",
        },
        descriptionStyle: {
          color: theme.mutedText,
          fontSize: 12,
          lineHeight: 17,
        },
        actionButtonStyle: {
          backgroundColor: theme.accent,
          borderRadius: 10,
        },
        actionButtonTextStyle: {
          color: "#0B0D10",
          fontSize: 12,
          fontWeight: "800",
        },
        cancelButtonStyle: {
          backgroundColor: theme.surfaceAlt,
          borderRadius: 10,
        },
        cancelButtonTextStyle: {
          color: theme.text,
          fontSize: 12,
          fontWeight: "800",
        },
      },
    }),
    [theme],
  );

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <Toaster {...toasterProps} />
    </ToastContext.Provider>
  );
}

function toastColors(theme: ReturnType<typeof appTheme>) {
  const dark = theme.mode === "dark";
  return {
    success: {
      border: `${theme.success}88`,
      background: dark ? "#173324" : "#ECFDF5",
    },
    error: {
      border: `${theme.error}88`,
      background: dark ? "#3A1D1D" : "#FEF2F2",
    },
    warning: {
      border: `${theme.warning}88`,
      background: dark ? "#3A2A12" : "#FFFBEB",
    },
    info: {
      border: "#38BDF888",
      background: dark ? "#143142" : "#F0F9FF",
    },
  };
}

export function useToast() {
  return useContext(ToastContext);
}
