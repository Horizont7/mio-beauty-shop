"use client";

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  defaultLanguage,
  Language,
  TranslationKey,
  translations,
} from "@/lib/translations";

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey) => string;
};

const LanguageContext =
  createContext<LanguageContextValue | null>(null);

const storageKey = "mio-language";
const cookieKey = "mio-language";

function getSavedLanguage() {
  if (typeof window === "undefined") return defaultLanguage;

  const savedLanguage = window.localStorage.getItem(storageKey);
  if (savedLanguage === "ru" || savedLanguage === "uz") {
    return savedLanguage;
  }

  const cookieLanguage = document.cookie
    .split("; ")
    .find((item) => item.startsWith(`${cookieKey}=`))
    ?.split("=")[1];

  if (cookieLanguage === "ru" || cookieLanguage === "uz") {
    return cookieLanguage;
  }

  return defaultLanguage;
}

export function LanguageProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [language, setLanguageState] = useState<Language>(defaultLanguage);

  function setLanguage(nextLanguage: Language) {
    setLanguageState(nextLanguage);
    window.localStorage.setItem(storageKey, nextLanguage);
    document.cookie = `${cookieKey}=${nextLanguage}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.lang = nextLanguage;
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setLanguageState(getSavedLanguage());
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t: (key: TranslationKey) =>
        translations[language][key] || translations.ru[key],
    }),
    [language]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useLanguage must be used inside LanguageProvider");
  }

  return context;
}
