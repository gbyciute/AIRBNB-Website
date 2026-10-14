"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { FormEvent, useEffect, useState } from "react"
import axios from "axios"
import { ArrowLeft, Plus, SpinnerGap, Trash } from "@phosphor-icons/react"

import { useAuth } from "@/components/auth-context"
import { useLanguage } from "@/components/language-provider"
import { LanguageSwitcher } from "@/components/language-switcher"
import { AccountMenu } from "@/components/account-menu"
import { Button } from "@/components/ui/button"
import { createUser, deleteUser, getUsers, type AuthUser } from "@/lib/api"

const pageCopy = {
  en: {
    back: "Back to houses",
    title: "Manage users",
    description: "Create accounts for people who need access to the site.",
    username: "Username",
    password: "Temporary password",
    create: "Create account",
    creating: "Creating…",
    existing: "Existing accounts",
    admin: "Admin",
    user: "User",
    loading: "Loading accounts…",
    duplicate: "That username is already in use.",
    forbidden: "Only the admin can manage accounts.",
    createError: "Could not create the account. Check the details and try again.",
    loadError: "Could not load accounts. Please try again.",
    created: "Account created. Share the username and password with that person.",
    passwordHint: "Use at least 8 characters.",
    deleteLabel: "Delete account",
    deleteConfirm: "Delete the account for {username}? This cannot be undone.",
    deleted: "Account for {username} deleted.",
    deleteError: "Could not delete that account. Please try again.",
  },
  pt: {
    back: "Voltar às casas",
    title: "Gerir utilizadores",
    description: "Crie contas para as pessoas que precisam de aceder ao site.",
    username: "Nome de utilizador",
    password: "Palavra-passe temporária",
    create: "Criar conta",
    creating: "A criar…",
    existing: "Contas existentes",
    admin: "Administração",
    user: "Utilizador",
    loading: "A carregar contas…",
    duplicate: "Esse nome de utilizador já está em uso.",
    forbidden: "Só a pessoa administradora pode gerir contas.",
    createError: "Não foi possível criar a conta. Verifique os dados e tente novamente.",
    loadError: "Não foi possível carregar as contas. Tente novamente.",
    created: "Conta criada. Partilhe o nome de utilizador e a palavra-passe com essa pessoa.",
    passwordHint: "Use pelo menos 8 caracteres.",
    deleteLabel: "Eliminar conta",
    deleteConfirm: "Eliminar a conta de {username}? Esta ação não pode ser anulada.",
    deleted: "A conta de {username} foi eliminada.",
    deleteError: "Não foi possível eliminar essa conta. Tente novamente.",
  },
} as const

