"use client"

import Link from "next/link"
import { useParams, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { ArrowLeft, ArrowRight, CalendarBlank, CaretDown, FileText, MapPin, MagnifyingGlass, Plus, SpinnerGap, Trash, X } from "@phosphor-icons/react"

import { useLanguage } from "@/components/language-provider"
import { LanguageSwitcher } from "@/components/language-switcher"
import { AccountMenu } from "@/components/account-menu"
import { SuccessToast } from "@/components/success-toast"
import { deleteInventoryForm, getHouse, getInventoryForms, type House, type InventoryForm } from "@/lib/api"
import { formatUsername } from "@/lib/display"

const pageCopy = {
  pt: {
    allHouses: "Todas as casas", notFound: "Não foi possível encontrar esta casa.", loading: "A carregar casa", loadError: "Não foi possível carregar esta casa. Verifique a ligação e tente novamente.", inventory: "Inventário da casa",
    newSheet: "Nova ficha de rastreio", sheets: "Fichas de rastreio", sheetsHelp: "Cada ficha guardada fica separada para esta casa.", sheet: "ficha", sheetPlural: "fichas", lastEditedBy: "Última edição", unknownCreator: "Utilizador desconhecido", searchHistory: "Pesquisar divisão, responsável ou utilizador", searchHistoryPlaceholder: "Pesquisar fichas", filterOperation: "Todas as operações", filterDate: "Filtrar por data", clearFilters: "Limpar filtros", noFilteredSheets: "Nenhuma ficha corresponde aos filtros.", countSummaryOf: "de", noSheets: "Ainda não existem fichas de rastreio",
    noSheetsHelp: "Inicie uma contagem de inventário para esta casa. A ficha ficará guardada aqui e poderá ser editada em qualquer altura.", createFirst: "Criar primeira ficha", allRooms: "Todas as divisões", inventoryCount: "Contagem de inventário", item: "item", items: "itens",
    deleteLabel: "Eliminar ficha de rastreio", deleteTitle: "Eliminar esta ficha?", deleteDescriptionStart: "A ficha de", deleteDescriptionEnd: "e todas as respetivas linhas serão eliminadas permanentemente.", cancel: "Cancelar", deleting: "A eliminar", deleteSheet: "Eliminar ficha", deleteError: "Não foi possível eliminar esta ficha de rastreio. Tente novamente.",
    operations: { check_in: "Check-in", check_out: "Check-out", laundry: "Lavandaria" }, savedCreated: "Ficha de rastreio guardada.", savedUpdated: "Alterações guardadas.", deletedSuccess: "Ficha de rastreio eliminada.", close: "Fechar",
  },
  en: {
    allHouses: "All houses", notFound: "This house could not be found.", loading: "Loading house", loadError: "Couldn’t load this house. Please check the connection and try again.", inventory: "House inventory",
    newSheet: "New tracking sheet", sheets: "Tracking sheets", sheetsHelp: "Each saved sheet is kept separately for this house.", sheet: "sheet", sheetPlural: "sheets", lastEditedBy: "Last edited", unknownCreator: "Unknown user", searchHistory: "Search room, person, or username", searchHistoryPlaceholder: "Search sheets", filterOperation: "All operations", filterDate: "Filter by date", clearFilters: "Clear filters", noFilteredSheets: "No sheets match these filters.", countSummaryOf: "of", noSheets: "No tracking sheets yet",
    noSheetsHelp: "Start an inventory count for this house. The sheet will be saved here and can be edited any time.", createFirst: "Create first sheet", allRooms: "All rooms", inventoryCount: "Inventory count", item: "item", items: "items",
    deleteLabel: "Delete tracking sheet", deleteTitle: "Delete this sheet?", deleteDescriptionStart: "The", deleteDescriptionEnd: "sheet and all of its item rows will be permanently removed.", cancel: "Cancel", deleting: "Deleting", deleteSheet: "Delete sheet", deleteError: "Couldn’t delete this tracking sheet. Please try again.",
    operations: { check_in: "Check-in", check_out: "Check-out", laundry: "Laundry" }, savedCreated: "Tracking sheet saved.", savedUpdated: "Changes saved.", deletedSuccess: "Tracking sheet deleted.", close: "Close",
  },
} as const

export default function HouseInventoryPage() {
  const { language } = useLanguage()
  const copy = pageCopy[language]
  const searchParams = useSearchParams()
  const savedAction = searchParams.get("saved")
  const formatDate = (value: string) => new Intl.DateTimeFormat(language === "pt" ? "pt-PT" : "en-GB", { dateStyle: "long" }).format(new Date(`${value}T00:00:00`))
  const formatDateTime = (value: string) => new Intl.DateTimeFormat(language === "pt" ? "pt-PT" : "en-GB", { dateStyle: "short", timeStyle: "short" }).format(new Date(value))
  const params = useParams<{ houseId: string }>()
  const houseId = Number(params.houseId)
  const isValidHouseId = Number.isInteger(houseId) && houseId > 0
  const [house, setHouse] = useState<House | null>(null)
  const [forms, setForms] = useState<InventoryForm[]>([])
  const [historySearch, setHistorySearch] = useState("")
  const [operationFilter, setOperationFilter] = useState("")
  const [dateFilter, setDateFilter] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)
  const [formToDelete, setFormToDelete] = useState<InventoryForm | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(() => savedAction === "created" ? copy.savedCreated : savedAction === "updated" ? copy.savedUpdated : null)
  const dismissSuccess = useCallback(() => setSuccess(null), [])
  const normalizedHistorySearch = historySearch.trim().toLocaleLowerCase(language === "pt" ? "pt-PT" : "en-GB")
  const filteredForms = forms.filter((form) => {
    const searchableText = [form.room_division, form.responsible, form.counter_name, form.created_by_username, form.last_edited_by_username]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase(language === "pt" ? "pt-PT" : "en-GB")
    return (!normalizedHistorySearch || searchableText.includes(normalizedHistorySearch))
      && (!operationFilter || form.operation_types.includes(operationFilter as keyof typeof copy.operations))
      && (!dateFilter || form.count_date === dateFilter)
  })

  useEffect(() => {
    if (savedAction) window.history.replaceState(null, "", window.location.pathname)
  }, [savedAction])

  useEffect(() => {
    let isActive = true

    if (!isValidHouseId) return

    void Promise.all([getHouse(houseId), getInventoryForms(houseId)])
      .then(([loadedHouse, loadedForms]) => {
        if (!isActive) return
        setHouse(loadedHouse)
        setForms(loadedForms)
      })
      .catch(() => {
        if (isActive) setError(pageCopy[language].loadError)
      })
      .finally(() => {
        if (isActive) setIsLoading(false)
      })

    return () => {
      isActive = false
    }
  }, [houseId, isValidHouseId, language])

  async function confirmDeleteForm() {
    if (!formToDelete) return

    setIsDeleting(true)
    setDeleteError(null)
    try {
      await deleteInventoryForm(formToDelete.id)
      setForms((currentForms) => currentForms.filter((form) => form.id !== formToDelete.id))
      setFormToDelete(null)
      setSuccess(copy.deletedSuccess)
    } catch {
      setDeleteError(copy.deleteError)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <main className="min-h-svh bg-stone-100 p-2 text-stone-950 sm:p-6">
      <div className="mx-auto min-h-[calc(100svh-1rem)] max-w-6xl border border-stone-200 bg-stone-50 px-4 py-7 shadow-sm sm:min-h-[calc(100svh-3rem)] sm:px-10 sm:py-10">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-stone-600 transition hover:text-stone-950">
            <ArrowLeft className="size-4" aria-hidden="true" /> {copy.allHouses}
          </Link>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <AccountMenu />
          </div>
        </div>

        {!isValidHouseId ? (
          <div className="mt-8 border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800" role="alert">{copy.notFound}</div>
        ) : isLoading ? (
          <div className="flex min-h-80 items-center justify-center text-stone-500"><SpinnerGap className="mr-2 size-5 animate-spin" /> {copy.loading}</div>
        ) : error || !house ? (
          <div className="mt-8 border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800" role="alert">{error ?? copy.notFound}</div>
        ) : (
          <>
            <header className="mt-8 flex flex-col gap-5 border-b border-stone-200 pb-7 sm:flex-row sm:items-end sm:justify-between sm:pb-8">
              <div>
                <p className="text-xs font-semibold tracking-[0.18em] text-stone-500 uppercase">{copy.inventory}</p>
                <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight sm:text-4xl">{house.name}</h1>
                <p className="mt-3 flex items-start gap-2 text-sm leading-6 text-stone-600"><MapPin className="mt-1 size-4 shrink-0" aria-hidden="true" />{house.address}</p>
              </div>
              <div className="w-full sm:w-auto">
                <Link href={`/houses/${house.id}/tracking/new`} className="inline-flex h-10 w-full items-center justify-center gap-2 bg-stone-900 px-5 text-sm font-semibold text-white transition hover:bg-stone-700 sm:w-auto">
                  <Plus className="size-4" weight="bold" aria-hidden="true" /> {copy.newSheet}
                </Link>
              </div>
            </header>

            <section className="mt-8 sm:mt-10" aria-labelledby="tracking-sheets-title">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 id="tracking-sheets-title" className="text-xl font-semibold">{copy.sheets}</h2>
                  <p className="mt-1 text-sm text-stone-600">{copy.sheetsHelp}</p>
                </div>
                <p className="text-xs font-semibold tracking-wider text-stone-500 uppercase">{filteredForms.length} {copy.countSummaryOf} {forms.length} {forms.length === 1 ? copy.sheet : copy.sheetPlural}</p>
              </div>

              {forms.length > 0 && (
                <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(12rem,1fr)_12rem_12rem]">
                  <label className="relative block">
                    <span className="sr-only">{copy.searchHistory}</span>
                    <MagnifyingGlass className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-stone-500" aria-hidden="true" />
                    <input aria-label={copy.searchHistory} type="search" value={historySearch} onChange={(event) => setHistorySearch(event.target.value)} placeholder={copy.searchHistoryPlaceholder} className="h-10 w-full min-w-0 border border-stone-300 bg-white py-2 pr-3 pl-9 text-sm outline-none placeholder:text-stone-500 focus:border-stone-800" />
                  </label>
                  <label className="relative block">
                    <span className="sr-only">{copy.filterOperation}</span>
                    <select value={operationFilter} onChange={(event) => setOperationFilter(event.target.value)} className="h-10 w-full appearance-none border border-stone-300 bg-white py-2 pr-10 pl-3 text-sm text-stone-700 outline-none focus:border-stone-800">
                      <option value="">{copy.filterOperation}</option>
                      <option value="check_in">{copy.operations.check_in}</option>
                      <option value="check_out">{copy.operations.check_out}</option>
                      <option value="laundry">{copy.operations.laundry}</option>
                    </select>
                    <CaretDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-stone-600" aria-hidden="true" />
                  </label>
                  <label className="relative">
                    <span className="sr-only">{copy.filterDate}</span>
                    <input aria-label={copy.filterDate} type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} className="h-10 w-full border border-stone-300 bg-white px-3 text-sm text-stone-700 outline-none focus:border-stone-800" />
                  </label>
                </div>
              )}

              {forms.length === 0 ? (
                <div className="mt-5 flex min-h-64 flex-col items-center justify-center border border-dashed border-stone-300 bg-white px-5 py-10 text-center">
                  <span className="flex size-12 items-center justify-center rounded-full bg-stone-100 text-stone-600"><FileText className="size-6" aria-hidden="true" /></span>
                  <h3 className="mt-4 text-lg font-semibold">{copy.noSheets}</h3>
                  <p className="mt-2 max-w-sm text-sm leading-6 text-stone-600">{copy.noSheetsHelp}</p>
                  <Link href={`/houses/${house.id}/tracking/new`} className="mt-5 inline-flex h-10 items-center justify-center gap-2 bg-stone-900 px-5 text-sm font-semibold text-white transition hover:bg-stone-700">
                    <Plus className="size-4" weight="bold" aria-hidden="true" /> {copy.createFirst}
                  </Link>
                </div>
              ) : filteredForms.length === 0 ? (
                <div className="mt-5 flex min-h-32 flex-col items-center justify-center border border-dashed border-stone-300 bg-white px-5 py-8 text-center">
                  <p className="text-sm text-stone-600">{copy.noFilteredSheets}</p>
                  <button type="button" onClick={() => { setHistorySearch(""); setOperationFilter(""); setDateFilter("") }} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-stone-800 underline underline-offset-4 hover:text-stone-600"><X className="size-4" aria-hidden="true" />{copy.clearFilters}</button>
                </div>
              ) : (
                <div className="mt-5 grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {filteredForms.map((form) => (
                    <article key={form.id} className="group relative min-w-0 min-h-36 border border-stone-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-stone-400 hover:shadow-md">
                      <Link href={`/houses/${house.id}/tracking/${form.id}`} className="flex min-h-36 min-w-0 flex-col justify-between p-5 pr-14 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stone-800">
                        <div>
                          <div className="flex items-center justify-between gap-4">
                            <p className="flex items-center gap-2 text-sm font-semibold"><CalendarBlank className="size-4 text-stone-500" aria-hidden="true" />{formatDate(form.count_date)}</p>
                            <ArrowRight className="size-4 shrink-0 text-stone-400 transition group-hover:translate-x-1 group-hover:text-stone-900" aria-hidden="true" />
                          </div>
                          <p className="mt-3 line-clamp-1 text-sm text-stone-600">{form.room_division || copy.allRooms}</p>
                        </div>
                        <div className="mt-5 grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 border-t border-stone-100 pt-3 text-[11px] text-stone-500 sm:text-xs">
                          <span className="col-span-2 min-w-0 truncate" title={`${copy.lastEditedBy}: ${form.last_edited_by_username ? formatUsername(form.last_edited_by_username, language) : copy.unknownCreator} · ${formatDateTime(form.updated_at)}`}>{copy.lastEditedBy}: {form.last_edited_by_username ? formatUsername(form.last_edited_by_username, language) : copy.unknownCreator} · {formatDateTime(form.updated_at)}</span>
                          <span className="min-w-0 truncate">{form.operation_types.length ? form.operation_types.map((operation) => copy.operations[operation]).join(" · ") : copy.inventoryCount}</span>
                          <span className="whitespace-nowrap text-right">{form.lines.length} {form.lines.length === 1 ? copy.item : copy.items}</span>
                        </div>
                      </Link>
                      <button type="button" aria-label={`${copy.deleteLabel}: ${formatDate(form.count_date)}`} title={copy.deleteLabel} onClick={() => { setDeleteError(null); setFormToDelete(form) }} className="absolute top-3 right-3 inline-flex size-8 items-center justify-center rounded-full text-stone-400 transition hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400">
                        <Trash className="size-4" aria-hidden="true" />
                      </button>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {formToDelete && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-stone-950/35 sm:items-center sm:p-4" role="presentation">
          <div className="w-full max-w-sm rounded-t-xl bg-white p-5 shadow-xl sm:rounded-none sm:p-6" role="alertdialog" aria-modal="true" aria-labelledby="delete-form-title" aria-describedby="delete-form-description">
            <p className="text-xs font-semibold tracking-[0.16em] text-red-700 uppercase">{copy.deleteLabel}</p>
            <h2 id="delete-form-title" className="mt-2 text-2xl font-semibold">{copy.deleteTitle}</h2>
            <p id="delete-form-description" className="mt-3 text-sm leading-6 text-stone-600">{copy.deleteDescriptionStart} {formatDate(formToDelete.count_date)} {copy.deleteDescriptionEnd}</p>
            {deleteError && <p className="mt-3 text-sm text-red-700" role="alert">{deleteError}</p>}
            <div className="mt-6 flex flex-col-reverse justify-end gap-3 sm:flex-row">
              <button type="button" disabled={isDeleting} onClick={() => setFormToDelete(null)} className="h-10 border border-stone-300 px-4 text-sm font-semibold text-stone-700 transition hover:bg-stone-100 disabled:opacity-50">{copy.cancel}</button>
              <button type="button" disabled={isDeleting} onClick={() => void confirmDeleteForm()} className="inline-flex h-10 items-center justify-center gap-2 bg-red-700 px-4 text-sm font-semibold text-white transition hover:bg-red-800 disabled:opacity-50">{isDeleting && <SpinnerGap className="size-4 animate-spin" aria-hidden="true" />}{isDeleting ? copy.deleting : copy.deleteSheet}</button>
            </div>
          </div>
        </div>
      )}
      <SuccessToast message={success} onDismiss={dismissSuccess} closeLabel={copy.close} />
    </main>
  )
}
