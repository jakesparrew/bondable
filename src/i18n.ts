import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "@/locales/en.json";
import fr from "@/locales/fr.json";
import es from "@/locales/es.json";
import enIntake from "@/locales/en/intake.json";
import esIntake from "@/locales/es/intake.json";
import frIntake from "@/locales/fr/intake.json";
import LanguageDetector from "i18next-browser-languagedetector"; // Import the language detector

i18n
  .use(LanguageDetector) // Use the language detector plugin
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en, intake: enIntake },
      fr: { translation: fr, intake: frIntake },
      es: { translation: es, intake: esIntake }
    },
    ns: ["translation", "intake"],
    defaultNS: "translation",
    fallbackLng: "en", // Fallback language if the selected language is not available
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    detection: {
      // Language detector settings
      order: ["localStorage", "navigator"], // Priority for detecting the language
      caches: ["localStorage"], // Store the language in localStorage
    },
  });

export default i18n;