export default function AdminUsersPage() {
  const { language } = useLanguage()
  const { user: currentUser } = useAuth()
  const router = useRouter()
  const copy = pageCopy[language]
  const [users, setUsers] = useState<AuthUser[]>([])
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  useEffect(() => {
    if (!currentUser.is_admin) {
      router.replace("/")
      return
    }

    let active = true
    void getUsers()
      .then((loadedUsers) => {
        if (active) {
          setUsers(loadedUsers)
          setIsAdmin(true)
        }
      })
      .catch((loadError) => {
        if (!active) return
        setError(axios.isAxiosError(loadError) && loadError.response?.status === 403 ? copy.forbidden : copy.loadError)
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })
    return () => {
      active = false
    }
  }, [copy.forbidden, copy.loadError, currentUser.is_admin, router])

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setSuccess("")
    setIsCreating(true)
    try {
      const newUser = await createUser(username, password)
      setUsers((current) => [...current, newUser].sort((left, right) => left.username.localeCompare(right.username)))
      setUsername("")
      setPassword("")
      setSuccess(copy.created)
    } catch (createError) {
      if (axios.isAxiosError(createError) && createError.response?.status === 409) {
        setError(copy.duplicate)
      } else if (axios.isAxiosError(createError) && createError.response?.status === 403) {
        setError(copy.forbidden)
      } else {
        setError(copy.createError)
      }
    } finally {
      setIsCreating(false)
    }
  }

  async function handleDelete(target: AuthUser) {
    if (!window.confirm(copy.deleteConfirm.replace("{username}", target.username))) return

    setError("")
    setSuccess("")
    setDeletingUserId(target.id)
    try {
      await deleteUser(target.id)
      setUsers((current) => current.filter((user) => user.id !== target.id))
      setSuccess(copy.deleted.replace("{username}", target.username))
    } catch (deleteError) {
      if (axios.isAxiosError(deleteError) && deleteError.response?.status === 403) {
        setError(copy.forbidden)
      } else {
        setError(copy.deleteError)
      }
    } finally {
      setDeletingUserId(null)
    }
  }

  if (!currentUser.is_admin) return null

  return (
    <main className="min-h-svh bg-stone-100 p-2 text-stone-950 sm:p-6">
      <div className="mx-auto min-h-[calc(100svh-1rem)] max-w-4xl border border-stone-200 bg-stone-50 px-4 py-7 shadow-sm sm:min-h-[calc(100svh-3rem)] sm:px-10 sm:py-10">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-stone-600 hover:text-stone-950">
            <ArrowLeft className="size-4" aria-hidden="true" /> {copy.back}
          </Link>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <AccountMenu />
          </div>
        </div>

        <header className="mt-8 border-b border-stone-200 pb-6">
          <h1 className="font-heading text-3xl font-semibold tracking-tight">{copy.title}</h1>
          <p className="mt-2 text-sm leading-6 text-stone-600">{copy.description}</p>
        </header>

        {isAdmin ? <section className="mt-7" aria-labelledby="create-user-heading">
          <h2 id="create-user-heading" className="text-lg font-semibold">{copy.create}</h2>
          <form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={handleCreate}>
            <label className="text-sm font-medium text-stone-700">
              {copy.username}
              <input
                autoComplete="off"
                className="mt-2 block h-11 w-full border border-stone-300 bg-white px-3 text-base outline-none focus:border-stone-700 focus:ring-2 focus:ring-stone-700/20"
                minLength={3}
                onChange={(event) => setUsername(event.target.value)}
                pattern="[A-Za-z0-9_.-]{3,64}"
                required
                value={username}
              />
              <span className="mt-1 block text-xs font-normal text-stone-500">3–64 letters, numbers, dots, underscores, or hyphens</span>
            </label>
            <label className="text-sm font-medium text-stone-700">
              {copy.password}
              <input
                autoComplete="new-password"
                className="mt-2 block h-11 w-full border border-stone-300 bg-white px-3 text-base outline-none focus:border-stone-700 focus:ring-2 focus:ring-stone-700/20"
                minLength={8}
                onChange={(event) => setPassword(event.target.value)}
                required
                type="password"
                value={password}
              />
              <span className="mt-1 block text-xs font-normal text-stone-500">{copy.passwordHint}</span>
            </label>
            <div className="sm:col-span-2">
              <Button disabled={isCreating} type="submit">
                {isCreating ? <SpinnerGap className="animate-spin" data-icon="inline-start" /> : <Plus weight="bold" data-icon="inline-start" />}
                {isCreating ? copy.creating : copy.create}
              </Button>
            </div>
          </form>
          {error ? <p className="mt-4 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{error}</p> : null}
          {success ? <p className="mt-4 border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800" role="status">{success}</p> : null}
        </section> : error ? <p className="mt-7 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{error}</p> : null}

        {isAdmin ? <section className="mt-10" aria-labelledby="existing-users-heading">
          <h2 id="existing-users-heading" className="text-lg font-semibold">{copy.existing}</h2>
          {isLoading ? (
            <p className="mt-4 text-sm text-stone-600" role="status">{copy.loading}</p>
          ) : (
            <ul className="mt-4 divide-y divide-stone-200 border-y border-stone-200">
              {users.map((user) => (
                <li className="flex items-center justify-between gap-4 py-3" key={user.id}>
                  <span className="font-medium">{user.username}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-stone-500">{user.is_admin ? copy.admin : copy.user}</span>
                    {user.id !== currentUser.id ? (
                      <button
                        aria-label={`${copy.deleteLabel}: ${user.username}`}
                        className="inline-flex size-8 items-center justify-center rounded-md text-stone-400 transition-colors hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:cursor-wait disabled:opacity-50"
                        disabled={deletingUserId !== null}
                        onClick={() => void handleDelete(user)}
                        title={`${copy.deleteLabel}: ${user.username}`}
                        type="button"
                      >
                        {deletingUserId === user.id ? <SpinnerGap className="size-4 animate-spin" aria-hidden="true" /> : <Trash className="size-4" aria-hidden="true" />}
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section> : null}
      </div>
    </main>
  )
}
