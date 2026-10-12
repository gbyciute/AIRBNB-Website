"use client"

import { FormEvent, useEffect, useState } from "react"
import axios from "axios"
import Link from "next/link"

import { useLanguage } from "@/components/language-provider"
import { LanguageSwitcher } from "@/components/language-switcher"
import { Button } from "@/components/ui/button"
import { checkSession, login, logout, type AuthUser } from "@/lib/api"

const copy = {
  en: {
    heading: "Madeira cleaning and care",
    description: "Sign in to manage your houses and cleaning records.",
    username: "Username",
    password: "Password",
    submit: "Sign in",
    signingIn: "Signing in…",
    incorrect: "That username or password wasn’t correct. Try again.",
    unavailable: "Login is not configured yet. Please contact the site owner.",
    connection: "Could not connect. Check your internet connection and try again.",
    logout: "Sign out",
    loading: "Checking your login…",
    createAccounts: "Manage users",
  },
  pt: {
    heading: "Madeira cleaning and care",
    description: "Inicie sessão para gerir as casas e os registos de limpeza.",
    username: "Nome de utilizador",
    password: "Palavra-passe",
    submit: "Iniciar sessão",
    signingIn: "A iniciar sessão…",
    incorrect: "O nome de utilizador ou a palavra-passe está incorreto. Tente novamente.",
    unavailable: "O acesso ainda não está configurado. Contacte a pessoa responsável pelo site.",
    connection: "Não foi possível ligar. Verifique a ligação à internet e tente novamente.",
    logout: "Terminar sessão",
    loading: "A verificar o acesso…",
    createAccounts: "Gerir utilizadores",
  },
} as const

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { language } = useLanguage()
  const strings = copy[language]
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isChecking, setIsChecking] = useState(true)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true
    const handleExpired = () => setUser(null)
    window.addEventListener("airbnb-auth-expired", handleExpired)

    void checkSession()
      .then((sessionUser) => {
        if (active) setUser(sessionUser)
      })
      .catch(() => {
        if (active) setUser(null)
      })
      .finally(() => {
        if (active) setIsChecking(false)
      })

    return () => {
      active = false
      window.removeEventListener("airbnb-auth-expired", handleExpired)
    }
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setIsSubmitting(true)
    try {
      const loggedInUser = await login(username, password)
      setPassword("")
      setUser(loggedInUser)
    } catch (loginError) {
      if (axios.isAxiosError(loginError) && loginError.response?.status === 401) {
        setError(strings.incorrect)
      } else if (axios.isAxiosError(loginError) && loginError.response?.status === 503) {
        setError(strings.unavailable)
      } else {
        setError(strings.connection)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleLogout() {
    setError("")
    try {
      await logout()
      setUser(null)
    } catch {
      setError(strings.connection)
    }
  }

  if (isChecking) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-stone-100 p-4 text-stone-700">
        <p role="status">{strings.loading}</p>
      </main>
    )
  }

  if (!user) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-stone-100 p-4 text-stone-950">
        <section className="w-full max-w-md border border-stone-200 bg-stone-50 px-6 py-10 shadow-sm sm:px-10">
          <div className="mb-5 flex justify-end">
            <LanguageSwitcher />
          </div>
          <div className="mb-8 text-center">
            <h1 className="font-heading text-3xl font-semibold tracking-tight">{strings.heading}</h1>
            <p className="mt-3 text-sm leading-6 text-stone-600">{strings.description}</p>
          </div>
          <form className="space-y-5" onSubmit={handleSubmit}>
            <label className="block text-sm font-medium text-stone-700">
              {strings.username}
              <input
                autoComplete="username"
                autoFocus
                className="mt-2 block h-11 w-full border border-stone-300 bg-white px-3 text-base outline-none focus:border-stone-700 focus:ring-2 focus:ring-stone-700/20"
                onChange={(event) => setUsername(event.target.value)}
                required
                type="text"
                value={username}
              />
            </label>
            <label className="block text-sm font-medium text-stone-700">
              {strings.password}
              <input
                autoComplete="current-password"
                className="mt-2 block h-11 w-full border border-stone-300 bg-white px-3 text-base outline-none focus:border-stone-700 focus:ring-2 focus:ring-stone-700/20"
                onChange={(event) => setPassword(event.target.value)}
                required
                type="password"
                value={password}
              />
            </label>
            {error ? <p className="text-sm text-red-700" role="alert">{error}</p> : null}
            <Button className="w-full" disabled={isSubmitting} type="submit">
              {isSubmitting ? strings.signingIn : strings.submit}
            </Button>
          </form>
        </section>
      </main>
    )
  }

  return (
    <>
      {children}
      <div className="fixed right-3 bottom-3 z-50 flex flex-col items-end gap-2">
        {error ? <p className="max-w-64 border border-red-200 bg-white px-3 py-2 text-sm text-red-700 shadow" role="alert">{error}</p> : null}
        {user.is_admin ? <Link className="border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 shadow-sm hover:bg-stone-100" href="/admin/users">{strings.createAccounts}</Link> : null}
        <span className="bg-white/90 px-2 text-xs text-stone-500">{user.username}</span>
        <Button onClick={handleLogout} size="sm" variant="outline">{strings.logout}</Button>
      </div>
    </>
  )
}
