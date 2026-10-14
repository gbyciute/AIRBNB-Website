"use client"

import { FormEvent, useEffect, useState } from "react"
import axios from "axios"
import { useRouter } from "next/navigation"

import { useLanguage } from "@/components/language-provider"
import { AuthContext } from "@/components/auth-context"
import { LanguageSwitcher } from "@/components/language-switcher"
import { Button } from "@/components/ui/button"
import { checkSession, login, logout, type AuthUser } from "@/lib/api"

const copy = {
  en: {
    heading: "Madeira cleaning & care",
    description: "Sign in to manage your houses and cleaning records.",
    username: "Username",
    password: "Password",
    submit: "Sign in",
    signingIn: "Signing in…",
    incorrect: "That username or password wasn’t correct. Try again.",
    unavailable: "Login is not configured yet. Please contact the site owner.",
    connection: "Could not connect. Check your internet connection and try again.",
    loading: "Checking your login…",
  },
  pt: {
    heading: "Madeira cleaning & care",
    description: "Inicie sessão para gerir as casas e os registos de limpeza.",
    username: "Nome de utilizador",
    password: "Palavra-passe",
    submit: "Iniciar sessão",
    signingIn: "A iniciar sessão…",
    incorrect: "O nome de utilizador ou a palavra-passe está incorreto. Tente novamente.",
    unavailable: "O acesso ainda não está configurado. Contacte a pessoa responsável pelo site.",
    connection: "Não foi possível ligar. Verifique a ligação à internet e tente novamente.",
    loading: "A verificar o acesso…",
  },
} as const

export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
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
    const handleExpired = () => {
      setUser(null)
      setUsername("")
      setPassword("")
      router.replace("/")
    }
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
  }, [router])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setIsSubmitting(true)
    try {
      const loggedInUser = await login(username, password)
      setUsername("")
      setPassword("")
      setUser(loggedInUser)
      router.replace("/")
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
      setUsername("")
      setPassword("")
      router.replace("/")
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
        <section className="w-full max-w-lg border border-stone-200 bg-stone-50 px-7 py-12 shadow-sm sm:px-12">
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
    <AuthContext.Provider value={{ user, onLogout: handleLogout }}>
      {children}
      {error ? <p className="fixed right-3 bottom-3 z-50 max-w-72 border border-red-200 bg-white px-3 py-2 text-sm text-red-700 shadow" role="alert">{error}</p> : null}
    </AuthContext.Provider>
  )
}
