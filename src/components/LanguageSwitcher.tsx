import { Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGS, type Lang } from "@/i18n";

const LABELS: Record<Lang, string> = {
  es: "ES — Español",
  en: "EN — English",
  fr: "FR — Français",
  it: "IT — Italiano",
};

export function LanguageSwitcher({
  variant = "default",
}: {
  variant?: "default" | "compact";
}) {
  const { i18n } = useTranslation();
  const lang = (i18n.resolvedLanguage as Lang) || "es";

  return (
    <div className="relative flex items-center">
      <Globe className="absolute left-2 h-4 w-4 text-slate-400 pointer-events-none" />
      <select
        aria-label="Language"
        value={lang}
        onChange={(e) => i18n.changeLanguage(e.target.value)}
        className={
          variant === "compact"
            ? "appearance-none pl-7 pr-2 py-1 text-xs rounded-md border border-border bg-background hover:bg-accent/40 focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
            : "appearance-none pl-8 pr-3 py-2 text-sm rounded-lg border border-slate-200 bg-white hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 cursor-pointer"
        }
      >
        {SUPPORTED_LANGS.map((l) => (
          <option key={l} value={l}>
            {variant === "compact" ? l.toUpperCase() : LABELS[l]}
          </option>
        ))}
      </select>
    </div>
  );
}
