"use client"

import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { FormEvent, useEffect, useRef, useState } from "react"
import { ArrowLeft, Camera, CaretDown, DownloadSimple, FloppyDisk, ImageSquare, Plus, Printer, SpinnerGap, Trash, X } from "@phosphor-icons/react"

import { useLanguage } from "@/components/language-provider"
import { useAuth } from "@/components/auth-context"
import { LanguageSwitcher } from "@/components/language-switcher"
import { AccountMenu } from "@/components/account-menu"
import { Button } from "@/components/ui/button"
import {
  createInventoryForm,
  downloadInventoryFormPdf,
  getHouse,
  getInventoryForm,
  getInventoryForms,
  deleteInventoryFormPhoto,
  uploadInventoryFormPhoto,
  inventoryFormPhotoUrl,
  updateInventoryForm,
  type House,
  type InventoryCategory,
  type InventoryForm,
  type InventoryFormInput,
  type InventoryFormLineInput,
  type InventoryFormPhoto,
  type InventoryOperation,
} from "@/lib/api"
import { createTemplateLines, inventoryCategories, translateInventoryDescription } from "@/lib/inventory"

type EditableLine = InventoryFormLineInput & { clientKey: string }
type FormDetails = Omit<InventoryFormInput, "lines">
type EditableField = "stock_total" | "current_quantity" | "outgoing_laundry" | "incoming_clean"
type DraftStatus = "clean" | "saving" | "saved" | "restored"
type PendingPhoto = { clientKey: string; file: File; previewUrl: string }

const editorCopy = {
  pt: {
    operations: { check_in: "Check-in", check_out: "Check-out", laundry: "Lavandaria" },
    quantities: { stock_total: "Stock total\ncasa", current_quantity: "Qtd. na casa\n(atual)", outgoing_laundry: "Saída\n(lavandaria)", incoming_clean: "Entrada\n(limpo)" },
    mobileQuantities: { stock_total: "Stock total casa", current_quantity: "Qtd. na casa (atual)", outgoing_laundry: "Saída (lavandaria)", incoming_clean: "Entrada (limpo)" },
    categories: { bed_linen: "TÊXTEIS DE CAMA (QUARTOS)", bath_linen: "TÊXTEIS DE BANHO", kitchen_cleaning: "TÊXTEIS DE COZINHA & LIMPEZA", decorative_textiles: "DECORAÇÃO, ACESSÓRIOS & TÊXTEIS DECORATIVOS" },
    wrongHouse: "Esta ficha de rastreio não pertence à casa selecionada.", loadError: "Não foi possível carregar a casa ou a ficha de rastreio. Tente novamente.", descriptionError: "Adicione uma descrição a todos os itens antes de guardar.", saveError: "Não foi possível guardar esta ficha. Verifique os campos e tente novamente.",
    newTitle: "Nova ficha de rastreio", editTitle: "Editar ficha de rastreio", notFound: "Não foi possível encontrar esta ficha de rastreio.", backToHouse: "Voltar à casa", loading: "A carregar ficha de rastreio", backTo: "Voltar a", cancel: "Cancelar", moreActions: "Mais ações", savingSheet: "A guardar ficha", saveSheet: "Guardar ficha", saveChanges: "Guardar alterações", print: "Imprimir", downloadPdf: "Descarregar PDF", downloadingPdf: "A criar PDF", pdfError: "Não foi possível criar o PDF. Tente novamente.",
    subtitle: "Gestão de inventário & controlo de roupas", trackingSheet: "Ficha de rastreio", prefilledStart: "Esta ficha foi preenchida a partir da última ficha guardada", prefilledEnd: "Será guardada separadamente; a data foi definida para hoje e pode alterar todos os dados copiados antes de guardar.",
    details: "Dados da ficha de rastreio", countDate: "Data da contagem", operationType: "Tipo de operação", room: "Quarto / divisão", allRooms: "Todas as divisões", responsible: "Responsável", responsibleName: "Nome do responsável",
    item: "item", items: "itens", itemDescription: "Descrição do item", deleteItem: "Eliminar", condition: "Estado / observações", conditionPlaceholder: "Estado / notas (opcional)", noItems: "Ainda não existem itens nesta categoria.", noItemsDesktop: "Sem itens nesta categoria. Use “Adicionar linha” para criar um.", addLine: "Adicionar linha", removeItem: "Eliminar item",
    noticeTitle: "Atenção ao rastreio:", noticeMobile: "Registe em “Estado / Observações” peças em falta, danificadas ou manchadas. Comunique de imediato diferenças entre a saída e o retorno da lavandaria.", noticeDesktop: "Em caso de falta de mudas completas ou peças danificadas/manchadas, anotar obrigatoriamente na coluna “Estado / Observações”. Qualquer divergência entre a saída para lavandaria e o retorno deve ser comunicada de imediato.",
    validation: "Validação & responsabilidade do rastreio", countedBy: "Contagem feita por (nome)", signature: "Assinatura do responsável", checkedBy: "Conferido por (lavandaria / gov.)",
    photosHeading: "Fotografias", photosHelp: "Tire uma fotografia agora ou escolha imagens da galeria. As fotografias ficam privadas e associadas a esta ficha.", takePhoto: "Tirar fotografia", choosePhotos: "Escolher da galeria", photoAlt: "Fotografia da ficha", viewFullPhoto: "Ver fotografia em tamanho completo", closePhoto: "Fechar fotografia", removePhoto: "Remover fotografia", restorePhoto: "Manter fotografia", noPhotos: "Ainda não existem fotografias nesta ficha.", photosCount: "fotografias", photoSingular: "fotografia", savePhotos: "Guardar fotografias", saveSheetAndPhotos: "Guardar ficha e fotografias", savePhotosHelp: "Guarde as fotografias selecionadas nesta ficha.", photosSaved: "Fotografias guardadas.", photosPending: "Fotografias por guardar", photoSaveError: "A ficha foi guardada, mas não foi possível guardar todas as fotografias. Tente novamente.", photoTypeError: "Escolha uma imagem JPEG, PNG, WebP ou HEIC.", photoSizeError: "Cada fotografia tem de ter 12 MB ou menos.", photoLimitError: "Pode adicionar até 12 fotografias por ficha.",
    draftSaving: "A guardar rascunho…", draftSaved: "Rascunho guardado localmente", draftRestored: "Rascunho recuperado", noUnsaved: "Sem alterações por guardar", unsavedConfirm: "Existem alterações que ainda não foram guardadas na base de dados. Pretende sair mesmo assim?",
  },
  en: {
    operations: { check_in: "Check-in", check_out: "Check-out", laundry: "Laundry" },
    quantities: { stock_total: "Total house\nstock", current_quantity: "Current qty.\nin house", outgoing_laundry: "Sent to\nlaundry", incoming_clean: "Returned\nclean" },
    mobileQuantities: { stock_total: "Total house stock", current_quantity: "Current qty. in house", outgoing_laundry: "Sent to laundry", incoming_clean: "Returned clean" },
    categories: { bed_linen: "BED LINEN (BEDROOMS)", bath_linen: "BATH LINEN", kitchen_cleaning: "KITCHEN & CLEANING TEXTILES", decorative_textiles: "DECOR, ACCESSORIES & DECORATIVE TEXTILES" },
    wrongHouse: "This tracking sheet does not belong to the selected house.", loadError: "Couldn’t load the house or tracking sheet. Please try again.", descriptionError: "Please add a description to every item before saving.", saveError: "Couldn’t save this tracking sheet. Please check your entries and try again.",
    newTitle: "New tracking sheet", editTitle: "Edit tracking sheet", notFound: "This tracking sheet could not be found.", backToHouse: "Back to house", loading: "Loading tracking sheet", backTo: "Back to", cancel: "Cancel", moreActions: "More actions", savingSheet: "Saving sheet", saveSheet: "Save tracking sheet", saveChanges: "Save changes", print: "Print", downloadPdf: "Download PDF", downloadingPdf: "Creating PDF", pdfError: "Couldn’t create the PDF. Please try again.",
    subtitle: "Inventory management & linen control", trackingSheet: "Tracking sheet", prefilledStart: "This sheet is prefilled from your latest saved sheet", prefilledEnd: "It will be saved separately; the count date has been set to today, and you can change any copied details before saving.",
    details: "Tracking sheet details", countDate: "Count date", operationType: "Operation type", room: "Room / area", allRooms: "All rooms", responsible: "Person responsible", responsibleName: "Name of person responsible",
    item: "item", items: "items", itemDescription: "Item description", deleteItem: "Delete", condition: "Condition / notes", conditionPlaceholder: "Condition / notes (optional)", noItems: "No items in this category yet.", noItemsDesktop: "No items in this category. Use “Add line” to create one.", addLine: "Add line", removeItem: "Remove item",
    noticeTitle: "Tracking notice:", noticeMobile: "Record missing, damaged, or stained items under “Condition / Notes”. Report differences between laundry items sent and returned immediately.", noticeDesktop: "If complete linen sets are missing, or if any items are damaged or stained, record this under “Condition / Notes”. Any difference between the items sent to the laundry and those returned must be reported immediately.",
    validation: "Tracking validation & responsibility", countedBy: "Counted by (name)", signature: "Responsible person’s signature", checkedBy: "Checked by (laundry / housekeeping)",
    photosHeading: "Photos", photosHelp: "Take a photo now or choose images from your gallery. Photos stay private and are attached to this sheet.", takePhoto: "Take a photo", choosePhotos: "Choose from gallery", photoAlt: "Tracking-sheet photo", viewFullPhoto: "View full-size photo", closePhoto: "Close photo", removePhoto: "Remove photo", restorePhoto: "Keep photo", noPhotos: "No photos attached to this sheet yet.", photosCount: "photos", photoSingular: "photo", savePhotos: "Save photos", saveSheetAndPhotos: "Save sheet and photos", savePhotosHelp: "Save your selected photos to this sheet.", photosSaved: "Photos saved.", photosPending: "Photos waiting to be saved", photoSaveError: "The sheet was saved, but some photos could not be uploaded. Please try again.", photoTypeError: "Choose a JPEG, PNG, WebP, or HEIC image.", photoSizeError: "Each photo must be 12 MB or smaller.", photoLimitError: "You can add up to 12 photos per sheet.",
    draftSaving: "Saving draft…", draftSaved: "Draft saved locally", draftRestored: "Draft restored", noUnsaved: "No unsaved changes", unsavedConfirm: "You have changes that have not been saved to the database. Are you sure you want to leave?",
  },
} as const

