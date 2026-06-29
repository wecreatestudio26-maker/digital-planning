import { Button } from "@/components/ui/button";
import { Cloud, CloudCheck, CloudOff, Loader2 } from "lucide-react";
import { useCloudSync } from "@/lib/sync";
import { useTranslation } from "react-i18next";
import { formatDistanceToNow } from "date-fns";
import { es, enUS, fr, it } from "date-fns/locale";

const LOCALES: Record<string, Locale> = { es, en: enUS, fr, it };

export function SaveButton() {
  const { t, i18n } = useTranslation();
  const { save, status, lastSavedAt, isDirty } = useCloudSync();
  const locale = LOCALES[i18n.language] ?? es;

  const label =
    status === "saving"
      ? t("sync.saving", { defaultValue: "Guardando…" })
      : status === "loading"
        ? t("sync.loading", { defaultValue: "Cargando…" })
        : status === "error"
          ? t("sync.error", { defaultValue: "Error" })
          : isDirty
            ? t("sync.save", { defaultValue: "Guardar" })
            : lastSavedAt
              ? t("sync.savedAgo", {
                  defaultValue: "Guardado {{when}}",
                  when: formatDistanceToNow(new Date(lastSavedAt), { addSuffix: true, locale }),
                })
              : t("sync.save", { defaultValue: "Guardar" });

  const Icon =
    status === "saving" || status === "loading"
      ? Loader2
      : status === "error"
        ? CloudOff
        : isDirty
          ? Cloud
          : CloudCheck;

  return (
    <Button
      size="sm"
      variant={isDirty || status === "error" ? "default" : "secondary"}
      onClick={save}
      disabled={status === "saving" || status === "loading"}
      className="gap-2"
    >
      <Icon className={status === "saving" || status === "loading" ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
      <span className="hidden sm:inline">{label}</span>
    </Button>
  );
}
