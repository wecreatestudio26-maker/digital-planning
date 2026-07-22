import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Save, Download, Upload, Check, Loader2, AlertCircle } from "lucide-react";
import { useAutoSave, useSaveState } from "@/hooks/useAutoSave";
import { cn } from "@/lib/utils";
import { ExportDialog } from "./ExportDialog";
import { ImportDialog } from "./ImportDialog";
import { useTranslation } from "react-i18next";

export function HeaderActions() {
  const { t } = useTranslation();
  const { save } = useAutoSave();
  const { dirty, status } = useSaveState();
  const [exportOpen, setExportOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (!dirty) return;
    setPulse(true);
    const id = setInterval(() => setPulse((p) => !p), 900);
    return () => clearInterval(id);
  }, [dirty]);

  const icon = status === "saving" ? <Loader2 className="h-4 w-4 animate-spin" />
    : status === "saved" ? <Check className="h-4 w-4 text-emerald-500" />
    : status === "error" ? <AlertCircle className="h-4 w-4 text-red-500" />
    : <Save className="h-4 w-4" />;

  return (
    <>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setImportOpen(true)}
          title={t("headerActions.import", "Importar")}
        >
          <Upload className="h-4 w-4" />
          <span className="hidden md:inline ml-2">{t("headerActions.import", "Importar")}</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExportOpen(true)}
          title={t("headerActions.export", "Exportar")}
        >
          <Download className="h-4 w-4" />
          <span className="hidden md:inline ml-2">{t("headerActions.export", "Exportar")}</span>
        </Button>
        <Button
          variant={dirty ? "default" : "ghost"}
          size="sm"
          onClick={() => save(false)}
          disabled={status === "saving"}
          className="relative"
          title={dirty ? t("headerActions.unsaved", "Cambios sin guardar") : t("headerActions.save", "Guardar")}
        >
          {icon}
          <span className="hidden md:inline ml-2">{t("headerActions.save", "Guardar")}</span>
          {dirty && (
            <span
              className={cn(
                "absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-orange-500 transition-opacity",
                pulse ? "opacity-100" : "opacity-40",
              )}
            />
          )}
        </Button>
      </div>
      <ExportDialog open={exportOpen} onOpenChange={setExportOpen} />
      <ImportDialog open={importOpen} onOpenChange={setImportOpen} />
    </>
  );
}