function localToday() {
  const now = new Date()
  const offset = now.getTimezoneOffset() * 60_000
  return new Date(now.getTime() - offset).toISOString().slice(0, 10)
}

function createInitialDetails(): FormDetails {
  return {
    count_date: localToday(),
    operation_types: [],
    room_division: "",
    responsible: "",
    counter_name: "",
    responsible_signature: "",
    checked_by: "",
  }
}

function lineKey() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
}

function inputClassName(extra = "") {
  return `w-full border border-stone-300 bg-white px-3 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-[#223f82] focus:ring-2 focus:ring-[#223f82]/10 ${extra}`
}

function serializableLines(lines: EditableLine[]): InventoryFormLineInput[] {
  return lines.map((line) => ({
    category: line.category,
    description: line.description,
    stock_total: line.stock_total,
    current_quantity: line.current_quantity,
    outgoing_laundry: line.outgoing_laundry,
    incoming_clean: line.incoming_clean,
    status_observations: line.status_observations,
  }))
}

function formSnapshot(details: FormDetails, lines: EditableLine[]) {
  return JSON.stringify({ details, lines: serializableLines(lines) })
}

export function InventoryFormEditor({ houseId, formId }: { houseId: number; formId?: number }) {
  const router = useRouter()
  const { user } = useAuth()
  const { language } = useLanguage()
  const copy = editorCopy[language]
  const formatDate = (value: string) => new Intl.DateTimeFormat(language === "pt" ? "pt-PT" : "en-GB", { dateStyle: "long" }).format(new Date(`${value}T00:00:00`))
  const operationOptions: { value: InventoryOperation; label: string }[] = [
    { value: "check_in", label: copy.operations.check_in },
    { value: "check_out", label: copy.operations.check_out },
    { value: "laundry", label: copy.operations.laundry },
  ]
  const quantityColumns: { field: EditableField; label: string }[] = [
    { field: "stock_total", label: copy.quantities.stock_total },
    { field: "current_quantity", label: copy.quantities.current_quantity },
    { field: "outgoing_laundry", label: copy.quantities.outgoing_laundry },
    { field: "incoming_clean", label: copy.quantities.incoming_clean },
  ]
  const isValidRoute = Number.isInteger(houseId) && houseId > 0 && (formId === undefined || (Number.isInteger(formId) && formId > 0))
  const draftKey = `airbnb:inventory-draft:${user.id}:${houseId}:${formId ?? "new"}`
  const [house, setHouse] = useState<House | null>(null)
  const [details, setDetails] = useState<FormDetails>(createInitialDetails)
  const [lines, setLines] = useState<EditableLine[]>(() =>
    createTemplateLines().map((line, index) => ({ ...line, clientKey: `template-${index}` }))
  )
  const [existingPhotos, setExistingPhotos] = useState<InventoryFormPhoto[]>([])
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([])
  const [photosToDelete, setPhotosToDelete] = useState<number[]>([])
  const [createdFormId, setCreatedFormId] = useState<number | null>(null)
  const [expandedCategory, setExpandedCategory] = useState<InventoryCategory | null>(null)
  const [expandedPhotos, setExpandedPhotos] = useState(false)
  const [photoSavedNotice, setPhotoSavedNotice] = useState<string | null>(null)
  const [fullPhoto, setFullPhoto] = useState<{ src: string; alt: string } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false)
  const [prefilledFromDate, setPrefilledFromDate] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [baselineSnapshot, setBaselineSnapshot] = useState("")
  const [draftStatus, setDraftStatus] = useState<DraftStatus>("clean")
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null)
  const suppressWarningRef = useRef(false)
  const restoringHistoryRef = useRef(false)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const previewUrlsRef = useRef<Set<string>>(new Set())
  const copyRef = useRef(copy)
  const currentSnapshot = formSnapshot(details, lines)
  const hasUnsavedFormChanges = !isLoading && baselineSnapshot !== "" && currentSnapshot !== baselineSnapshot
  const hasPendingPhotoChanges = pendingPhotos.length > 0 || photosToDelete.length > 0
  const hasUnsavedChanges = hasUnsavedFormChanges || (!isLoading && hasPendingPhotoChanges)

  useEffect(() => () => previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url)), [])

  useEffect(() => {
    if (!fullPhoto) return
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setFullPhoto(null)
    }
    window.addEventListener("keydown", closeOnEscape)
    return () => window.removeEventListener("keydown", closeOnEscape)
  }, [fullPhoto])

  useEffect(() => {
    copyRef.current = copy
  }, [copy])

  useEffect(() => {
    let isActive = true

    if (!isValidRoute) return

    const loadData = async () => {
      try {
        const [loadedHouse, loadedForm] = await Promise.all([
          getHouse(houseId),
          formId === undefined
            ? getInventoryForms(houseId).then((forms) => forms.reduce<InventoryForm | null>((latest, form) => !latest || form.id > latest.id ? form : latest, null))
            : getInventoryForm(formId),
        ])
        if (!isActive) return
        if (loadedForm && formId !== undefined && loadedForm.house_id !== houseId) {
          setError(copyRef.current.wrongHouse)
          return
        }

        setHouse(loadedHouse)
        setExistingPhotos(formId === undefined ? [] : loadedForm?.photos ?? [])
        const loadedDetails: FormDetails = loadedForm
          ? {
            count_date: formId === undefined ? localToday() : loadedForm.count_date,
            operation_types: loadedForm.operation_types,
            room_division: loadedForm.room_division,
            responsible: loadedForm.responsible,
            counter_name: loadedForm.counter_name,
            responsible_signature: loadedForm.responsible_signature,
            checked_by: loadedForm.checked_by,
          }
          : createInitialDetails()
        const loadedLines: EditableLine[] = loadedForm
          ? loadedForm.lines.map((line) => ({
            clientKey: String(line.id),
            category: line.category,
            description: line.description,
            stock_total: line.stock_total,
            current_quantity: line.current_quantity,
            outgoing_laundry: line.outgoing_laundry,
            incoming_clean: line.incoming_clean,
            status_observations: line.status_observations,
          }))
          : createTemplateLines().map((line, index) => ({ ...line, clientKey: `template-${index}` }))

        setBaselineSnapshot(formSnapshot(loadedDetails, loadedLines))
        setPrefilledFromDate(loadedForm && formId === undefined ? loadedForm.count_date : null)

        const savedDraft = window.localStorage.getItem(draftKey)
        if (savedDraft) {
          try {
            const parsed = JSON.parse(savedDraft) as { details?: FormDetails; lines?: InventoryFormLineInput[]; savedAt?: string }
            if (parsed.details && Array.isArray(parsed.lines)) {
              setDetails(parsed.details)
              setLines(parsed.lines.map((line, index) => ({ ...line, clientKey: `draft-${index}-${lineKey()}` })))
              setDraftSavedAt(parsed.savedAt ?? null)
              setDraftStatus("restored")
            } else {
              window.localStorage.removeItem(draftKey)
              setDetails(loadedDetails)
              setLines(loadedLines)
            }
          } catch {
            window.localStorage.removeItem(draftKey)
            setDetails(loadedDetails)
            setLines(loadedLines)
          }
        } else {
          setDetails(loadedDetails)
          setLines(loadedLines)
        }
      } catch {
        if (isActive) setError(copyRef.current.loadError)
      } finally {
        if (isActive) setIsLoading(false)
      }
    }

    void loadData()
    return () => {
      isActive = false
    }
  }, [draftKey, houseId, formId, isValidRoute])

  useEffect(() => {
    if (isLoading || !baselineSnapshot) return

    if (!hasUnsavedFormChanges) {
      window.localStorage.removeItem(draftKey)
      return
    }

    const savingTimeout = window.setTimeout(() => setDraftStatus("saving"), 0)
    const saveTimeout = window.setTimeout(() => {
      const savedAt = new Date().toISOString()
      window.localStorage.setItem(draftKey, JSON.stringify({ details, lines: serializableLines(lines), savedAt }))
      setDraftSavedAt(savedAt)
      setDraftStatus("saved")
    }, 600)

    return () => {
      window.clearTimeout(savingTimeout)
      window.clearTimeout(saveTimeout)
    }
  }, [baselineSnapshot, details, draftKey, hasUnsavedFormChanges, isLoading, lines])

  useEffect(() => {
    function warnBeforeUnload(event: BeforeUnloadEvent) {
      if (!hasUnsavedChanges || suppressWarningRef.current) return
      event.preventDefault()
      event.returnValue = ""
    }

    window.addEventListener("beforeunload", warnBeforeUnload)
    return () => window.removeEventListener("beforeunload", warnBeforeUnload)
  }, [hasUnsavedChanges])

  useEffect(() => {
    function warnOnBrowserBack() {
      if (restoringHistoryRef.current) {
        restoringHistoryRef.current = false
        return
      }
      if (!hasUnsavedChanges || suppressWarningRef.current) return
      if (window.confirm(copyRef.current.unsavedConfirm)) {
        suppressWarningRef.current = true
        return
      }
      restoringHistoryRef.current = true
      window.history.forward()
    }

    window.addEventListener("popstate", warnOnBrowserBack)
    return () => window.removeEventListener("popstate", warnOnBrowserBack)
  }, [hasUnsavedChanges])

  function canLeave() {
    return !hasUnsavedChanges || window.confirm(copy.unsavedConfirm)
  }

  function navigateBack() {
    if (!canLeave()) return
    suppressWarningRef.current = true
    router.push(`/houses/${houseId}`)
  }

  function updateDetails<Field extends keyof FormDetails>(field: Field, value: FormDetails[Field]) {
    setDetails((current) => ({ ...current, [field]: value }))
  }

  function updateLine(clientKey: string, field: keyof InventoryFormLineInput, value: string | number | null) {
    setLines((current) => current.map((line) => line.clientKey === clientKey ? { ...line, [field]: value } : line))
  }

  function toggleOperation(operation: InventoryOperation) {
    setDetails((current) => ({
      ...current,
      operation_types: current.operation_types.includes(operation)
        ? current.operation_types.filter((value) => value !== operation)
        : [...current.operation_types, operation],
    }))
  }

  function addLine(category: InventoryCategory) {
    setLines((current) => [...current, {
      clientKey: lineKey(),
      category,
      description: "",
      stock_total: null,
      current_quantity: null,
      outgoing_laundry: null,
      incoming_clean: null,
      status_observations: "",
    }])
  }

  function removeLine(clientKey: string) {
    setLines((current) => current.filter((line) => line.clientKey !== clientKey))
  }

  function addPhotos(fileList: FileList | null) {
    if (!fileList?.length) return
    setError(null)
    setPhotoSavedNotice(null)
    const alreadyAttached = existingPhotos.length - photosToDelete.length + pendingPhotos.length
    let availableSlots = Math.max(0, 12 - alreadyAttached)
    const accepted: PendingPhoto[] = []
    for (const file of Array.from(fileList)) {
      if (!file.type || !["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"].includes(file.type.toLowerCase())) {
        setError(copy.photoTypeError)
        continue
      }
      if (file.size > 12 * 1024 * 1024) {
        setError(copy.photoSizeError)
        continue
      }
      if (availableSlots <= 0) {
        setError(copy.photoLimitError)
        break
      }
      const previewUrl = URL.createObjectURL(file)
      previewUrlsRef.current.add(previewUrl)
      accepted.push({ clientKey: lineKey(), file, previewUrl })
      availableSlots -= 1
    }
    if (accepted.length) {
      setPendingPhotos((current) => [...current, ...accepted])
      setExpandedPhotos(true)
    }
  }

  function removePendingPhoto(photo: PendingPhoto) {
    URL.revokeObjectURL(photo.previewUrl)
    previewUrlsRef.current.delete(photo.previewUrl)
    setPendingPhotos((current) => current.filter((item) => item.clientKey !== photo.clientKey))
  }

  function togglePhotoRemoval(photoId: number) {
    setPhotoSavedNotice(null)
    setPhotosToDelete((current) => current.includes(photoId) ? current.filter((id) => id !== photoId) : [...current, photoId])
  }

  async function savePhotoChanges() {
    const savedFormId = formId ?? createdFormId
    if (savedFormId === null) return

    setIsSaving(true)
    setError(null)
    setPhotoSavedNotice(null)
    try {
      for (const photoId of photosToDelete) {
        await deleteInventoryFormPhoto(savedFormId, photoId)
        setExistingPhotos((current) => current.filter((photo) => photo.id !== photoId))
        setPhotosToDelete((current) => current.filter((id) => id !== photoId))
      }
      for (const photo of pendingPhotos) {
        const savedPhoto = await uploadInventoryFormPhoto(savedFormId, photo.file)
        setExistingPhotos((current) => [...current, savedPhoto])
        setPendingPhotos((current) => current.filter((item) => item.clientKey !== photo.clientKey))
        URL.revokeObjectURL(photo.previewUrl)
        previewUrlsRef.current.delete(photo.previewUrl)
      }
      setPhotoSavedNotice(copy.photosSaved)
    } catch {
      setError(copy.photoSaveError)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDownloadPdf() {
    setIsDownloadingPdf(true)
    setError(null)
    try {
      downloadInventoryFormPdf(houseId, {
        ...details,
        lines: serializableLines(lines)
          .filter((line) => line.description.trim())
          .map((line) => ({ ...line, description: translateInventoryDescription(line.description, language) })),
      }, language)
    } catch {
      setError(copy.pdfError)
    } finally {
      setIsDownloadingPdf(false)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!house) return

    const incompleteLine = lines.find((line) => !line.description.trim())
    if (incompleteLine) {
      setExpandedCategory(incompleteLine.category)
      setError(copy.descriptionError)
      const inputId = window.matchMedia("(min-width: 1024px)").matches
        ? `desktop-line-description-${incompleteLine.clientKey}`
        : `mobile-line-description-${incompleteLine.clientKey}`
      window.requestAnimationFrame(() => document.getElementById(inputId)?.focus())
      return
    }

    setIsSaving(true)
    setError(null)
    const input: InventoryFormInput = {
      ...details,
      lines: lines.map((line) => ({
        category: line.category,
        description: line.description,
        stock_total: line.stock_total,
        current_quantity: line.current_quantity,
        outgoing_laundry: line.outgoing_laundry,
        incoming_clean: line.incoming_clean,
        status_observations: line.status_observations,
      })),
    }

    let savedFormId = formId ?? createdFormId
    try {
      if (savedFormId === null) {
        const savedForm = await createInventoryForm(houseId, input)
        savedFormId = savedForm.id
        setCreatedFormId(savedForm.id)
      } else {
        await updateInventoryForm(savedFormId, input)
      }
    } catch {
      setError(copy.saveError)
      setIsSaving(false)
      return
    }

    try {
      for (const photoId of photosToDelete) {
        await deleteInventoryFormPhoto(savedFormId, photoId)
        setExistingPhotos((current) => current.filter((photo) => photo.id !== photoId))
        setPhotosToDelete((current) => current.filter((id) => id !== photoId))
      }
      for (const photo of pendingPhotos) {
        const savedPhoto = await uploadInventoryFormPhoto(savedFormId, photo.file)
        setExistingPhotos((current) => [...current, savedPhoto])
        setPendingPhotos((current) => current.filter((item) => item.clientKey !== photo.clientKey))
        URL.revokeObjectURL(photo.previewUrl)
        previewUrlsRef.current.delete(photo.previewUrl)
      }
    } catch {
      setError(copy.photoSaveError)
      setIsSaving(false)
      return
    }

    try {
      suppressWarningRef.current = true
      window.localStorage.removeItem(draftKey)
      setBaselineSnapshot(currentSnapshot)
      router.push(`/houses/${houseId}?saved=${formId === undefined ? "created" : "updated"}`)
    } catch {
      setError(copy.saveError)
    } finally {
      setIsSaving(false)
    }
  }

  const pageTitle = formId === undefined ? copy.newTitle : copy.editTitle
  const draftTime = draftSavedAt
    ? new Intl.DateTimeFormat(language === "pt" ? "pt-PT" : "en-GB", { hour: "2-digit", minute: "2-digit" }).format(new Date(draftSavedAt))
    : null
  const draftMessage = !hasUnsavedFormChanges && hasPendingPhotoChanges
    ? copy.photosPending
    : !hasUnsavedChanges
    ? copy.noUnsaved
    : draftStatus === "saving"
    ? copy.draftSaving
    : draftStatus === "restored"
      ? copy.draftRestored
      : draftStatus === "saved"
        ? `${copy.draftSaved}${draftTime ? ` · ${draftTime}` : ""}`
        : copy.draftSaving

  if (!isValidRoute) {
    return <main className="min-h-svh bg-stone-100 p-4 sm:p-6"><div className="mx-auto max-w-3xl border border-red-200 bg-white p-6 text-sm text-red-800" role="alert">{copy.notFound}<p className="mt-4"><Link href={`/houses/${houseId}`} className="font-semibold underline underline-offset-4">{copy.backToHouse}</Link></p></div></main>
  }

  if (isLoading) {
    return <main className="flex min-h-svh items-center justify-center bg-stone-100 text-stone-500"><SpinnerGap className="mr-2 size-5 animate-spin" /> {copy.loading}</main>
  }

  if (error && !house) {
    return <main className="min-h-svh bg-stone-100 p-4 sm:p-6"><div className="mx-auto max-w-3xl border border-red-200 bg-white p-6 text-sm text-red-800" role="alert">{error}<p className="mt-4"><Link href={`/houses/${houseId}`} className="font-semibold underline underline-offset-4">{copy.backToHouse}</Link></p></div></main>
  }

  if (!house) return null

  return (
    <main className="min-h-svh bg-stone-100 p-2 text-stone-950 sm:p-6 print:bg-white print:p-0">
      <div className="mx-auto max-w-[1440px] border border-stone-200 bg-white px-4 py-6 shadow-sm sm:px-7 sm:py-8 lg:px-10 print:border-0 print:p-0 print:shadow-none">
        <div className="mb-6 flex flex-col gap-4 2xl:flex-row 2xl:items-center 2xl:justify-between print:hidden">
          <div className="flex min-w-0 items-center justify-between gap-4 sm:justify-start">
            <Link href={`/houses/${houseId}`} onClick={(event) => { if (!canLeave()) event.preventDefault(); else suppressWarningRef.current = true }} className="inline-flex min-w-0 max-w-[min(55vw,24rem)] items-center gap-2 truncate whitespace-nowrap text-sm font-medium text-stone-600 transition hover:text-stone-950"><ArrowLeft className="size-4 shrink-0" aria-hidden="true" /> {copy.backTo} {house.name}</Link>
            <div className="flex items-center gap-3">
              <LanguageSwitcher />
              <AccountMenu />
            </div>
          </div>
          <div className="hidden flex-col gap-2 sm:flex 2xl:items-end">
            <p className={`text-xs ${hasUnsavedChanges ? "text-amber-700" : "text-stone-500"}`} role="status">{draftMessage}</p>
            <div className="grid w-full grid-cols-2 gap-2 2xl:flex 2xl:w-auto">
              <Button type="button" variant="outline" className="w-full 2xl:w-auto" onClick={() => window.print()}><Printer data-icon="inline-start" />{copy.print}</Button>
              <Button type="button" variant="outline" className="w-full 2xl:w-auto" disabled={isDownloadingPdf} onClick={() => void handleDownloadPdf()}>{isDownloadingPdf ? <SpinnerGap className="animate-spin" data-icon="inline-start" /> : <DownloadSimple data-icon="inline-start" />}{isDownloadingPdf ? copy.downloadingPdf : copy.downloadPdf}</Button>
              <Button type="button" variant="outline" className="w-full 2xl:w-auto" onClick={navigateBack}>{copy.cancel}</Button>
              <Button type="submit" form="inventory-form" className="w-full 2xl:w-auto" disabled={isSaving}><>{isSaving ? <SpinnerGap className="animate-spin" data-icon="inline-start" /> : null}{isSaving ? copy.savingSheet : formId === undefined ? copy.saveSheet : copy.saveChanges}</></Button>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 sm:hidden">
            <p className={`min-w-0 truncate text-xs ${hasUnsavedChanges ? "text-amber-700" : "text-stone-500"}`} role="status">{draftMessage}</p>
            <div className="flex shrink-0 items-center gap-2">
              <details className="relative">
                <summary className="flex h-10 cursor-pointer list-none items-center border border-stone-300 bg-white px-3 text-sm font-medium text-stone-700">{copy.moreActions}</summary>
                <div className="absolute top-11 right-0 z-30 grid w-48 gap-1 border border-stone-200 bg-white p-1.5 shadow-lg">
                  <button type="button" onClick={() => void handleDownloadPdf()} disabled={isDownloadingPdf} className="flex min-h-10 items-center gap-2 px-3 text-left text-sm text-stone-700 hover:bg-stone-100 disabled:opacity-50">{isDownloadingPdf ? <SpinnerGap className="size-4 animate-spin" /> : <DownloadSimple className="size-4" />}{isDownloadingPdf ? copy.downloadingPdf : copy.downloadPdf}</button>
                  <button type="button" onClick={() => window.print()} className="flex min-h-10 items-center gap-2 px-3 text-left text-sm text-stone-700 hover:bg-stone-100"><Printer className="size-4" />{copy.print}</button>
                </div>
              </details>
              <Button type="submit" form="inventory-form" disabled={isSaving} className="h-10 px-3 text-sm">{isSaving && <SpinnerGap className="animate-spin" data-icon="inline-start" />}{isSaving ? copy.savingSheet : formId === undefined ? copy.saveSheet : copy.saveChanges}</Button>
            </div>
          </div>
        </div>

        <header className="flex flex-col gap-4 border-b-[3px] border-[#172033] pb-5 sm:flex-row sm:items-end sm:justify-between sm:pb-6">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-stone-500 uppercase">{pageTitle}</p>
            <h1 className="mt-2 font-heading text-3xl font-bold tracking-tight text-[#111a2c] sm:text-4xl">{house.name}</h1>
            <p className="mt-1 text-sm font-semibold text-slate-600">{copy.subtitle}</p>
          </div>
          <p className="border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold tracking-wider text-slate-600 uppercase">{copy.trackingSheet}</p>
        </header>

        {error && <div className="mt-5 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{error}</div>}

        {prefilledFromDate && formId === undefined && (
          <div className="mt-5 border border-blue-200 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-900">
            {copy.prefilledStart} ({formatDate(prefilledFromDate)}). {copy.prefilledEnd}
          </div>
        )}

        <form id="inventory-form" onSubmit={handleSubmit} className="mt-5 space-y-5 sm:mt-6 sm:space-y-6">
          <section className="grid gap-4 rounded border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-4" aria-label={copy.details}>
            <label className="grid gap-2 text-xs font-bold tracking-wide text-slate-600 uppercase">{copy.countDate}
              <input required type="date" value={details.count_date} onChange={(event) => updateDetails("count_date", event.target.value)} className={inputClassName("h-10 font-normal tracking-normal normal-case")} />
            </label>
            <fieldset className="grid content-start gap-2 text-xs font-bold tracking-wide text-slate-600 uppercase">
              <legend>{copy.operationType}</legend>
              <div className="flex flex-wrap gap-x-3 gap-y-2 pt-1">
                {operationOptions.map((operation) => (
                  <label key={operation.value} className="inline-flex items-center gap-1.5 text-sm font-normal tracking-normal text-stone-700 normal-case">
                    <input type="checkbox" checked={details.operation_types.includes(operation.value)} onChange={() => toggleOperation(operation.value)} className="size-4 accent-[#263f85]" />{operation.label}
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="grid gap-2 text-xs font-bold tracking-wide text-slate-600 uppercase">{copy.room}
              <input maxLength={255} value={details.room_division} onChange={(event) => updateDetails("room_division", event.target.value)} placeholder={copy.allRooms} className={inputClassName("h-10 font-normal tracking-normal normal-case")} />
            </label>
            <label className="grid gap-2 text-xs font-bold tracking-wide text-slate-600 uppercase">{copy.responsible}
              <input maxLength={255} value={details.responsible} onChange={(event) => updateDetails("responsible", event.target.value)} placeholder={copy.responsibleName} className={inputClassName("h-10 font-normal tracking-normal normal-case")} />
            </label>
          </section>

          {inventoryCategories.map((category, categoryIndex) => {
            const categoryLines = lines.filter((line) => line.category === category.id)
            const isExpanded = expandedCategory === category.id
            const categoryTitle = copy.categories[category.id]
            return (
              <section key={category.id} aria-label={`${categoryIndex + 1}. ${categoryTitle}`}>
                <div className="lg:hidden print:hidden">
                  <h2>
                    <button
                      type="button"
                      id={`category-${category.id}-mobile-trigger`}
                      aria-expanded={isExpanded}
                      aria-controls={`category-${category.id}-mobile-panel`}
                      onClick={() => setExpandedCategory(isExpanded ? null : category.id)}
                      className="flex min-h-14 w-full items-center gap-3 border-l-[6px] border-[#244488] bg-[#e0e7ff] px-3 py-2 text-left transition-colors hover:bg-[#d7e0ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#244488]"
                    >
                      <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-[#244488] text-sm font-bold text-white">{categoryIndex + 1}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-bold tracking-wide text-[#26417f]">{categoryTitle}</span>
                        <span className="mt-0.5 block text-xs font-medium text-slate-600">{categoryLines.length} {categoryLines.length === 1 ? copy.item : copy.items}</span>
                      </span>
                      <CaretDown className={`size-5 shrink-0 text-[#244488] transition-transform ${isExpanded ? "rotate-180" : ""}`} aria-hidden="true" />
                    </button>
                  </h2>
                  <div
                    id={`category-${category.id}-mobile-panel`}
                    role="region"
                    aria-labelledby={`category-${category.id}-mobile-trigger`}
                    hidden={!isExpanded}
                    className="space-y-3 border-x border-b border-slate-200 bg-slate-50 p-3"
                  >
                    {categoryLines.map((line) => (
                      <article key={line.clientKey} className="space-y-3 border border-slate-200 bg-white p-3 shadow-sm">
                        <div className="flex items-end gap-2">
                          <label className="min-w-0 flex-1 text-xs font-semibold text-slate-600">{copy.itemDescription}
                            <input id={`mobile-line-description-${line.clientKey}`} maxLength={255} value={translateInventoryDescription(line.description, language)} onChange={(event) => updateLine(line.clientKey, "description", event.target.value)} className="mt-1 h-11 w-full min-w-0 border border-slate-300 bg-white px-3 text-base font-semibold text-stone-800 outline-none focus:border-[#244488] focus:ring-2 focus:ring-[#244488]/10" />
                          </label>
                          <button type="button" onClick={() => removeLine(line.clientKey)} aria-label={`${copy.deleteItem} ${translateInventoryDescription(line.description, language) || copy.item}`} className="mb-0.5 inline-flex size-11 shrink-0 items-center justify-center text-stone-400 transition hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400">
                            <Trash className="size-5" aria-hidden="true" />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-3">
                          {quantityColumns.map((column) => {
                            const label = copy.mobileQuantities[column.field]
                            return (
                              <label key={column.field} className="block min-w-0 text-xs font-semibold leading-4 text-slate-600">
                                <span className="mb-1 block">{label}</span>
                                <input type="number" min={0} step={1} inputMode="numeric" aria-label={`${label}: ${translateInventoryDescription(line.description, language) || copy.item}`} value={line[column.field] ?? ""} onChange={(event) => updateLine(line.clientKey, column.field, event.target.value === "" ? null : Number(event.target.value))} className="h-11 w-full min-w-0 border border-slate-300 bg-white px-3 text-base text-stone-900 outline-none focus:border-[#244488] focus:ring-2 focus:ring-[#244488]/10" />
                              </label>
                            )
                          })}
                        </div>
                        <label className="block text-xs font-semibold text-slate-600">{copy.condition}
                          <textarea maxLength={4000} rows={2} value={line.status_observations} onChange={(event) => updateLine(line.clientKey, "status_observations", event.target.value)} placeholder={copy.conditionPlaceholder} className="mt-1 min-h-20 w-full resize-y border border-slate-300 bg-white px-3 py-2 text-base font-normal text-stone-900 outline-none placeholder:text-stone-400 focus:border-[#244488] focus:ring-2 focus:ring-[#244488]/10" />
                        </label>
                      </article>
                    ))}
                    {categoryLines.length === 0 && <p className="border border-dashed border-slate-300 bg-white px-4 py-5 text-center text-sm text-stone-500">{copy.noItems}</p>}
                    <button type="button" onClick={() => addLine(category.id)} className="inline-flex h-11 w-full items-center justify-center gap-2 border border-[#244488] bg-white px-4 text-sm font-semibold text-[#244488] transition hover:bg-[#f3f6ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#244488]">
                      <Plus className="size-4" weight="bold" aria-hidden="true" /> {copy.addLine}
                    </button>
                  </div>
                </div>
                <div className="hidden lg:block print:block">
                  <div className="flex flex-col gap-2 border-l-[6px] border-[#244488] bg-[#e0e7ff] px-4 py-2 sm:flex-row sm:items-center sm:justify-between">
                    <h2 id={`category-${category.id}`} className="text-sm font-bold tracking-wide text-[#26417f] sm:text-base">{categoryIndex + 1}. {categoryTitle}</h2>
                    <button type="button" onClick={() => addLine(category.id)} className="inline-flex items-center gap-1.5 self-start text-xs font-semibold text-[#244488] transition hover:text-[#132650] sm:self-auto print:hidden"><Plus className="size-4" weight="bold" aria-hidden="true" /> {copy.addLine}</button>
                  </div>
                  <div className="mt-2 overflow-x-auto border border-slate-200">
                    <table className="w-full min-w-[1100px] table-fixed border-collapse text-left text-sm">
                      <colgroup><col className="w-[30%]"/><col className="w-[11%]"/><col className="w-[11%]"/><col className="w-[11%]"/><col className="w-[11%]"/><col className="w-[22%]"/><col className="w-12 print:hidden"/></colgroup>
                      <thead className="bg-slate-100 text-[11px] leading-tight font-bold tracking-wide text-slate-600 uppercase">
                        <tr>
                          <th scope="col" className="border border-slate-200 px-3 py-3">{copy.itemDescription}</th>
                          {quantityColumns.map((column) => <th key={column.field} scope="col" className="border border-slate-200 px-2 py-3 text-center whitespace-pre-line">{column.label}</th>)}
                          <th scope="col" className="border border-slate-200 px-3 py-3">{copy.condition}</th>
                          <th scope="col" className="border border-slate-200 px-2 py-3 print:hidden"><span className="sr-only">{copy.removeItem}</span></th>
                        </tr>
                      </thead>
                      <tbody>
                        {categoryLines.map((line) => (
                          <tr key={line.clientKey} className="group">
                            <td className="border border-slate-200 p-1.5">
                              <input id={`desktop-line-description-${line.clientKey}`} aria-label={copy.itemDescription} maxLength={255} value={translateInventoryDescription(line.description, language)} onChange={(event) => updateLine(line.clientKey, "description", event.target.value)} className="h-9 w-full min-w-0 bg-transparent px-1.5 text-sm font-semibold text-stone-800 outline-none focus:bg-blue-50" />
                            </td>
                            {quantityColumns.map((column) => (
                              <td key={column.field} className="border border-slate-200 p-1.5">
                                <input aria-label={`${column.label.replace("\n", " ")}: ${translateInventoryDescription(line.description, language) || copy.item}`} type="number" min={0} step={1} value={line[column.field] ?? ""} onChange={(event) => updateLine(line.clientKey, column.field, event.target.value === "" ? null : Number(event.target.value))} className="h-9 w-full min-w-0 bg-transparent px-1 text-center outline-none focus:bg-blue-50" />
                              </td>
                            ))}
                            <td className="border border-slate-200 p-1.5">
                              <input aria-label={`${copy.condition}: ${translateInventoryDescription(line.description, language) || copy.item}`} maxLength={4000} value={line.status_observations} onChange={(event) => updateLine(line.clientKey, "status_observations", event.target.value)} placeholder={copy.condition} className="h-9 w-full min-w-0 bg-transparent px-1.5 text-sm outline-none placeholder:text-xs placeholder:text-stone-400 focus:bg-blue-50" />
                            </td>
                            <td className="border border-slate-200 p-1 text-center print:hidden">
                              <button type="button" onClick={() => removeLine(line.clientKey)} aria-label={`${copy.deleteItem} ${translateInventoryDescription(line.description, language) || copy.item}`} className="inline-flex size-8 items-center justify-center text-stone-400 transition hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"><Trash className="size-4" aria-hidden="true" /></button>
                            </td>
                          </tr>
                        ))}
                        {categoryLines.length === 0 && <tr><td colSpan={7} className="border border-slate-200 px-4 py-5 text-center text-sm text-stone-500">{copy.noItemsDesktop}</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            )
          })}

          <section aria-label={`5. ${copy.photosHeading}`}>
            <h2>
              <button
                type="button"
                id="tracking-photos-trigger"
                aria-expanded={expandedPhotos}
                aria-controls="tracking-photos-panel"
                onClick={() => setExpandedPhotos((expanded) => !expanded)}
                className="flex min-h-14 w-full items-center gap-3 border-l-[6px] border-[#244488] bg-[#e0e7ff] px-3 py-2 text-left transition-colors hover:bg-[#d7e0ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#244488]"
              >
                <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-[#244488] text-sm font-bold text-white">5</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold tracking-wide text-[#26417f]">{copy.photosHeading}</span>
                  <span className="mt-0.5 block text-xs font-medium text-slate-600">{existingPhotos.length - photosToDelete.length + pendingPhotos.length} {existingPhotos.length - photosToDelete.length + pendingPhotos.length === 1 ? copy.photoSingular : copy.photosCount}</span>
                </span>
                <CaretDown className={`size-5 shrink-0 text-[#244488] transition-transform ${expandedPhotos ? "rotate-180" : ""}`} aria-hidden="true" />
              </button>
            </h2>
            <div id="tracking-photos-panel" role="region" aria-labelledby="tracking-photos-trigger" hidden={!expandedPhotos} className="space-y-4 border-x border-b border-slate-200 bg-slate-50 p-3 sm:p-4">
              <p className="text-xs leading-5 text-stone-600">{copy.photosHelp}</p>
              <input ref={cameraInputRef} className="sr-only" type="file" accept="image/*" capture="environment" onChange={(event) => { addPhotos(event.target.files); event.target.value = "" }} aria-label={copy.takePhoto} />
              <input ref={galleryInputRef} className="sr-only" type="file" accept="image/*" multiple onChange={(event) => { addPhotos(event.target.files); event.target.value = "" }} aria-label={copy.choosePhotos} />
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => cameraInputRef.current?.click()} disabled={existingPhotos.length - photosToDelete.length + pendingPhotos.length >= 12} className="inline-flex min-h-11 w-full min-w-0 items-center justify-center gap-2 border border-stone-300 bg-white px-2 py-2 text-xs font-medium text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"><Camera className="size-4 shrink-0" aria-hidden="true" /><span className="min-w-0 text-center leading-tight">{copy.takePhoto}</span></button>
                <button type="button" onClick={() => galleryInputRef.current?.click()} disabled={existingPhotos.length - photosToDelete.length + pendingPhotos.length >= 12} className="inline-flex min-h-11 w-full min-w-0 items-center justify-center gap-2 border border-stone-300 bg-white px-2 py-2 text-xs font-medium text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"><ImageSquare className="size-4 shrink-0" aria-hidden="true" /><span className="min-w-0 text-center leading-tight">{copy.choosePhotos}</span></button>
              </div>
              {existingPhotos.length || pendingPhotos.length ? <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 md:grid-cols-5 lg:grid-cols-6">
                {existingPhotos.map((photo) => {
                  const willDelete = photosToDelete.includes(photo.id)
                  const photoUrl = inventoryFormPhotoUrl(formId ?? createdFormId ?? 0, photo.id)
                  return <div key={`saved-${photo.id}`} className={`relative aspect-[4/3] overflow-hidden border border-stone-200 bg-stone-100 ${willDelete ? "opacity-50" : ""}`}>
                    <button type="button" onClick={() => setFullPhoto({ src: photoUrl, alt: copy.photoAlt })} aria-label={copy.viewFullPhoto} className="absolute inset-0 block size-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#244488]">
                      <Image src={photoUrl} alt={copy.photoAlt} fill unoptimized sizes="(max-width: 640px) 33vw, 16vw" className="object-cover" />
                      <span className="pointer-events-none absolute right-1 bottom-1 left-1 truncate bg-white/90 px-1 py-1 text-[9px] font-medium text-stone-700 sm:text-[10px]">{copy.viewFullPhoto}</span>
                    </button>
                    {willDelete ? <div className="absolute inset-0 flex items-center justify-center bg-white/70 text-xs font-semibold text-stone-800">{copy.removePhoto}</div> : null}
                    <button type="button" onClick={() => togglePhotoRemoval(photo.id)} aria-label={willDelete ? copy.restorePhoto : copy.removePhoto} title={willDelete ? copy.restorePhoto : copy.removePhoto} className="absolute top-1 right-1 z-10 inline-flex size-7 items-center justify-center rounded-full bg-white/95 text-stone-700 shadow hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-700 sm:top-2 sm:right-2 sm:size-8">{willDelete ? <X className="size-4" aria-hidden="true" /> : <Trash className="size-4" aria-hidden="true" />}</button>
                  </div>
                })}
                {pendingPhotos.map((photo) => <div key={photo.clientKey} className="relative aspect-[4/3] overflow-hidden border border-stone-200 bg-stone-100">
                  <button type="button" onClick={() => setFullPhoto({ src: photo.previewUrl, alt: copy.photoAlt })} aria-label={copy.viewFullPhoto} className="absolute inset-0 block size-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#244488]">
                    <Image src={photo.previewUrl} alt={copy.photoAlt} fill unoptimized sizes="(max-width: 640px) 33vw, 16vw" className="object-cover" />
                    <span className="pointer-events-none absolute right-1 bottom-1 left-1 truncate bg-white/90 px-1 py-1 text-[9px] font-medium text-stone-700 sm:text-[10px]">{photo.file.name}</span>
                  </button>
                  <button type="button" onClick={() => removePendingPhoto(photo)} aria-label={copy.removePhoto} title={copy.removePhoto} className="absolute top-1 right-1 z-10 inline-flex size-7 items-center justify-center rounded-full bg-white/95 text-stone-700 shadow hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-700 sm:top-2 sm:right-2 sm:size-8"><X className="size-4" aria-hidden="true" /></button>
                </div>)}
              </div> : <p className="border border-dashed border-slate-300 bg-white px-4 py-5 text-center text-sm text-stone-500">{copy.noPhotos}</p>}
              {hasPendingPhotoChanges ? <div className="flex flex-col gap-2 border-t border-slate-200 pt-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs leading-5 text-stone-600">{copy.savePhotosHelp}</p>
                {formId !== undefined || createdFormId !== null
                  ? <button type="button" onClick={() => void savePhotoChanges()} disabled={isSaving} className="inline-flex h-10 w-full items-center justify-center gap-2 bg-stone-900 px-4 text-sm font-semibold text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto">{isSaving ? <SpinnerGap className="size-4 animate-spin" aria-hidden="true" /> : <FloppyDisk className="size-4" aria-hidden="true" />}{copy.savePhotos}</button>
                  : <button type="submit" form="inventory-form" disabled={isSaving} className="inline-flex h-10 w-full items-center justify-center gap-2 bg-stone-900 px-4 text-sm font-semibold text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto">{isSaving ? <SpinnerGap className="size-4 animate-spin" aria-hidden="true" /> : <FloppyDisk className="size-4" aria-hidden="true" />}{copy.saveSheetAndPhotos}</button>}
              </div> : null}
              {photoSavedNotice ? <p className="text-sm font-medium text-emerald-700" role="status">{photoSavedNotice}</p> : null}
            </div>
          </section>

          <aside className="border-l-2 border-red-600 bg-red-50 px-3 py-2 text-[11px] leading-4 text-red-800 sm:border-l-4 sm:px-4 sm:py-3 sm:text-sm sm:leading-6">
            <strong className="font-bold uppercase">{copy.noticeTitle}</strong>{" "}
            <span className="sm:hidden">{copy.noticeMobile}</span>
            <span className="hidden sm:inline">{copy.noticeDesktop}</span>
          </aside>

          <section className="rounded border border-slate-200 bg-slate-50 p-4 sm:p-5" aria-labelledby="validation-title">
            <h2 id="validation-title" className="text-sm font-bold tracking-wide text-[#26417f] uppercase">{copy.validation}</h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-3">
              <label className="grid content-end gap-2 text-center text-xs font-semibold text-slate-600">{copy.countedBy}
                <input maxLength={255} value={details.counter_name} onChange={(event) => updateDetails("counter_name", event.target.value)} className="h-9 border-0 border-b border-slate-400 bg-transparent px-2 text-center text-sm font-normal text-stone-900 outline-none focus:border-[#244488]" />
              </label>
              <label className="grid content-end gap-2 text-center text-xs font-semibold text-slate-600">{copy.signature}
                <input maxLength={255} value={details.responsible_signature} onChange={(event) => updateDetails("responsible_signature", event.target.value)} className="h-9 border-0 border-b border-slate-400 bg-transparent px-2 text-center text-sm font-normal text-stone-900 outline-none focus:border-[#244488]" />
              </label>
              <label className="grid content-end gap-2 text-center text-xs font-semibold text-slate-600">{copy.checkedBy}
                <input maxLength={255} value={details.checked_by} onChange={(event) => updateDetails("checked_by", event.target.value)} className="h-9 border-0 border-b border-slate-400 bg-transparent px-2 text-center text-sm font-normal text-stone-900 outline-none focus:border-[#244488]" />
              </label>
            </div>
          </section>

          <div className="flex flex-col-reverse gap-3 border-t border-stone-200 pt-5 sm:flex-row sm:justify-end print:hidden">
            <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={navigateBack}>{copy.cancel}</Button>
            <Button type="submit" className="w-full sm:w-auto" disabled={isSaving}>{isSaving && <SpinnerGap className="animate-spin" data-icon="inline-start" />}{isSaving ? copy.savingSheet : formId === undefined ? copy.saveSheet : copy.saveChanges}</Button>
          </div>
        </form>
      </div>
      {fullPhoto ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/90 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label={copy.photoAlt} onClick={() => setFullPhoto(null)}>
        <button type="button" aria-label={copy.closePhoto} onClick={() => setFullPhoto(null)} className="absolute top-3 right-3 z-10 inline-flex size-11 items-center justify-center rounded-full bg-white text-stone-900 shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:top-5 sm:right-5"><X className="size-5" aria-hidden="true" /></button>
        <div className="relative h-[85svh] w-full max-w-6xl" onClick={(event) => event.stopPropagation()}>
          <Image src={fullPhoto.src} alt={fullPhoto.alt} fill unoptimized sizes="100vw" className="object-contain" />
        </div>
      </div> : null}
    </main>
  )
}
