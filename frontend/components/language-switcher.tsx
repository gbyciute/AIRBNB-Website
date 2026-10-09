"use client"

import { useLanguage, type Language } from "@/components/language-provider"

function FlagIcon({ language }: { language: Language }) {
  if (language === "pt") {
    return (
      <svg viewBox="0 0 30 20" className="h-5 w-[30px]" aria-hidden="true">
        <rect width="12" height="20" fill="#046A38" />
        <rect x="12" width="18" height="20" fill="#DA291C" />
        <circle cx="12" cy="10" r="3.4" fill="none" stroke="#FFCD00" strokeWidth="1.4" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 30 20" className="h-5 w-[30px]" aria-hidden="true">
      <rect width="30" height="20" fill="#21468B" />
      <path d="M0 0 30 20M30 0 0 20" stroke="white" strokeWidth="4" />
      <path d="M0 0 30 20M30 0 0 20" stroke="#CF142B" strokeWidth="1.7" />
      <path d="M15 0v20M0 10h30" stroke="white" strokeWidth="6" />
      <path d="M15 0v20M0 10h30" stroke="#CF142B" strokeWidth="3" />
    </svg>
  )
}

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage()
  const targetLanguage: Language = language === "pt" ? "en" : "pt"
  const targetName = targetLanguage === "pt" ? "Português" : "English"

  return (
    <button
      type="button"
      onClick={() => setLanguage(targetLanguage)}
      aria-label={language === "pt" ? "Switch to English" : "Mudar para Português"}
      title={targetName}
      className="inline-flex shrink-0 border border-stone-300 bg-white p-1 transition hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-500 print:hidden"
    >
      <FlagIcon language={targetLanguage} />
    </button>
  )
}
