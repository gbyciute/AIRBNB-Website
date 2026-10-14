"use client"

import { createContext, useContext } from "react"

import type { AuthUser } from "@/lib/api"

export type AuthContextValue = {
  user: AuthUser
  onLogout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used inside AuthGate")
  return context
}
