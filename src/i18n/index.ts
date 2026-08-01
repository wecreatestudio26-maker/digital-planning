import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import es from "./locales/es.json";
import en from "./locales/en.json";
import fr from "./locales/fr.json";
import it from "./locales/it.json";

export const SUPPORTED_LANGS = ["es", "en", "fr", "it"] as const;
export type Lang = (typeof SUPPORTED_LANGS)[number];

export const LANG_STORAGE_KEY = "app-lang";

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: {
      es: { translation: es },
      en: { translation: en },
      fr: { translation: fr },
      it: { translation: it },
    },
    // Always render "es" on the server and on the first client render so
    // hydration matches; the stored/browser language is applied afterwards.
    lng: "es",
    fallbackLng: "es",
    supportedLngs: SUPPORTED_LANGS as unknown as string[],
    interpolation: { escapeValue: false },
  });
}

function detectLang(): Lang {
  if (typeof window === "undefined") return "es";
  const stored = window.localStorage.getItem(LANG_STORAGE_KEY);
  if (stored && (SUPPORTED_LANGS as readonly string[]).includes(stored)) return stored as Lang;
  const nav = window.navigator.language?.slice(0, 2);
  if (nav && (SUPPORTED_LANGS as readonly string[]).includes(nav)) return nav as Lang;
  return "es";
}

/** Call from a useEffect after hydration. */
export function syncClientLanguage() {
  if (typeof window === "undefined") return;
  const lang = detectLang();
  if (i18n.language !== lang) void i18n.changeLanguage(lang);
  document.documentElement.lang = lang;
}

export default i18n;
