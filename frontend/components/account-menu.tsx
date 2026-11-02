"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { CaretDown, SignOut, UserCircle, UsersThree } from "@phosphor-icons/react"

import { useAuth } from "@/components/auth-context"
import { useLanguage } from "@/components/language-provider"
import { formatUsername } from "@/lib/display"

const copy = {
  pt: {
    open: "Abrir menu da conta",
    roleAdmin: "Administrador",
    roleUser: "Utilizador",
    manage: "Gerir utilizadores",
    manageShort: "Utilizadores",
    logout: "Terminar sessão",
    logoutShort: "Sair",
  },
  en: {
    open: "Open account menu",
    roleAdmin: "Administrator",
    roleUser: "User",
    manage: "Manage users",
    manageShort: "Users",
    logout: "Sign out",
    logoutShort: "Sign out",
  },
} as const

export function AccountMenu({ compact = false }: { compact?: boolean }) {
  const { user, onLogout } = useAuth()
  const { language } = useLanguage()
  const strings = copy[language]
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return

    function handlePointerDown(event: PointerEvent) {
      if (event.target instanceof Node && !menuRef.current?.contains(event.target)) setIsOpen(false)
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false)
    }

    document.addEventListener("pointerdown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen])

  async function handleLogout() {
    setIsOpen(false)
    await onLogout()
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        aria-controls="account-menu-panel"
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={strings.open}
        className={`inline-flex items-center rounded-full border border-stone-300 bg-white text-stone-600 transition hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-500 ${compact ? "h-9 gap-1.5 px-2.5" : "h-10 gap-2 px-3"}`}
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <UserCircle className={compact ? "size-[18px]" : "size-5"} aria-hidden="true" />
        <CaretDown className={`${compact ? "size-3.5" : "size-4"} transition-transform ${isOpen ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>

      {isOpen ? (
        <>
          <div id="account-menu-panel" className="absolute right-0 z-50 mt-2 w-32 overflow-hidden rounded-xl border border-stone-200 bg-white p-1 shadow-lg sm:w-60 sm:p-2">
            <div className="flex items-baseline gap-2 border-b border-stone-100 px-2 py-1 sm:block sm:px-3 sm:py-2">
              <p className="truncate text-xs font-semibold text-stone-900 sm:text-sm">{formatUsername(user.display_name || user.username, language)}</p>
              <p className="hidden shrink-0 text-[11px] text-stone-500 sm:mt-0.5 sm:block sm:text-xs">{user.is_admin ? strings.roleAdmin : strings.roleUser}</p>
            </div>
            {user.is_admin ? (
              <Link
                className="mt-1 flex min-h-7 items-center gap-2 rounded-lg px-2 text-xs text-stone-700 transition-colors hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-500 sm:min-h-10 sm:gap-3 sm:px-3 sm:text-sm"
                href="/admin/users"
                onClick={() => setIsOpen(false)}
              >
                <UsersThree className="size-4" aria-hidden="true" />
                <span className="truncate sm:hidden">{strings.manageShort}</span>
                <span className="hidden sm:inline">{strings.manage}</span>
              </Link>
            ) : null}
            <button
            className="flex min-h-7 w-full items-center gap-2 rounded-lg px-2 text-left text-xs text-stone-700 transition-colors hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-500 sm:min-h-10 sm:gap-3 sm:px-3 sm:text-sm"
              onClick={() => void handleLogout()}
              type="button"
            >
              <SignOut className="size-4" aria-hidden="true" />
              <span className="truncate sm:hidden">{strings.logoutShort}</span>
              <span className="hidden sm:inline">{strings.logout}</span>
            </button>
          </div>
        </>
      ) : null}
    </div>
  )
}
