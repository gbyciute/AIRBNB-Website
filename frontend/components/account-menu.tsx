"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { CaretDown, SignOut, UserCircle, UsersThree } from "@phosphor-icons/react"

import { useAuth } from "@/components/auth-context"
import { useLanguage } from "@/components/language-provider"

const copy = {
  pt: {
    open: "Abrir menu da conta",
    roleAdmin: "Administrador",
    roleUser: "Utilizador",
    manage: "Gerir utilizadores",
    logout: "Terminar sessão",
  },
  en: {
    open: "Open account menu",
    roleAdmin: "Administrator",
    roleUser: "User",
    manage: "Manage users",
    logout: "Sign out",
  },
} as const

export function AccountMenu() {
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
        className="inline-flex h-10 items-center gap-2 rounded-full border border-stone-300 bg-white px-3 text-stone-600 transition hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-500"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <UserCircle className="size-5" aria-hidden="true" />
        <CaretDown className={`size-4 transition-transform ${isOpen ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>

      {isOpen ? (
        <div id="account-menu-panel" className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-xl border border-stone-200 bg-white p-2 shadow-lg">
          <div className="border-b border-stone-100 px-3 py-2">
            <p className="truncate text-sm font-semibold text-stone-900">{user.username}</p>
            <p className="mt-0.5 text-xs text-stone-500">{user.is_admin ? strings.roleAdmin : strings.roleUser}</p>
          </div>
          {user.is_admin ? (
            <Link
              className="mt-1 flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm text-stone-700 transition-colors hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-500"
              href="/admin/users"
              onClick={() => setIsOpen(false)}
            >
              <UsersThree className="size-4" aria-hidden="true" />
              {strings.manage}
            </Link>
          ) : null}
          <button
            className="flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-sm text-stone-700 transition-colors hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-500"
            onClick={() => void handleLogout()}
            type="button"
          >
            <SignOut className="size-4" aria-hidden="true" />
            {strings.logout}
          </button>
        </div>
      ) : null}
    </div>
  )
}
