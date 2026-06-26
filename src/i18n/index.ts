import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import es from "./locales/es.json";
import en from "./locales/en.json";
import fr from "./locales/fr.json";
import it from "./locales/it.json";

export const SUPPORTED_LANGS = ["es", "en", "fr", "it"] as const;
export type Lang = (typeof SUPPORTED_LANGS)[number];

if (!i18n.isInitialized) {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources: {
        es: { translation: es },
        en: { translation: en },
        fr: { translation: fr },
        it: { translation: it },
      },
      fallbackLng: "es",
      supportedLngs: SUPPORTED_LANGS as unknown as string[],
      interpolation: { escapeValue: false },
      detection: {
        order: ["localStorage", "navigator"],
        lookupLocalStorage: "app-lang",
        caches: ["localStorage"],
      },
    });
}

export default i18n;
