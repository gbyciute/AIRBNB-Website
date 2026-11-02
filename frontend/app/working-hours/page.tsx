"use client"

import Link from "next/link"
import { FormEvent, useEffect, useId, useMemo, useRef, useState } from "react"
import { ArrowLeft, ArrowRight, CalendarBlank, CaretDown, MagnifyingGlass, Plus, SpinnerGap, Trash, UsersThree } from "@phosphor-icons/react"

import { AccountMenu } from "@/components/account-menu"
import { LanguageSwitcher } from "@/components/language-switcher"
import { useAuth } from "@/components/auth-context"
import { useLanguage } from "@/components/language-provider"
import { createWorkingHour, deleteWorkingHour, getHouses, getUsers, getWorkingHourHistory, getWorkingHours, restoreWorkingHour, updateWorkingHour, type AuthUser, type House, type WorkingHourColor, type WorkingHourEntry, type WorkingHourHistoryEvent, type WorkingHourInput, type WorkingHourService } from "@/lib/api"
import { formatUsername } from "@/lib/display"

type AdminView = "jobs" | "month" | "summary"

function FilterDropdown({ label, value, options, onChange }: { label: string; value: string; options: { value: string; label: string }[]; onChange: (value: string) => void }) {
  const [isOpen, setIsOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listId = useId()
  const selectedLabel = options.find((option) => option.value === value)?.label ?? options[0]?.label ?? ""

  useEffect(() => {
    if (!isOpen) return
    function handlePointerDown(event: PointerEvent) {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setIsOpen(false)
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener("pointerdown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen])

  return (
    <div className="text-xs font-medium text-stone-600" ref={rootRef}>
      <span>{label}</span>
      <div className="relative mt-1.5">
        <button ref={triggerRef} type="button" aria-label={label} aria-haspopup="listbox" aria-expanded={isOpen} aria-controls={listId} onClick={() => setIsOpen((open) => !open)} className="flex h-10 w-full items-center justify-between gap-3 border border-stone-300 bg-white px-3 pr-3.5 text-left text-sm font-normal text-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-500">
          <span className="truncate">{selectedLabel}</span>
          <CaretDown className={`size-4 shrink-0 text-stone-600 transition-transform ${isOpen ? "rotate-180" : ""}`} aria-hidden="true" />
        </button>
        {isOpen ? <div id={listId} role="listbox" aria-label={label} className="absolute top-full right-0 left-0 z-30 mt-1 max-h-60 overflow-y-auto border border-stone-200 bg-white p-1 shadow-lg">
          {options.map((option) => <button key={option.value} type="button" role="option" aria-selected={value === option.value} onClick={() => { onChange(option.value); setIsOpen(false); triggerRef.current?.focus() }} className={`flex min-h-10 w-full items-center rounded-sm px-3 text-left text-sm transition hover:bg-stone-100 focus-visible:bg-stone-100 focus-visible:outline-none ${value === option.value ? "font-medium text-stone-950" : "text-stone-700"}`}>{option.label}</button>)}
        </div> : null}
      </div>
    </div>
  )
}

function DateDropdown({ label, value, language, onChange, optional = false }: { label: string; value: string; language: "pt" | "en"; onChange: (value: string) => void; optional?: boolean }) {
  const [isOpen, setIsOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listId = useId()
  const displayValue = value || localDate()
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const [year, month] = displayValue.split("-").map(Number)
    return new Date(year, month - 1, 1)
  })
  const locale = language === "pt" ? "pt-PT" : "en-GB"
  const [year, month] = displayValue.split("-").map(Number)
  const selectedDate = new Date(year, month - 1, Number(displayValue.split("-")[2]))
  const monthTitle = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(visibleMonth)
  const weekdayNames = Array.from({ length: 7 }, (_, index) => new Intl.DateTimeFormat(locale, { weekday: "short" }).format(new Date(2024, 0, index + 1)))
  const firstWeekday = (new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1).getDay() + 6) % 7
  const daysInMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0).getDate()
  const visibleDays: Array<number | null> = [...Array.from({ length: firstWeekday }, () => null), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)]
  const formattedDate = value ? new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric" }).format(selectedDate) : language === "pt" ? "Todas as datas" : "All dates"

  useEffect(() => {
    if (!isOpen) return
    function handlePointerDown(event: PointerEvent) {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setIsOpen(false)
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener("pointerdown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen])

  function selectDay(day: number) {
    onChange(`${visibleMonth.getFullYear()}-${String(visibleMonth.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`)
    setIsOpen(false)
    triggerRef.current?.focus()
  }

  return <div className="text-xs font-semibold text-stone-600" ref={rootRef}>
    <span>{label}</span>
    <div className="relative mt-1.5">
      <button ref={triggerRef} type="button" aria-label={label} aria-haspopup="dialog" aria-expanded={isOpen} aria-controls={listId} onClick={() => { if (!isOpen) setVisibleMonth(new Date(year, month - 1, 1)); setIsOpen((open) => !open) }} className="flex h-10 w-full items-center justify-between gap-3 border border-stone-300 bg-white px-3 pr-3.5 text-left text-sm font-normal text-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-500">
        <span>{formattedDate}</span><CaretDown className={`size-4 shrink-0 text-stone-600 transition-transform ${isOpen ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      {isOpen ? <div id={listId} role="dialog" aria-label={label} className="absolute top-full right-0 left-0 z-30 mt-1 border border-stone-200 bg-white p-3 shadow-lg">
        {optional ? <button type="button" onClick={() => { onChange(""); setIsOpen(false); triggerRef.current?.focus() }} className="mb-2 min-h-9 w-full border-b border-stone-100 pb-2 text-left text-xs font-medium text-stone-600 hover:text-stone-950">{language === "pt" ? "Todas as datas" : "All dates"}</button> : null}
        <div className="mb-2 flex items-center justify-between gap-2"><button type="button" aria-label={language === "pt" ? "Mês anterior" : "Previous month"} onClick={() => setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))} className="flex size-8 items-center justify-center text-lg text-stone-600 hover:bg-stone-100" >‹</button><h3 className="text-sm font-semibold capitalize text-stone-800">{monthTitle}</h3><button type="button" aria-label={language === "pt" ? "Mês seguinte" : "Next month"} onClick={() => setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))} className="flex size-8 items-center justify-center text-lg text-stone-600 hover:bg-stone-100">›</button></div>
        <div className="grid grid-cols-7 text-center">{weekdayNames.map((weekday, index) => <span key={`${weekday}-${index}`} className="py-1 text-[10px] font-semibold uppercase text-stone-500">{weekday}</span>)}{visibleDays.map((day, index) => day === null ? <span key={`blank-${index}`} /> : <button key={day} type="button" aria-pressed={value === `${visibleMonth.getFullYear()}-${String(visibleMonth.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`} onClick={() => selectDay(day)} className={`mx-auto flex size-8 items-center justify-center rounded-full text-xs transition hover:bg-stone-100 ${value === `${visibleMonth.getFullYear()}-${String(visibleMonth.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}` ? "bg-stone-900 font-semibold text-white hover:bg-stone-700" : "text-stone-700"}`}>{day}</button>)}</div>
      </div> : null}
    </div>
  </div>
}

const startTimes = Array.from({ length: 18 }, (_, index) => `${String(index + 5).padStart(2, "0")}:00`)
const endTimes = Array.from({ length: 18 }, (_, index) => `${String(index + 6).padStart(2, "0")}:00`)
const services: WorkingHourService[] = ["standardClean", "deepClean", "checkIn", "checkOut", "bedLinen", "laundry"]
const colorStyles: Record<WorkingHourColor, { border: string; chip: string; dot: string }> = {
  emerald: { border: "border-l-emerald-600", chip: "bg-emerald-50 text-emerald-800", dot: "bg-emerald-600" },
  blue: { border: "border-l-blue-600", chip: "bg-blue-50 text-blue-800", dot: "bg-blue-600" },
  violet: { border: "border-l-violet-600", chip: "bg-violet-50 text-violet-800", dot: "bg-violet-600" },
  amber: { border: "border-l-amber-500", chip: "bg-amber-50 text-amber-800", dot: "bg-amber-500" },
  rose: { border: "border-l-rose-600", chip: "bg-rose-50 text-rose-800", dot: "bg-rose-600" },
  teal: { border: "border-l-teal-600", chip: "bg-teal-50 text-teal-800", dot: "bg-teal-600" },
}

const words = {
  pt: {
    title: "Horas de trabalho", subtitle: "Registe o trabalho realizado em cada casa.", adminSubtitle: "Consulte o trabalho realizado pela sua equipa.", back: "Voltar às casas", team: "Horário da equipa", personal: "As minhas horas", admin: "Vista de administração", employee: "Vista pessoal",
    week: "Esta semana", weekTab: "Trabalhos", month: "Este mês", summary: "Resumo", summaryHeading: "Resumo por mês", summaryPrompt: "Escolha um mês para ver os trabalhos realizados.", jobCount: "trabalhos", selectDayHint: "Selecione um dia para ver o resumo e os trabalhos registados.", openDaySummary: "Abrir resumo deste dia", daySummary: "Resumo do dia", previousMonth: "Mês anterior", nextMonth: "Mês seguinte", previousWeek: "Semana anterior", nextWeek: "Semana seguinte", searchMonth: "Pesquisar mês", searchJobs: "Pesquisar colaborador, casa ou serviço", noMatchingMonths: "Nenhum mês encontrado.", exportMonth: "Exportar mês", editJob: "Editar registo", saveChanges: "Guardar alterações", cancelEdit: "Cancelar", updateSuccess: "Registo atualizado.", updateError: "Não foi possível atualizar o registo. Tente novamente.", delete: "Eliminar", deleteConfirm: "Tem a certeza de que pretende eliminar este registo?", deleteSuccess: "Registo eliminado.", deleteError: "Não foi possível eliminar o registo. Tente novamente.", undo: "Anular", undoDelete: "Registo eliminado.", undoRestored: "Registo restaurado.", undoError: "Não foi possível restaurar o registo.", history: "Histórico", historyLoading: "A carregar histórico…", historyUpdated: "Editado", historyDeleted: "Eliminado", historyRestored: "Restaurado", noHistory: "Ainda não existem alterações.", employeeTotals: "Totais por colaborador", houseTotals: "Totais por casa", serviceTotals: "Totais por serviço", dailyAssignments: "Equipa por casa", breakTime: "Pausa (minutos)", jobNote: "Notas do trabalho", overlapWarning: "Aviso: este horário sobrepõe-se a outro registo seu.", addTitle: "Registar horas", house: "Casa", chooseHouse: "Escolha uma casa", service: "Tipo de serviço", date: "Data", start: "Início", end: "Fim", rate: "Valor por hora (€)", duration: "Horas trabalhadas", total: "Total estimado", add: "Adicionar registo", saved: "Registo guardado.", empty: "Ainda não há horas registadas.", emptyHelp: "Os registos adicionados aparecerão aqui.", noHouses: "Adicione uma casa primeiro para poder associar o registo.", sample: "EXEMPLO", people: "colaboradores", services: { standardClean: "Limpeza standard", deepClean: "Limpeza profunda", checkIn: "Check-in", checkOut: "Check-out", bedLinen: "Roupa de cama", laundry: "Lavandaria", al: "AL · Alojamento Local", house: "Limpeza de casa", postConstruction: "Limpeza pós-obras", textile: "Limpeza de têxteis" },
    loadError: "Não foi possível carregar os registos. Tente novamente.", saveError: "Não foi possível guardar o registo. Verifique os dados e tente novamente.", chooseHouseToSave: "Escolha uma casa antes de guardar.", loading: "A carregar…", filters: "Filtrar registos", employeeFilter: "Todos os colaboradores", employeeLabel: "Colaborador", houseFilter: "Todas as casas", serviceFilter: "Todos os serviços", monthTotals: "Resumo de pagamentos", hours: "horas", estimatedPay: "Valor estimado", export: "Exportar CSV", print: "Imprimir relatório", exportedAt: "Data", property: "Casa", startLabel: "Início", endLabel: "Fim", rateLabel: "Valor/hora", totalLabel: "Total", report: "Relatório de horas de trabalho", jobs: "registos", period: "Período",
  },
  en: {
    title: "Working hours", subtitle: "Log the work completed at each house.", adminSubtitle: "See what your employees have worked on.", back: "Back to houses", team: "Team timetable", personal: "My hours", admin: "Admin overview", employee: "Personal view",
    week: "This week", weekTab: "Jobs", month: "This month", summary: "Summary", summaryHeading: "Monthly summary", summaryPrompt: "Choose a month to see the jobs completed.", jobCount: "jobs", selectDayHint: "Select a day to see its summary and logged jobs.", openDaySummary: "Open this day’s summary", daySummary: "Day summary", previousMonth: "Previous month", nextMonth: "Next month", previousWeek: "Previous week", nextWeek: "Next week", searchMonth: "Search months", searchJobs: "Search employee, property, or service", noMatchingMonths: "No matching months.", exportMonth: "Export month", editJob: "Edit entry", saveChanges: "Save changes", cancelEdit: "Cancel", updateSuccess: "Entry updated.", updateError: "Could not update the entry. Please try again.", delete: "Delete", deleteConfirm: "Are you sure you want to delete this entry?", deleteSuccess: "Entry deleted.", deleteError: "Could not delete the entry. Please try again.", undo: "Undo", undoDelete: "Entry deleted.", undoRestored: "Entry restored.", undoError: "Could not restore the entry.", history: "History", historyLoading: "Loading history…", historyUpdated: "Edited", historyDeleted: "Deleted", historyRestored: "Restored", noHistory: "No changes recorded yet.", employeeTotals: "Totals by employee", houseTotals: "Totals by property", serviceTotals: "Totals by service", dailyAssignments: "Team by property", breakTime: "Break (minutes)", jobNote: "Work notes", overlapWarning: "Warning: this time overlaps another entry you logged.", addTitle: "Log work hours", house: "Property", chooseHouse: "Choose a property", service: "Service type", date: "Date", start: "Start", end: "Finish", rate: "Hourly rate (€)", duration: "Hours worked", total: "Estimated total", add: "Add entry", saved: "Entry saved.", empty: "No hours logged yet.", emptyHelp: "Entries you add will appear here.", noHouses: "Add a house first to associate an entry.", sample: "SAMPLE", people: "employees", services: { standardClean: "Standard clean", deepClean: "Deep clean", checkIn: "Check-in", checkOut: "Check-out", bedLinen: "Bed linen", laundry: "Laundry", al: "AL · Local Accommodation", house: "House cleaning", postConstruction: "Post-construction cleaning", textile: "Textile cleaning" },
    loadError: "Could not load the entries. Please try again.", saveError: "Could not save the entry. Check the details and try again.", chooseHouseToSave: "Choose a property before saving.", loading: "Loading…", filters: "Filter entries", employeeFilter: "All employees", employeeLabel: "Employee", houseFilter: "All houses", serviceFilter: "All services", monthTotals: "Payroll summary", hours: "hours", estimatedPay: "Estimated pay", export: "Export CSV", print: "Print report", exportedAt: "Date", property: "Property", startLabel: "Start", endLabel: "Finish", rateLabel: "Rate/hour", totalLabel: "Total", report: "Working hours report", jobs: "entries", period: "Period",
  },
} as const

function localDate(offset = 0) {
  const date = new Date()
  date.setDate(date.getDate() + offset)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

function mondayStart(value: Date) {
  const monday = new Date(value.getFullYear(), value.getMonth(), value.getDate())
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
  return monday
}

function getHours(start: string, end: string, breakMinutes = 0) {
  const [startHour, startMinute] = start.split(":").map(Number)
  const [endHour, endMinute] = end.split(":").map(Number)
  return Math.max(0, (endHour * 60 + endMinute - startHour * 60 - startMinute - breakMinutes) / 60)
}

function displayName(user: Pick<AuthUser, "username" | "display_name"> | Pick<WorkingHourEntry, "username" | "display_name">, language: "pt" | "en") {
  return formatUsername(user.display_name || user.username, language)
}

export default function WorkingHoursPage() {
  const { user } = useAuth()
  const { language } = useLanguage()
  const copy = words[language]
  const breakError = language === "pt" ? "A pausa tem de ser inferior à duração do trabalho." : "Break must be shorter than the work period."
  const [houses, setHouses] = useState<House[]>([])
  const [employees, setEmployees] = useState<AuthUser[]>([])
  const [entries, setEntries] = useState<WorkingHourEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isUpdatingEntry, setIsUpdatingEntry] = useState(false)
  const [loadError, setLoadError] = useState("")
  const [message, setMessage] = useState("")
  const [editError, setEditError] = useState("")
  const [editMessage, setEditMessage] = useState("")
  const [houseId, setHouseId] = useState("")
  const [service, setService] = useState<WorkingHourService>("standardClean")
  const [date, setDate] = useState(localDate())
  const [start, setStart] = useState("09:00")
  const [end, setEnd] = useState("16:00")
  const [breakMinutes, setBreakMinutes] = useState("0")
  const [task, setTask] = useState("")
  const [rate, setRate] = useState("12")
  const [adminView, setAdminView] = useState<AdminView>("jobs")
  const [payrollPeriod, setPayrollPeriod] = useState<"week" | "month">("week")
  const [visibleWeekStart, setVisibleWeekStart] = useState(() => mondayStart(new Date()))
  const [calendarMonth, setCalendarMonth] = useState(() => { const now = new Date(); return new Date(now.getFullYear(), now.getMonth(), 1) })
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null)
  const [editingEntryId, setEditingEntryId] = useState<number | null>(null)
  const [deletingEntryId, setDeletingEntryId] = useState<number | null>(null)
  const [restoringEntryId, setRestoringEntryId] = useState<number | null>(null)
  const [editDraft, setEditDraft] = useState<WorkingHourInput | null>(null)
  const [historyEntryId, setHistoryEntryId] = useState<number | null>(null)
  const [historyEvents, setHistoryEvents] = useState<WorkingHourHistoryEvent[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [recentlyDeletedEntry, setRecentlyDeletedEntry] = useState<WorkingHourEntry | null>(null)
  const [undoError, setUndoError] = useState("")
  const [selectedSummaryMonth, setSelectedSummaryMonth] = useState<string | null>(null)
  const [summarySearch, setSummarySearch] = useState("")
  const [filterUser, setFilterUser] = useState("")
  const [filterHouse, setFilterHouse] = useState("")
  const [filterDate, setFilterDate] = useState("")
  const [filterSearch, setFilterSearch] = useState("")
  const entryListRef = useRef<HTMLDivElement>(null)
  const undoTimerRef = useRef<number | null>(null)

  useEffect(() => () => { if (undoTimerRef.current !== null) window.clearTimeout(undoTimerRef.current) }, [])

  useEffect(() => {
    let active = true
    const userRequest = user.is_admin ? getUsers() : Promise.resolve([])
    void Promise.all([getHouses(), getWorkingHours(), userRequest]).then(([loadedHouses, loadedEntries, loadedUsers]) => {
      if (!active) return
      setHouses(loadedHouses)
      setHouseId((current) => current || String(loadedHouses[0]?.id ?? ""))
      setEntries(loadedEntries)
      setEmployees(loadedUsers.filter((item) => !item.is_admin))
      setLoadError("")
    }).catch(() => {
      if (active) setLoadError(copy.loadError)
    }).finally(() => {
      if (active) setIsLoading(false)
    })
    return () => { active = false }
  }, [copy.loadError, user.is_admin])

  useEffect(() => {
    if ((adminView === "month" && selectedCalendarDate) || (adminView === "summary" && selectedSummaryMonth)) {
      entryListRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }, [adminView, selectedCalendarDate, selectedSummaryMonth])

  const today = new Date()
  const monthStart = calendarMonth
  const monthDays = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate()
  const mondayOffset = (monthStart.getDay() + 6) % 7
  const calendarCells: Array<number | null> = [...Array.from({ length: mondayOffset }, () => null), ...Array.from({ length: monthDays }, (_, index) => index + 1)]
  const weekStart = visibleWeekStart
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 7)
  const weekRangeLabel = new Intl.DateTimeFormat(language === "pt" ? "pt-PT" : "en-GB", { day: "numeric", month: "short", year: weekStart.getFullYear() !== new Date(weekEnd.getTime() - 86400000).getFullYear() ? "numeric" : undefined }).formatRange(weekStart, new Date(weekEnd.getTime() - 86400000))
  const payrollMonthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const payrollMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  const payrollMonthRangeLabel = new Intl.DateTimeFormat(language === "pt" ? "pt-PT" : "en-GB", { day: "numeric", month: "short", year: "numeric" }).formatRange(payrollMonthStart, payrollMonthEnd)
  const monthPrefix = `${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, "0")}`
  const currentMonthPrefix = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`
  const matchingEntries = useMemo(() => entries.filter((entry) =>
    (!filterUser || entry.user_id === Number(filterUser)) &&
    (!filterHouse || entry.house_id === Number(filterHouse)) &&
    (!filterSearch.trim() || [entry.username, entry.display_name ?? "", entry.house_name, copy.services[entry.service] ?? entry.service].some((value) => value.toLocaleLowerCase(language === "pt" ? "pt-PT" : "en-GB").includes(filterSearch.trim().toLocaleLowerCase(language === "pt" ? "pt-PT" : "en-GB"))))), [copy.services, entries, filterHouse, filterSearch, filterUser, language])
  const filteredEntries = useMemo(() => matchingEntries.filter((entry) => !filterDate || entry.date === filterDate), [filterDate, matchingEntries])
  const weekEntries = matchingEntries.filter((entry) => {
    const entryDate = new Date(`${entry.date}T12:00:00`)
    return entryDate >= weekStart && entryDate < weekEnd
  })
  const currentMonthEntries = matchingEntries.filter((entry) => entry.date.startsWith(currentMonthPrefix))
  const monthEntries = filteredEntries.filter((entry) => entry.date.startsWith(monthPrefix))
  const weekSummaryHours = weekEntries.reduce((sum, entry) => sum + getHours(entry.start, entry.end, entry.break_minutes), 0)
  const weekSummaryPay = weekEntries.reduce((sum, entry) => sum + getHours(entry.start, entry.end, entry.break_minutes) * Number(entry.rate), 0)
  const monthSummaryHours = monthEntries.reduce((sum, entry) => sum + getHours(entry.start, entry.end, entry.break_minutes), 0)
  const monthSummaryPay = monthEntries.reduce((sum, entry) => sum + getHours(entry.start, entry.end, entry.break_minutes) * Number(entry.rate), 0)
  const jobsViewEntries = filterDate ? filteredEntries : weekEntries
  const activeEntries = adminView === "jobs" ? (user.is_admin ? jobsViewEntries : weekEntries) : adminView === "month" ? (selectedCalendarDate ? filteredEntries.filter((entry) => entry.date === selectedCalendarDate) : []) : selectedSummaryMonth ? filteredEntries.filter((entry) => entry.date.startsWith(selectedSummaryMonth)) : []
  const selectedDayEntries = selectedCalendarDate ? filteredEntries.filter((entry) => entry.date === selectedCalendarDate).sort((left, right) => left.start.localeCompare(right.start)) : []
  const selectedDayHours = selectedDayEntries.reduce((sum, entry) => sum + getHours(entry.start, entry.end, entry.break_minutes), 0)
  const selectedDayPay = selectedDayEntries.reduce((sum, entry) => sum + getHours(entry.start, entry.end, entry.break_minutes) * Number(entry.rate), 0)
  const sortedEntries = [...activeEntries].sort((left, right) => right.date.localeCompare(left.date) || left.start.localeCompare(right.start))
  const groupedEntries = sortedEntries.reduce<{ date: string; entries: WorkingHourEntry[] }[]>((groups, entry) => {
    const lastGroup = groups[groups.length - 1]
    if (lastGroup?.date === entry.date) lastGroup.entries.push(entry)
    else groups.push({ date: entry.date, entries: [entry] })
    return groups
  }, [])
  const hours = getHours(start, end, Number(breakMinutes) || 0)
  const breakInvalid = Number(breakMinutes) >= getHours(start, end) * 60
  const hasTimeOverlap = (dateValue: string, startValue: string, endValue: string, ignoredId: number | null = null) => entries.some((entry) => entry.user_id === user.id && entry.id !== ignoredId && entry.date === dateValue && entry.start < endValue && startValue < entry.end)
  const newEntryOverlaps = hasTimeOverlap(date, start, end)
  const editEntryOverlaps = editDraft ? hasTimeOverlap(editDraft.date, editDraft.start, editDraft.end, editingEntryId) : false
  const displayDate = (value: string) => new Intl.DateTimeFormat(language === "pt" ? "pt-PT" : "en-GB", { day: "numeric", month: "long", weekday: "short" }).format(new Date(`${value}T12:00:00`))
  const monthTitle = new Intl.DateTimeFormat(language === "pt" ? "pt-PT" : "en-GB", { month: "long", year: "numeric" }).format(calendarMonth)
  const monthSummaries = Array.from(new Set(filteredEntries.map((entry) => entry.date.slice(0, 7)))).sort((left, right) => right.localeCompare(left)).map((key) => {
    const monthEntries = filteredEntries.filter((entry) => entry.date.startsWith(key))
    return {
      key,
      title: new Intl.DateTimeFormat(language === "pt" ? "pt-PT" : "en-GB", { month: "long", year: "numeric" }).format(new Date(`${key}-01T12:00:00`)),
      entries: monthEntries,
      hours: monthEntries.reduce((sum, entry) => sum + getHours(entry.start, entry.end, entry.break_minutes), 0),
      pay: monthEntries.reduce((sum, entry) => sum + getHours(entry.start, entry.end, entry.break_minutes) * Number(entry.rate), 0),
    }
  })
  const visibleMonthSummaries = monthSummaries.filter((summary) => `${summary.title} ${summary.key}`.toLocaleLowerCase(language === "pt" ? "pt-PT" : "en-GB").includes(summarySearch.trim().toLocaleLowerCase(language === "pt" ? "pt-PT" : "en-GB")))
  const selectedMonthSummary = monthSummaries.find((summary) => summary.key === selectedSummaryMonth)
  const weekdayNames = Array.from({ length: 7 }, (_, index) => new Intl.DateTimeFormat(language === "pt" ? "pt-PT" : "en-GB", { weekday: "short" }).format(new Date(2024, 0, 1 + index)))
  const dateKey = (day: number) => `${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
  const employeeProfiles = filterUser ? employees.filter((employee) => employee.id === Number(filterUser)) : employees
  const reportEntries = adminView === "jobs" ? (payrollPeriod === "week" ? weekEntries : currentMonthEntries) : adminView === "month" ? monthEntries : selectedSummaryMonth ? filteredEntries.filter((entry) => entry.date.startsWith(selectedSummaryMonth)) : filteredEntries
  const totalReportHours = reportEntries.reduce((sum, entry) => sum + getHours(entry.start, entry.end, entry.break_minutes), 0)
  const totalReportPay = reportEntries.reduce((sum, entry) => sum + getHours(entry.start, entry.end, entry.break_minutes) * Number(entry.rate), 0)
  const reportByEmployee = employeeProfiles.map((employee) => {
    const employeeEntries = reportEntries.filter((entry) => entry.user_id === employee.id)
    return { employee, count: employeeEntries.length, hours: employeeEntries.reduce((sum, entry) => sum + getHours(entry.start, entry.end, entry.break_minutes), 0), pay: employeeEntries.reduce((sum, entry) => sum + getHours(entry.start, entry.end, entry.break_minutes) * Number(entry.rate), 0) }
  }).filter((item) => item.hours > 0)
  const reportByHouse = [...new Set(reportEntries.map((entry) => entry.house_id))].map((houseId) => {
    const houseEntries = reportEntries.filter((entry) => entry.house_id === houseId)
    return { id: houseId, name: houseEntries[0]?.house_name ?? "", count: houseEntries.length, hours: houseEntries.reduce((sum, entry) => sum + getHours(entry.start, entry.end, entry.break_minutes), 0), pay: houseEntries.reduce((sum, entry) => sum + getHours(entry.start, entry.end, entry.break_minutes) * Number(entry.rate), 0) }
  }).sort((left, right) => left.name.localeCompare(right.name))
  const reportByService = [...new Set(reportEntries.map((entry) => entry.service))].map((serviceKey) => {
    const serviceEntries = reportEntries.filter((entry) => entry.service === serviceKey)
    return { key: serviceKey, name: copy.services[serviceKey] ?? serviceKey, count: serviceEntries.length, hours: serviceEntries.reduce((sum, entry) => sum + getHours(entry.start, entry.end, entry.break_minutes), 0), pay: serviceEntries.reduce((sum, entry) => sum + getHours(entry.start, entry.end, entry.break_minutes) * Number(entry.rate), 0) }
  }).sort((left, right) => left.name.localeCompare(right.name))
  const selectedDayHouseGroups = [...new Set(selectedDayEntries.map((entry) => entry.house_id))].map((houseId) => {
    const houseEntries = selectedDayEntries.filter((entry) => entry.house_id === houseId)
    return { houseId, houseName: houseEntries[0]?.house_name ?? "", employees: [...new Set(houseEntries.map((entry) => entry.user_id))].map((userId) => houseEntries.find((entry) => entry.user_id === userId)!).sort((left, right) => displayName(left, language).localeCompare(displayName(right, language))) }
  })
  const availableEndTimes = endTimes.filter((time) => time > start)
  const reportPeriod = adminView === "jobs" ? (payrollPeriod === "week" ? `${copy.week} · ${weekRangeLabel}` : `${copy.month} · ${payrollMonthRangeLabel}`) : adminView === "month" ? monthTitle : selectedSummaryMonth ? new Intl.DateTimeFormat(language === "pt" ? "pt-PT" : "en-GB", { month: "long", year: "numeric" }).format(new Date(`${selectedSummaryMonth}-01T12:00:00`)) : copy.summary
  const shouldShowEntries = adminView === "jobs" ? user.is_admin : adminView === "month" ? false : selectedSummaryMonth !== null

  async function addEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage("")
    setLoadError("")
    if (!houseId) {
      setLoadError(houses.length ? copy.chooseHouseToSave : copy.noHouses)
      return
    }
    if (Number(breakMinutes) >= getHours(start, end) * 60) {
      setLoadError(breakError)
      return
    }
    setIsSaving(true)
    const input: WorkingHourInput = { house_id: Number(houseId), date, start, end, break_minutes: Number(breakMinutes) || 0, service, task: task.trim(), rate: Number(rate) }
    try {
      const saved = await createWorkingHour(input)
      setEntries((current) => [saved, ...current])
      setMessage(copy.saved)
      window.setTimeout(() => setMessage(""), 3500)
    } catch (error) {
      const responseData = typeof error === "object" && error !== null && "response" in error
        ? (error as { response?: { data?: { detail?: unknown } } }).response?.data
        : undefined
      const detail = responseData?.detail
      const detailMessage = typeof detail === "string"
        ? detail
        : Array.isArray(detail)
          ? detail.map((item) => typeof item === "object" && item !== null && "msg" in item ? String(item.msg) : "").filter(Boolean).join(" ")
          : ""
      setLoadError(detailMessage || copy.saveError)
    } finally {
      setIsSaving(false)
    }
  }

  function startEditingEntry(entry: WorkingHourEntry) {
    setEditingEntryId(entry.id)
    setEditDraft({ house_id: entry.house_id, date: entry.date, start: entry.start, end: entry.end, break_minutes: entry.break_minutes, service: entry.service, task: entry.task, rate: Number(entry.rate) })
    setEditError("")
    setEditMessage("")
  }

  async function saveEditedEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (editingEntryId === null || !editDraft) return
    if (editDraft.break_minutes >= getHours(editDraft.start, editDraft.end) * 60) {
      setEditError(breakError)
      return
    }
    setIsUpdatingEntry(true)
    setEditError("")
    setEditMessage("")
    try {
      const updated = await updateWorkingHour(editingEntryId, editDraft)
      setEntries((current) => current.map((entry) => entry.id === updated.id ? updated : entry))
      setEditingEntryId(null)
      setEditDraft(null)
      setHistoryEntryId(null)
      setEditMessage(copy.updateSuccess)
      window.setTimeout(() => setEditMessage(""), 3500)
    } catch (error) {
      const responseData = typeof error === "object" && error !== null && "response" in error
        ? (error as { response?: { data?: { detail?: unknown } } }).response?.data
        : undefined
      const detail = responseData?.detail
      const detailMessage = typeof detail === "string"
        ? detail
        : Array.isArray(detail)
          ? detail.map((item) => typeof item === "object" && item !== null && "msg" in item ? String(item.msg) : "").filter(Boolean).join(" ")
          : ""
      setEditError(detailMessage || copy.updateError)
    } finally {
      setIsUpdatingEntry(false)
    }
  }

  async function toggleEntryHistory(entryId: number) {
    if (historyEntryId === entryId) {
      setHistoryEntryId(null)
      return
    }
    setHistoryEntryId(entryId)
    setIsLoadingHistory(true)
    try {
      setHistoryEvents(await getWorkingHourHistory(entryId))
    } catch {
      setHistoryEvents([])
      setEditError(copy.updateError)
    } finally {
      setIsLoadingHistory(false)
    }
  }

  function describeSnapshot(snapshot: Record<string, unknown> | null) {
    if (!snapshot) return ""
    const house = typeof snapshot.house_name === "string" ? snapshot.house_name : ""
    const dateValue = typeof snapshot.date === "string" ? snapshot.date : ""
    const times = `${typeof snapshot.start === "string" ? snapshot.start : ""}–${typeof snapshot.end === "string" ? snapshot.end : ""}`
    const serviceName = typeof snapshot.service === "string" ? copy.services[snapshot.service as WorkingHourService] ?? snapshot.service : ""
    const rateValue = typeof snapshot.rate === "string" || typeof snapshot.rate === "number" ? ` · €${snapshot.rate}/h` : ""
    return [house, dateValue ? displayDate(dateValue) : "", times, serviceName].filter(Boolean).join(" · ") + rateValue
  }

  function historyActionLabel(action: WorkingHourHistoryEvent["action"]) {
    if (action === "updated") return copy.historyUpdated
    if (action === "deleted") return copy.historyDeleted
    return copy.historyRestored
  }

  async function removeEntry(entry: WorkingHourEntry) {
    if (user.is_admin) return
    if (!window.confirm(copy.deleteConfirm)) return
    setDeletingEntryId(entry.id)
    setEditError("")
    setEditMessage("")
    try {
      await deleteWorkingHour(entry.id)
      setEntries((current) => current.filter((item) => item.id !== entry.id))
      if (editingEntryId === entry.id) {
        setEditingEntryId(null)
        setEditDraft(null)
      }
      if (undoTimerRef.current !== null) window.clearTimeout(undoTimerRef.current)
      setRecentlyDeletedEntry(entry)
      setUndoError("")
      undoTimerRef.current = window.setTimeout(() => {
        setRecentlyDeletedEntry(null)
        undoTimerRef.current = null
      }, 8000)
    } catch {
      setEditError(copy.deleteError)
    } finally {
      setDeletingEntryId(null)
    }
  }

  async function undoDelete() {
    if (!recentlyDeletedEntry) return
    const entryId = recentlyDeletedEntry.id
    setRestoringEntryId(entryId)
    setUndoError("")
    try {
      const restored = await restoreWorkingHour(entryId)
      setEntries((current) => [...current, restored].sort((left, right) => right.date.localeCompare(left.date) || left.start.localeCompare(right.start)))
      setRecentlyDeletedEntry(null)
      if (undoTimerRef.current !== null) window.clearTimeout(undoTimerRef.current)
      undoTimerRef.current = null
      setEditMessage(copy.undoRestored)
      window.setTimeout(() => setEditMessage(""), 3500)
    } catch {
      setUndoError(copy.undoError)
    } finally {
      setRestoringEntryId(null)
    }
  }

  function changeStartTime(value: string) {
    setStart(value)
    if (end <= value) setEnd(endTimes.find((time) => time > value) ?? endTimes[endTimes.length - 1])
  }

  function exportEmployeeMonth(monthKey: string) {
    if (user.is_admin) return
    const monthEntries = entries.filter((entry) => entry.date.startsWith(monthKey))
    const csvCell = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`
    const rows = [[copy.exportedAt, copy.property, copy.service, copy.startLabel, copy.endLabel, copy.breakTime, copy.hours, copy.rateLabel, copy.totalLabel, copy.jobNote], ...monthEntries.map((entry) => {
      const entryHours = getHours(entry.start, entry.end, entry.break_minutes)
      return [entry.date, entry.house_name, copy.services[entry.service], entry.start, entry.end, entry.break_minutes, entryHours.toFixed(1), Number(entry.rate).toFixed(2), (entryHours * Number(entry.rate)).toFixed(2), entry.task]
    })]
    const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }))
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `my-working-hours-${monthKey}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <main className="working-hours-page min-h-svh bg-stone-100 p-2 text-stone-950 sm:p-6">
      <div className="mx-auto min-h-[calc(100svh-1rem)] max-w-6xl border border-stone-200 bg-stone-50 px-4 py-6 shadow-sm sm:min-h-[calc(100svh-3rem)] sm:px-8 sm:py-9">
        <div className="print-hide flex items-center justify-between gap-3">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-stone-600 hover:text-stone-950"><ArrowLeft className="size-4" aria-hidden="true" />{copy.back}</Link>
          <div className="flex items-center gap-2 sm:gap-3"><LanguageSwitcher /><AccountMenu /></div>
        </div>

        <header className="print-hide mt-8 flex flex-col gap-4 border-b border-stone-200 pb-4 sm:pb-7">
          <div><p className="text-xs font-semibold tracking-[0.18em] text-stone-500 uppercase">{user.is_admin ? copy.team : copy.personal}</p><h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight sm:text-4xl">{copy.title}</h1><p className="mt-2 text-sm leading-6 text-stone-600 sm:text-base">{user.is_admin ? copy.adminSubtitle : copy.subtitle}</p></div>
          {user.is_admin ? <div className="flex w-full items-center justify-between gap-3"><div className="inline-flex w-fit items-center gap-2 border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-600"><UsersThree className="size-4" aria-hidden="true" />{copy.admin}</div><span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-xs text-stone-500"><span className="size-2 rounded-full bg-emerald-600" />{`${employees.length} ${copy.people}`}</span></div> : null}
        </header>

        {recentlyDeletedEntry ? <div className="print-hide mt-4 flex flex-wrap items-center justify-between gap-3 border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm" role="status"><span className="text-stone-800">{copy.undoDelete} <span className="font-medium">{recentlyDeletedEntry.house_name}</span>{undoError ? <span className="ml-2 text-xs text-red-700" role="alert">{undoError}</span> : null}</span><button type="button" disabled={restoringEntryId === recentlyDeletedEntry.id} onClick={() => void undoDelete()} className="inline-flex h-8 items-center justify-center gap-2 border border-amber-300 bg-white px-3 text-xs font-semibold text-stone-800 hover:bg-amber-100 disabled:opacity-60">{restoringEntryId === recentlyDeletedEntry.id ? <SpinnerGap className="size-3.5 animate-spin" aria-hidden="true" /> : null}{restoringEntryId === recentlyDeletedEntry.id ? copy.loading : copy.undo}</button></div> : null}

        <div className="mt-5 grid gap-7 sm:mt-7 lg:grid-cols-1 lg:items-start">
          <section className="min-w-0" aria-label={adminView === "jobs" ? copy.weekTab : adminView === "month" ? copy.month : copy.summary}>
            <div className="print-hide flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex w-full flex-wrap justify-center gap-1.5 rounded-md bg-stone-100 p-1 sm:w-fit sm:justify-start" role="tablist" aria-label="Timetable view">{([["jobs", copy.weekTab], ["month", copy.month], ["summary", copy.summary]] as const).map(([view, label]) => <button key={view} type="button" role="tab" aria-selected={adminView === view} onClick={() => { setAdminView(view); setSelectedCalendarDate(null); setSelectedSummaryMonth(null); if (view !== "jobs") { setFilterUser(""); setFilterHouse(""); setFilterDate(""); setFilterSearch("") } }} className={`flex-1 rounded px-3 py-1.5 text-center text-xs font-medium transition sm:flex-none ${adminView === view ? "bg-white text-stone-950 shadow-sm" : "text-stone-600 hover:text-stone-950"}`}>{label}</button>)}</div>
            </div>
            {!user.is_admin && adminView === "jobs" ? <section className="mt-4 border border-stone-200 bg-white p-3" aria-label={copy.week}><div className="flex items-center justify-between gap-2"><div><h2 className="text-sm font-semibold text-stone-800">{copy.week}</h2><p className="mt-0.5 text-xs text-stone-500">{weekRangeLabel}</p></div><div className="flex shrink-0 items-center gap-1"><button type="button" aria-label={copy.previousWeek} onClick={() => setVisibleWeekStart((current) => new Date(current.getFullYear(), current.getMonth(), current.getDate() - 7))} className="flex size-8 items-center justify-center border border-stone-200 text-stone-600 hover:bg-stone-100"><ArrowLeft className="size-4" aria-hidden="true" /></button><button type="button" aria-label={copy.nextWeek} onClick={() => setVisibleWeekStart((current) => new Date(current.getFullYear(), current.getMonth(), current.getDate() + 7))} className="flex size-8 items-center justify-center border border-stone-200 text-stone-600 hover:bg-stone-100"><ArrowRight className="size-4" aria-hidden="true" /></button></div></div><div className="mt-2 grid grid-cols-3 gap-2"><div className="bg-stone-50 p-3"><p className="text-[11px] text-stone-500">{copy.hours}</p><p className="mt-1 text-lg font-semibold tabular-nums">{weekSummaryHours.toFixed(1)} h</p></div><div className="bg-stone-50 p-3"><p className="text-[11px] text-stone-500">{copy.estimatedPay}</p><p className="mt-1 text-lg font-semibold tabular-nums">€{weekSummaryPay.toFixed(2)}</p></div><div className="bg-stone-50 p-3"><p className="text-[11px] text-stone-500">{copy.jobCount}</p><p className="mt-1 text-lg font-semibold tabular-nums">{weekEntries.length}</p></div></div></section> : null}
            {adminView === "jobs" && user.is_admin ? <div className="print-hide mt-2 flex items-center justify-between gap-3"><h2 className="text-xl font-semibold">{filterDate ? displayDate(filterDate) : weekRangeLabel}</h2><div className="flex shrink-0 items-center gap-1"><button type="button" aria-label={copy.previousWeek} onClick={() => { setVisibleWeekStart((current) => new Date(current.getFullYear(), current.getMonth(), current.getDate() - 7)); setFilterDate("") }} className="flex size-9 items-center justify-center border border-stone-200 bg-white text-stone-600 hover:bg-stone-100"><ArrowLeft className="size-4" aria-hidden="true" /></button><button type="button" aria-label={copy.nextWeek} onClick={() => { setVisibleWeekStart((current) => new Date(current.getFullYear(), current.getMonth(), current.getDate() + 7)); setFilterDate("") }} className="flex size-9 items-center justify-center border border-stone-200 bg-white text-stone-600 hover:bg-stone-100"><ArrowRight className="size-4" aria-hidden="true" /></button></div></div> : null}

            {user.is_admin && adminView === "jobs" ? <section className="print-hide mt-4 border border-stone-200 bg-white p-3 shadow-sm sm:p-4" aria-label={copy.filters}><label className="mb-3 block text-xs font-semibold text-stone-600"><span>{copy.searchJobs}</span><span className="mt-1.5 flex h-10 items-center gap-2 border border-stone-300 bg-white px-3 text-sm font-normal text-stone-700"><MagnifyingGlass className="size-4 shrink-0 text-stone-500" aria-hidden="true" /><input type="search" value={filterSearch} onChange={(event) => setFilterSearch(event.target.value)} placeholder={copy.searchJobs} className="h-full min-w-0 flex-1 outline-none" /></span></label><div className="grid gap-3 sm:grid-cols-3">
              <FilterDropdown label={copy.employeeLabel} value={filterUser} onChange={setFilterUser} options={[{ value: "", label: copy.employeeFilter }, ...employees.map((employee) => ({ value: String(employee.id), label: displayName(employee, language) }))]} />
              <FilterDropdown label={copy.house} value={filterHouse} onChange={setFilterHouse} options={[{ value: "", label: copy.houseFilter }, ...houses.map((house) => ({ value: String(house.id), label: house.name }))]} />
              <DateDropdown label={copy.date} value={filterDate} language={language} onChange={setFilterDate} optional />
            </div></section> : null}

            {adminView === "month" ? <section className="print-hide mt-4 border border-stone-200 bg-white p-3 shadow-sm sm:p-4" aria-label={monthTitle}>
              <div className="mb-3 flex items-center justify-between gap-2"><div><div className="flex items-center gap-2"><CalendarBlank className="size-4 text-stone-500" aria-hidden="true"/><h2 className="font-semibold capitalize">{monthTitle}</h2></div><p className="mt-1.5 text-xs text-stone-500">{copy.selectDayHint}</p></div><div className="flex shrink-0 items-center gap-1"><button type="button" aria-label={copy.previousMonth} onClick={() => { setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1)); setSelectedCalendarDate(null); setEditingEntryId(null); setEditDraft(null) }} className="flex size-9 items-center justify-center border border-stone-200 bg-white text-stone-600 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-500"><ArrowLeft className="size-4" aria-hidden="true" /></button><button type="button" aria-label={copy.nextMonth} onClick={() => { setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1)); setSelectedCalendarDate(null); setEditingEntryId(null); setEditDraft(null) }} className="flex size-9 items-center justify-center border border-stone-200 bg-white text-stone-600 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-500"><ArrowRight className="size-4" aria-hidden="true" /></button></div></div>
              {!user.is_admin ? <div className="mb-3 grid grid-cols-3 gap-2" aria-label={copy.month}><div className="border border-stone-100 bg-stone-50 p-2.5"><p className="text-[10px] text-stone-500">{copy.hours}</p><p className="mt-1 text-sm font-semibold tabular-nums">{monthSummaryHours.toFixed(1)} h</p></div><div className="border border-stone-100 bg-stone-50 p-2.5"><p className="text-[10px] text-stone-500">{copy.estimatedPay}</p><p className="mt-1 text-sm font-semibold tabular-nums">€{monthSummaryPay.toFixed(2)}</p></div><div className="border border-stone-100 bg-stone-50 p-2.5"><p className="text-[10px] text-stone-500">{copy.jobCount}</p><p className="mt-1 text-sm font-semibold tabular-nums">{monthEntries.length}</p></div></div> : null}
              <div className="grid grid-cols-7 gap-1 text-center">{weekdayNames.map((weekday, index) => <div key={`${weekday}-${index}`} className="py-1 text-[10px] font-semibold uppercase text-stone-500 sm:text-xs">{weekday}</div>)}{calendarCells.map((day, index) => {
                if (day === null) return <div key={`blank-${index}`} aria-hidden="true" />
                const key = dateKey(day)
                const dayEntries = filteredEntries.filter((entry) => entry.date === key)
                const dayUsers = [...new Set(dayEntries.map((entry) => entry.user_id))]
                return <button key={key} type="button" onClick={() => { setSelectedCalendarDate((current) => current === key ? null : key); setEditingEntryId(null); setEditDraft(null); setEditError("") }} aria-label={`${day}, ${dayEntries.length} ${copy.jobCount}. ${copy.openDaySummary}`} title={copy.openDaySummary} aria-pressed={selectedCalendarDate === key} className={`flex min-h-12 cursor-pointer flex-col items-center justify-start gap-1 rounded-sm border p-1 text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stone-800 sm:min-h-14 sm:pt-2 ${selectedCalendarDate === key ? "border-stone-900 bg-stone-100" : "border-transparent hover:border-stone-300 hover:bg-stone-100"}`}><span className={`flex size-6 items-center justify-center rounded-full ${key === localDate() ? "bg-stone-900 font-semibold text-white" : "text-stone-700"}`}>{day}</span><span className="flex min-h-1.5 items-center gap-0.5">{dayUsers.map((userId) => { const entry = dayEntries.find((item) => item.user_id === userId)!; const color = colorStyles[entry.calendar_color] ?? colorStyles.emerald; return <span key={userId} className={`size-1.5 rounded-full ${color.dot}`} title={displayName(entry, language)} /> })}</span></button>
              })}</div>
              {user.is_admin ? <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 border-t border-stone-100 pt-3">{employeeProfiles.map((employee) => { const color = colorStyles[(employee.calendar_color as WorkingHourColor) || "emerald"] ?? colorStyles.emerald; return <span key={employee.id} className="inline-flex items-center gap-1.5 text-[11px] text-stone-600"><span className={`size-2 rounded-full ${color.dot}`} />{displayName(employee, language)}</span> })}</div> : null}
            </section> : null}

            {adminView === "month" && selectedCalendarDate ? <section ref={entryListRef} className="mt-3 scroll-mt-4 border border-stone-200 bg-white p-3 shadow-sm sm:p-4" aria-labelledby="selected-day-heading">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-stone-100 pb-3"><div><p className="text-[11px] font-semibold tracking-[0.15em] text-stone-500 uppercase">{copy.daySummary}</p><h2 id="selected-day-heading" className="mt-1 text-base font-semibold capitalize">{displayDate(selectedCalendarDate)}</h2></div><button type="button" onClick={() => { setSelectedCalendarDate(null); setEditingEntryId(null); setEditDraft(null) }} className="text-xs font-medium text-stone-600 underline underline-offset-4 hover:text-stone-950">{copy.cancelEdit}</button></div>
              <div className="mt-3 grid grid-cols-2 gap-2"><div className="border border-stone-100 bg-stone-50 px-3 py-2"><p className="text-[11px] text-stone-500">{copy.duration}</p><p className="mt-0.5 text-base font-semibold tabular-nums">{selectedDayHours.toFixed(1)} h</p></div><div className="border border-stone-100 bg-stone-50 px-3 py-2"><p className="text-[11px] text-stone-500">{copy.estimatedPay}</p><p className="mt-0.5 text-base font-semibold tabular-nums">€{selectedDayPay.toFixed(2)}</p></div></div>
              {user.is_admin && selectedDayHouseGroups.length ? <div className="mt-3 border border-stone-100 bg-stone-50 p-3"><h3 className="text-xs font-semibold text-stone-700">{copy.dailyAssignments}</h3><ul className="mt-2 divide-y divide-stone-200">{selectedDayHouseGroups.map(({ houseId, houseName, employees: assignedEmployees }) => <li key={houseId} className="flex flex-wrap items-center justify-between gap-2 py-2 text-xs"><span className="font-medium text-stone-800">{houseName}</span><span className="flex flex-wrap gap-2">{assignedEmployees.map((employee) => { const color = colorStyles[employee.calendar_color] ?? colorStyles.emerald; return <span key={employee.user_id} className="inline-flex items-center gap-1.5 text-stone-600"><span className={`size-2 rounded-full ${color.dot}`} />{displayName(employee, language)}</span> })}</span></li>)}</ul></div> : null}
              {editMessage ? <p className="mt-3 border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800" role="status">{editMessage}</p> : null}
              <div className="mt-3 space-y-2">{selectedDayEntries.length ? selectedDayEntries.map((entry) => {
                const color = colorStyles[entry.calendar_color] ?? colorStyles.emerald
                const entryHours = getHours(entry.start, entry.end, entry.break_minutes)
                const isEditing = editingEntryId === entry.id && editDraft !== null
                return <article key={entry.id} className={`border border-stone-200 border-l-4 ${color.border} bg-white`}>
                  <button type="button" onClick={() => user.is_admin ? void toggleEntryHistory(entry.id) : isEditing ? (setEditingEntryId(null), setEditDraft(null), setEditError("")) : startEditingEntry(entry)} aria-expanded={user.is_admin ? historyEntryId === entry.id : isEditing} className="flex w-full items-center justify-between gap-3 p-3 text-left hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stone-700"><span className="min-w-0"><span className="block truncate text-sm font-semibold">{entry.house_name}</span><span className="mt-0.5 block truncate text-xs text-stone-600">{copy.services[entry.service]}{user.is_admin ? ` · ${displayName(entry, language)}` : ""}</span><span className="mt-1 block text-[11px] text-stone-500">{entry.start}–{entry.end} · {entry.break_minutes} min {copy.breakTime.toLocaleLowerCase(language === "pt" ? "pt-PT" : "en-GB")} · {entryHours.toFixed(1)} h · €{Number(entry.rate).toFixed(2)}/h</span>{entry.task ? <span className="mt-1 block truncate text-xs text-stone-600">{entry.task}</span> : null}</span><span className="shrink-0 text-right"><span className="block text-sm font-semibold tabular-nums">€{(entryHours * Number(entry.rate)).toFixed(2)}</span><span className="mt-1 block text-[11px] font-medium text-stone-600 underline underline-offset-2">{user.is_admin ? copy.history : isEditing ? copy.cancelEdit : copy.editJob}</span></span></button>
                  {!user.is_admin && isEditing && editDraft ? <form className="space-y-3 border-t border-stone-100 bg-stone-50 p-3" onSubmit={(event) => void saveEditedEntry(event)}>
                    <div className="grid gap-3 sm:grid-cols-2"><FilterDropdown label={copy.house} value={String(editDraft.house_id)} onChange={(value) => setEditDraft((current) => current ? { ...current, house_id: Number(value) } : current)} options={houses.map((house) => ({ value: String(house.id), label: house.name }))} /><FilterDropdown label={copy.service} value={editDraft.service} onChange={(value) => setEditDraft((current) => current ? { ...current, service: value as WorkingHourService } : current)} options={services.map((key) => ({ value: key, label: copy.services[key] }))} /><DateDropdown label={copy.date} value={editDraft.date} language={language} onChange={(value) => setEditDraft((current) => current ? { ...current, date: value } : current)} /><div className="grid grid-cols-2 gap-2"><FilterDropdown label={copy.start} value={editDraft.start} onChange={(value) => setEditDraft((current) => current ? { ...current, start: value, end: current.end <= value ? endTimes.find((time) => time > value) ?? current.end : current.end } : current)} options={startTimes.map((time) => ({ value: time, label: time }))} /><FilterDropdown label={copy.end} value={editDraft.end} onChange={(value) => setEditDraft((current) => current ? { ...current, end: value } : current)} options={endTimes.filter((time) => time > editDraft.start).map((time) => ({ value: time, label: time }))} /></div><label className="block text-xs font-semibold text-stone-600 sm:col-span-2">{copy.rate}<span className="mt-1.5 flex h-9 items-center border border-stone-300 bg-white px-3 text-sm font-normal text-stone-500"><span aria-hidden="true">€</span><input className="h-full min-w-0 flex-1 bg-transparent px-2 text-stone-800 outline-none" type="number" min="1" max="1000" step="1" required value={editDraft.rate} onChange={(event) => setEditDraft((current) => current ? { ...current, rate: Number(event.target.value) } : current)} /></span></label></div>
                    <label className="block text-xs font-semibold text-stone-600">{copy.breakTime}<span className="mt-1.5 flex h-9 items-center border border-stone-300 bg-white px-3"><input className="h-full min-w-0 flex-1 text-sm font-normal text-stone-800 outline-none" type="number" min="0" max={Math.max(0, getHours(editDraft.start, editDraft.end) * 60 - 1)} step="1" value={editDraft.break_minutes} onChange={(event) => setEditDraft((current) => current ? { ...current, break_minutes: Number(event.target.value) || 0 } : current)} /></span></label>
                    <label className="block text-xs font-semibold text-stone-600">{copy.jobNote}<textarea maxLength={280} value={editDraft.task} onChange={(event) => setEditDraft((current) => current ? { ...current, task: event.target.value } : current)} rows={2} className="mt-1.5 block w-full resize-y border border-stone-300 bg-white px-3 py-2 text-sm font-normal text-stone-800 outline-none focus-visible:ring-2 focus-visible:ring-stone-500" /></label>
                    {editEntryOverlaps ? <p className="border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900" role="status">{copy.overlapWarning}</p> : null}
                    {editDraft.break_minutes >= getHours(editDraft.start, editDraft.end) * 60 ? <p className="border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800" role="alert">{breakError}</p> : null}
                    {editError ? <p className="border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800" role="alert">{editError}</p> : null}
                    <div className="flex flex-wrap items-center justify-between gap-2"><button type="button" aria-label={copy.delete} title={copy.delete} disabled={isUpdatingEntry || deletingEntryId === entry.id} onClick={() => void removeEntry(entry)} className="inline-flex h-9 items-center justify-center gap-2 border border-red-200 bg-white px-3 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"><Trash className="size-4" aria-hidden="true" />{deletingEntryId === entry.id ? copy.loading : copy.delete}</button><div className="flex flex-wrap justify-end gap-2"><button type="button" onClick={() => void toggleEntryHistory(entry.id)} className="h-9 border border-stone-300 bg-white px-3 text-xs font-semibold text-stone-700 hover:bg-stone-100">{historyEntryId === entry.id ? copy.cancelEdit : copy.history}</button><button type="button" disabled={isUpdatingEntry || deletingEntryId === entry.id} onClick={() => { setEditingEntryId(null); setEditDraft(null); setEditError("") }} className="h-9 border border-stone-300 bg-white px-3 text-xs font-semibold text-stone-700 hover:bg-stone-100 disabled:opacity-60">{copy.cancelEdit}</button><button type="submit" disabled={isUpdatingEntry || deletingEntryId === entry.id || !editDraft.house_id || editDraft.end <= editDraft.start || editDraft.break_minutes >= getHours(editDraft.start, editDraft.end) * 60} className="inline-flex h-9 items-center justify-center gap-2 bg-stone-900 px-3 text-xs font-semibold text-white hover:bg-stone-700 disabled:opacity-60">{isUpdatingEntry ? <SpinnerGap className="size-3.5 animate-spin" aria-hidden="true" /> : null}{isUpdatingEntry ? copy.loading : copy.saveChanges}</button></div></div>
                  </form> : null}
                  {historyEntryId === entry.id ? <div className="border-t border-stone-100 bg-white p-3" aria-label={copy.history}><h3 className="text-xs font-semibold text-stone-700">{copy.history}</h3>{isLoadingHistory ? <p className="mt-2 text-xs text-stone-500">{copy.historyLoading}</p> : historyEvents.length ? <ul className="mt-2 space-y-2">{historyEvents.map((event) => <li key={event.id} className="border-l-2 border-stone-200 pl-3"><p className="text-xs font-semibold text-stone-800">{historyActionLabel(event.action)} · {formatUsername(event.actor_username, language)}</p><p className="mt-0.5 text-[11px] text-stone-500">{new Intl.DateTimeFormat(language === "pt" ? "pt-PT" : "en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(event.changed_at))}</p>{event.before_state ? <p className="mt-1 text-[11px] leading-5 text-stone-600">{describeSnapshot(event.before_state)}</p> : null}{event.after_state ? <p className="mt-1 text-[11px] leading-5 text-stone-600">{describeSnapshot(event.after_state)}</p> : null}</li>)}</ul> : <p className="mt-2 text-xs text-stone-500">{copy.noHistory}</p>}</div> : null}
                </article>
              }) : <div className="border border-dashed border-stone-300 bg-stone-50 px-4 py-7 text-center text-sm text-stone-500">{copy.empty}</div>}</div>
            </section> : null}

            {adminView === "summary" ? <section className="print-hide mt-4 border border-stone-200 bg-white p-3 shadow-sm sm:p-4" aria-label={copy.summaryHeading}><div className="mb-3"><h2 className="font-semibold">{copy.summaryHeading}</h2><p className="mt-1 text-xs text-stone-500">{copy.summaryPrompt}</p></div><label className="mb-3 block"><span className="sr-only">{copy.searchMonth}</span><input type="search" value={summarySearch} onChange={(event) => setSummarySearch(event.target.value)} placeholder={copy.searchMonth} className="h-10 w-full border border-stone-300 bg-white px-3 text-sm text-stone-800 placeholder:text-stone-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-500" /></label>{visibleMonthSummaries.length ? <ul className="divide-y divide-stone-100">{visibleMonthSummaries.map((summary) => {
              const peopleInMonth = [...new Set(summary.entries.map((entry) => entry.user_id))]
              return <li key={summary.key}><button type="button" aria-pressed={selectedSummaryMonth === summary.key} onClick={() => setSelectedSummaryMonth((current) => current === summary.key ? null : summary.key)} className={`flex min-h-16 w-full items-center justify-between gap-3 px-2 py-2 text-left transition hover:bg-stone-50 ${selectedSummaryMonth === summary.key ? "bg-stone-50" : ""}`}><span className="min-w-0"><span className="block truncate text-sm font-semibold capitalize text-stone-800">{summary.title}</span><span className="mt-1 flex flex-wrap items-center gap-x-2 text-[11px] text-stone-500">{summary.entries.length} {copy.jobCount}<span>·</span>{summary.hours.toFixed(1)} h{user.is_admin ? <span className="inline-flex items-center gap-1">· {peopleInMonth.map((userId) => { const personEntry = summary.entries.find((entry) => entry.user_id === userId)!; const color = colorStyles[personEntry.calendar_color] ?? colorStyles.emerald; return <span key={userId} className={`size-2 rounded-full ${color.dot}`} title={displayName(personEntry, language)} /> })}</span> : null}</span></span><span className="shrink-0 text-sm font-semibold tabular-nums">€{summary.pay.toFixed(2)}</span></button></li>
            })}</ul> : <p className="border border-dashed border-stone-300 bg-stone-50 px-4 py-8 text-center text-sm text-stone-500">{monthSummaries.length ? copy.noMatchingMonths : copy.empty}</p>}</section> : null}

            {!user.is_admin && adminView === "summary" && selectedMonthSummary ? <section className="print-hide mt-4 border border-stone-200 bg-white p-3 shadow-sm sm:p-4" aria-label={copy.monthTotals}><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold capitalize">{selectedMonthSummary.title}</h2><button type="button" onClick={() => exportEmployeeMonth(selectedMonthSummary.key)} className="h-9 border border-stone-300 bg-white px-3 text-xs font-medium text-stone-700 hover:bg-stone-100">{copy.exportMonth}</button></div><div className="mt-3 grid grid-cols-3 gap-2"><div className="bg-stone-50 p-3"><p className="text-[11px] text-stone-500">{copy.hours}</p><p className="mt-1 text-lg font-semibold tabular-nums">{selectedMonthSummary.hours.toFixed(1)} h</p></div><div className="bg-stone-50 p-3"><p className="text-[11px] text-stone-500">{copy.estimatedPay}</p><p className="mt-1 text-lg font-semibold tabular-nums">€{selectedMonthSummary.pay.toFixed(2)}</p></div><div className="bg-stone-50 p-3"><p className="text-[11px] text-stone-500">{copy.jobCount}</p><p className="mt-1 text-lg font-semibold tabular-nums">{selectedMonthSummary.entries.length}</p></div></div></section> : null}
            {user.is_admin && adminView === "summary" && selectedSummaryMonth ? <section className="print-hide mt-4 border border-stone-200 bg-white p-3 shadow-sm sm:p-4" aria-label={copy.monthTotals}><div className="flex flex-wrap items-baseline justify-between gap-2"><div><h2 className="font-semibold">{copy.monthTotals}</h2><p className="mt-1 text-xs text-stone-500">{monthSummaries.find((item) => item.key === selectedSummaryMonth)?.title}</p></div><p className="text-xs font-medium text-stone-600">{copy.estimatedPay}: €{totalReportPay.toFixed(2)}</p></div><div className="mt-3 grid gap-3 sm:grid-cols-2"><div className="border border-stone-100 bg-stone-50 p-3"><h3 className="text-xs font-semibold text-stone-700">{copy.employeeTotals}</h3>{reportByEmployee.length ? <ul className="mt-2 divide-y divide-stone-200">{reportByEmployee.map(({ employee, count, hours: employeeHours, pay }) => <li key={employee.id} className="flex items-center justify-between gap-3 py-2 text-xs"><span className="min-w-0"><span className="block truncate font-medium text-stone-800">{displayName(employee, language)}</span><span className="text-stone-500">{employeeHours.toFixed(1)} h · {count} {copy.jobCount}</span></span><span className="shrink-0 font-semibold tabular-nums">€{pay.toFixed(2)}</span></li>)}</ul> : <p className="mt-2 text-xs text-stone-500">{copy.empty}</p>}</div><div className="border border-stone-100 bg-stone-50 p-3"><h3 className="text-xs font-semibold text-stone-700">{copy.houseTotals}</h3>{reportByHouse.length ? <ul className="mt-2 divide-y divide-stone-200">{reportByHouse.map(({ id, name, count, hours: houseHours, pay }) => <li key={id} className="flex items-center justify-between gap-3 py-2 text-xs"><span className="min-w-0"><span className="block truncate font-medium text-stone-800">{name}</span><span className="text-stone-500">{houseHours.toFixed(1)} h · {count} {copy.jobCount}</span></span><span className="shrink-0 font-semibold tabular-nums">€{pay.toFixed(2)}</span></li>)}</ul> : <p className="mt-2 text-xs text-stone-500">{copy.empty}</p>}</div></div></section> : null}

            {user.is_admin && adminView === "summary" && selectedSummaryMonth && reportByService.length ? <section className="print-hide mt-3 border border-stone-200 bg-white p-3 shadow-sm" aria-label={copy.serviceTotals}><h2 className="text-sm font-semibold">{copy.serviceTotals}</h2><ul className="mt-2 divide-y divide-stone-100">{reportByService.map((item) => <li key={item.key} className="flex items-center justify-between gap-3 py-2 text-xs"><span className="min-w-0"><span className="block truncate font-medium text-stone-800">{item.name}</span><span className="text-stone-500">{item.hours.toFixed(1)} h · {item.count} {copy.jobs}</span></span><span className="shrink-0 font-semibold tabular-nums">€{item.pay.toFixed(2)}</span></li>)}</ul></section> : null}

            {user.is_admin && adminView === "jobs" ? <section className="working-hours-report mt-4 border border-stone-200 bg-white p-4 shadow-sm" aria-labelledby="payroll-summary-heading"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 id="payroll-summary-heading" className="font-semibold">{copy.monthTotals}</h2><p className="mt-1 text-xs text-stone-500">{payrollPeriod === "week" ? weekRangeLabel : payrollMonthRangeLabel}</p></div><div className="inline-flex items-center gap-1 rounded-md bg-stone-100 p-1" role="group" aria-label={copy.period}>{(["week", "month"] as const).map((period) => <button key={period} type="button" aria-pressed={payrollPeriod === period} onClick={() => setPayrollPeriod(period)} className={`rounded px-3 py-1.5 text-xs font-medium transition ${payrollPeriod === period ? "bg-white text-stone-950 shadow-sm" : "text-stone-600 hover:text-stone-950"}`}>{period === "week" ? copy.week : copy.month}</button>)}</div></div><div className="mt-3 grid gap-3 sm:grid-cols-2"><div className="border border-stone-100 bg-stone-50 p-3"><p className="text-xs text-stone-500">{copy.hours}</p><p className="mt-1 text-xl font-semibold">{totalReportHours.toFixed(1)}</p></div><div className="border border-stone-100 bg-stone-50 p-3"><p className="text-xs text-stone-500">{copy.estimatedPay}</p><p className="mt-1 text-xl font-semibold">€{totalReportPay.toFixed(2)}</p></div></div>{reportByEmployee.length ? <ul className="mt-3 divide-y divide-stone-100">{reportByEmployee.map(({ employee, count, hours: employeeHours, pay }) => <li className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm" key={employee.id}><span className="inline-flex items-center gap-2"><span className={`size-2 rounded-full ${colorStyles[(employee.calendar_color as WorkingHourColor) || "emerald"]?.dot ?? colorStyles.emerald.dot}`} />{displayName(employee, language)}</span><span className="text-stone-600">{employeeHours.toFixed(1)} h · €{pay.toFixed(2)} · {count} {copy.jobs}</span></li>)}</ul> : <p className="mt-3 text-sm text-stone-500">{copy.empty}</p>}{reportByService.length ? <div className="mt-3 border-t border-stone-100 pt-3"><h3 className="text-xs font-semibold text-stone-700">{copy.serviceTotals}</h3><ul className="mt-1 grid gap-x-4 sm:grid-cols-2">{reportByService.map((item) => <li key={item.key} className="flex items-center justify-between gap-2 py-1 text-xs"><span className="truncate text-stone-700">{item.name} <span className="text-stone-500">· {item.count} {copy.jobs}</span></span><span className="shrink-0 text-stone-600">{item.hours.toFixed(1)} h · €{item.pay.toFixed(2)}</span></li>)}</ul></div> : null}</section> : null}

            {user.is_admin ? <section className="print-only hidden" aria-label={copy.report}><h1 className="font-heading text-2xl font-semibold">MADEIRA CLEANING & CARE</h1><h2 className="mt-1 text-xl font-semibold">{copy.report}</h2><p className="mt-1 text-sm">{copy.period}: {reportPeriod}</p><div className="mt-4 flex gap-8 border-y border-stone-300 py-2 text-sm"><span>{copy.hours}: {totalReportHours.toFixed(1)}</span><span>{copy.estimatedPay}: €{totalReportPay.toFixed(2)}</span><span>{copy.jobs}: {reportEntries.length}</span></div><table className="mt-4 w-full border-collapse text-xs"><thead><tr>{[copy.exportedAt, copy.employeeLabel, copy.property, copy.startLabel, copy.endLabel, copy.breakTime, copy.service, copy.jobNote, copy.hours, copy.rateLabel, copy.totalLabel].map((heading) => <th className="border border-stone-300 px-2 py-1 text-left" key={heading}>{heading}</th>)}</tr></thead><tbody>{[...reportEntries].sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start)).map((entry) => { const entryHours = getHours(entry.start, entry.end, entry.break_minutes); return <tr key={entry.id}><td className="border border-stone-300 px-2 py-1">{entry.date}</td><td className="border border-stone-300 px-2 py-1">{displayName(entry, language)}</td><td className="border border-stone-300 px-2 py-1">{entry.house_name}</td><td className="border border-stone-300 px-2 py-1">{entry.start}</td><td className="border border-stone-300 px-2 py-1">{entry.end}</td><td className="border border-stone-300 px-2 py-1">{entry.break_minutes}</td><td className="border border-stone-300 px-2 py-1">{copy.services[entry.service]}</td><td className="border border-stone-300 px-2 py-1">{entry.task}</td><td className="border border-stone-300 px-2 py-1">{entryHours.toFixed(1)}</td><td className="border border-stone-300 px-2 py-1">€{Number(entry.rate).toFixed(2)}</td><td className="border border-stone-300 px-2 py-1">€{(entryHours * Number(entry.rate)).toFixed(2)}</td></tr> })}</tbody></table></section> : null}

            {loadError ? <p className="mt-4 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{loadError}</p> : null}
            {isLoading ? <p className="mt-6 inline-flex items-center gap-2 text-sm text-stone-500" role="status"><SpinnerGap className="size-4 animate-spin" />{copy.loading}</p> : null}
            {user.is_admin ? <div className="print-only hidden"><h2 className="mt-5 text-lg font-semibold">{copy.monthTotals}</h2><ul className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm">{reportByEmployee.map(({ employee, count, hours: employeeHours, pay }) => <li className="flex justify-between gap-2" key={employee.id}><span>{displayName(employee, language)}</span><span>{employeeHours.toFixed(1)} h · €{pay.toFixed(2)} · {count}</span></li>)}</ul></div> : null}

            {shouldShowEntries && !isLoading ? <div ref={entryListRef} className="screen-entry-list mt-3 scroll-mt-4 space-y-3 sm:mt-4">
              {editMessage ? <p className="border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800" role="status">{editMessage}</p> : null}
              {editError ? <p className="border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800" role="alert">{editError}</p> : null}
              {groupedEntries.map((group) => <section key={group.date} className="overflow-hidden border border-stone-200 bg-white shadow-sm"><header className="flex items-center justify-between gap-3 border-b border-stone-100 bg-stone-50 px-3 py-2"><h3 className="text-xs font-semibold text-stone-700">{displayDate(group.date)}</h3><span className="text-[10px] text-stone-500">{group.entries.length} {copy.jobCount}</span></header><ul className="divide-y divide-stone-100">{group.entries.map((entry) => {
                const color = colorStyles[entry.calendar_color] ?? colorStyles.emerald
                const entryHours = getHours(entry.start, entry.end, entry.break_minutes)
                return <li key={entry.id} className={`grid ${user.is_admin ? "grid-cols-[3.25rem_minmax(0,1fr)_auto]" : "grid-cols-[3.25rem_minmax(0,1fr)_auto_2rem]"} items-center gap-2 px-3 py-2.5 sm:gap-3`}><div className="text-center leading-tight"><p className="text-xs font-semibold tabular-nums text-stone-800">{entry.start}</p><p className="mt-0.5 text-[10px] tabular-nums text-stone-500">{entry.end}</p></div><div className="min-w-0"><p className="flex min-w-0 items-center gap-1.5 truncate text-sm font-semibold"><span className={`size-2 shrink-0 rounded-full ${color.dot}`} />{entry.house_name}</p><p className="mt-0.5 truncate text-[11px] text-stone-500">{copy.services[entry.service]}{user.is_admin ? ` · ${displayName(entry, language)}` : ""}</p>{entry.task ? <p className="mt-0.5 truncate text-[10px] text-stone-500">{entry.task}</p> : null}</div><div className="text-right"><p className="text-sm font-semibold tabular-nums">€{(entryHours * Number(entry.rate)).toFixed(2)}</p><p className="mt-0.5 whitespace-nowrap text-[10px] tabular-nums text-stone-500">{entryHours.toFixed(1)} h · €{Number(entry.rate).toFixed(2)}/h</p></div>{!user.is_admin ? <button type="button" aria-label={`${copy.delete}: ${displayName(entry, language)} · ${entry.house_name}`} title={copy.delete} disabled={deletingEntryId === entry.id} onClick={() => void removeEntry(entry)} className="flex size-8 items-center justify-center text-stone-400 transition hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:opacity-50"><Trash className="size-4" aria-hidden="true" /></button> : null}</li>
              })}</ul></section>)}
              {sortedEntries.length === 0 ? <div className="border border-dashed border-stone-300 bg-white px-5 py-10 text-center"><CalendarBlank className="mx-auto size-7 text-stone-400" aria-hidden="true" /><h3 className="mt-3 font-semibold">{copy.empty}</h3><p className="mt-1 text-sm text-stone-500">{copy.emptyHelp}</p></div> : null}
            </div> : null}
          </section>

          {!user.is_admin && adminView === "jobs" ? <aside className="mx-auto w-full min-w-0 max-w-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5" aria-labelledby="new-entry-heading"><div className="flex items-center gap-2"><span className="flex size-8 items-center justify-center bg-stone-900 text-white"><Plus className="size-4" weight="bold" aria-hidden="true" /></span><h2 id="new-entry-heading" className="text-lg font-semibold">{copy.addTitle}</h2></div>
            <form className="mt-5 space-y-4" onSubmit={(event) => void addEntry(event)}>
              <FilterDropdown label={copy.house} value={houseId} onChange={setHouseId} options={[{ value: "", label: houses.length ? copy.chooseHouse : copy.noHouses }, ...houses.map((house) => ({ value: String(house.id), label: house.name }))]} />
              <FilterDropdown label={copy.service} value={service} onChange={(value) => setService(value as WorkingHourService)} options={services.map((key) => ({ value: key, label: copy.services[key] }))} />
              <DateDropdown label={copy.date} value={date} language={language} onChange={setDate} />
              <div className="grid grid-cols-2 gap-3"><FilterDropdown label={copy.start} value={start} onChange={changeStartTime} options={startTimes.map((time) => ({ value: time, label: time }))} /><FilterDropdown label={copy.end} value={end} onChange={setEnd} options={availableEndTimes.map((time) => ({ value: time, label: time }))} /></div>
              <label className="block text-xs font-semibold text-stone-600">{copy.breakTime}<span className="mt-1.5 flex h-10 items-center border border-stone-300 bg-white px-3"><input className="h-full min-w-0 flex-1 text-sm font-normal text-stone-800 outline-none" type="number" min="0" max={Math.max(0, getHours(start, end) * 60 - 1)} step="1" value={breakMinutes} onChange={(event) => setBreakMinutes(event.target.value)} /></span></label>
              <label className="block text-xs font-semibold text-stone-600">{copy.jobNote}<textarea maxLength={280} value={task} onChange={(event) => setTask(event.target.value)} rows={2} className="mt-1.5 block w-full resize-y border border-stone-300 bg-white px-3 py-2 text-sm font-normal text-stone-800 outline-none focus-visible:ring-2 focus-visible:ring-stone-500" /></label>
              {newEntryOverlaps ? <p className="border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900" role="status">{copy.overlapWarning}</p> : null}
              {breakInvalid ? <p className="border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800" role="alert">{breakError}</p> : null}
              <label className="block text-xs font-semibold text-stone-600">{copy.rate}<span className="mt-1.5 flex h-10 items-center border border-stone-300 bg-white px-3 text-sm font-normal text-stone-500"><span aria-hidden="true">€</span><input className="h-full min-w-0 flex-1 bg-transparent px-2 text-stone-800 outline-none" type="number" min="1" max="1000" step="1" required value={rate} onChange={(event) => setRate(event.target.value)} /></span></label>
              <div className="flex items-center justify-between border-t border-stone-100 pt-3 text-sm"><span className="text-stone-600">{copy.duration}</span><strong>{hours.toFixed(1)} h</strong></div><div className="flex items-center justify-between text-sm"><span className="text-stone-600">{copy.total}</span><strong className="text-base">€{(hours * (Number(rate) || 0)).toFixed(2)}</strong></div>
              <button className="inline-flex h-11 w-full items-center justify-center gap-2 bg-stone-900 px-4 text-sm font-semibold text-white transition hover:bg-stone-700 disabled:opacity-60" disabled={isSaving || breakInvalid} type="submit">{isSaving ? <SpinnerGap className="size-4 animate-spin" /> : <Plus className="size-4" weight="bold" aria-hidden="true" />}{isSaving ? copy.loading : copy.add}</button>{message ? <p className="border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800" role="status">{message}</p> : null}{loadError ? <p className="border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800" role="alert">{loadError}</p> : null}
            </form>
          </aside> : null}
        </div>
      </div>
    </main>
  )
}
