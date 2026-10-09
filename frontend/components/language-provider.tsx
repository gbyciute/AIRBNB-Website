"use client"

import { createContext, useContext, useEffect, useMemo, useSyncExternalStore } from "react"

export type Language = "pt" | "en"

type LanguageContextValue = {
  language: Language
  setLanguage: (language: Language) => void
}

const STORAGE_KEY = "airbnb-language"
const CHANGE_EVENT = "airbnb-language-change"
const LanguageContext = createContext<LanguageContextValue | null>(null)

function getStoredLanguage(): Language {
  const storedLanguage = window.localStorage.getItem(STORAGE_KEY)
  return storedLanguage === "en" ? "en" : "pt"
}

function subscribeToLanguageChange(callback: () => void) {
  window.addEventListener(CHANGE_EVENT, callback)
  window.addEventListener("storage", callback)
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback)
    window.removeEventListener("storage", callback)
  }
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const language = useSyncExternalStore<Language>(subscribeToLanguageChange, getStoredLanguage, () => "pt")

  useEffect(() => {
    document.documentElement.lang = language === "pt" ? "pt-PT" : "en"
  }, [language])

  const value = useMemo<LanguageContextValue>(() => ({
    language,
    setLanguage(nextLanguage) {
      window.localStorage.setItem(STORAGE_KEY, nextLanguage)
      window.dispatchEvent(new Event(CHANGE_EVENT))
    },
  }), [language])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) throw new Error("useLanguage must be used inside LanguageProvider")
  return context
}
