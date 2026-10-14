"use client"

import { FormEvent, useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { DotsThree, House, MagnifyingGlass, MapPin, PencilSimple, Plus, SpinnerGap, Trash, X } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import { useLanguage } from "@/components/language-provider"
import { AccountMenu } from "@/components/account-menu"
import { LanguageSwitcher } from "@/components/language-switcher"
import { SuccessToast } from "@/components/success-toast"
import { createHouse, deleteHouse, getHouses, type House as HouseRecord, type HouseColor, updateHouse, updateHouseColor } from "@/lib/api"

const pageCopy = {
  pt: {
    title: "Madeira cleaning & care", subtitle: "Mantenha os seus alojamentos Airbnb e respetivas moradas organizados num só lugar.", addHouse: "Adicionar casa",
    search: "Pesquisar casas por nome", dismiss: "Fechar", loading: "A carregar casas", noHouses: "Ainda não existem casas",
    noHousesHelp: "Adicione a primeira propriedade para começar a organizar o seu portefólio Airbnb.", noMatches: "Nenhuma casa encontrada", noMatchesHelp: "Experimente pesquisar outro nome.",
    houses: "Casas", open: "Abrir", actions: "Ações para", editDetails: "Editar dados", changeColor: "Alterar cor", chooseColor: "Escolher cor da casa", houseColor: "cor da casa", deleteHouse: "Eliminar casa",
    editProperty: "Editar propriedade", newProperty: "Nova propriedade", editHouse: "Editar casa", closeDialog: "Fechar janela", houseName: "Nome da casa", houseNamePlaceholder: "ex.: Refúgio à beira-mar", address: "Morada", addressPlaceholder: "ex.: Rua do Mar, 12, Funchal",
    cancel: "Cancelar", saving: "A guardar", saveChanges: "Guardar alterações", deleteProperty: "Eliminar propriedade", deleteQuestion: "Eliminar", deleteDescription: "Esta casa e todas as suas fichas serão eliminadas permanentemente. Esta ação não pode ser anulada.", deleting: "A eliminar", deleteConfirm: "Eliminar casa",
    apiError: "Não foi possível ligar à API. Confirme que o servidor está a funcionar.", saveError: "Não foi possível guardar esta casa. Tente novamente.", colorError: "Não foi possível alterar a cor da casa. Tente novamente.", deleteError: "Não foi possível eliminar esta casa. Tente novamente.", created: "Casa adicionada com sucesso.", updated: "Dados da casa atualizados.", colorUpdated: "Cor da casa atualizada.", deleted: "Casa eliminada.", close: "Fechar",
  },
  en: {
    title: "Madeira cleaning & care", subtitle: "Keep your Airbnb homes and their addresses together in one place.", addHouse: "Add a house",
    search: "Search houses by name", dismiss: "Dismiss", loading: "Loading houses", noHouses: "No houses yet",
    noHousesHelp: "Add your first property to begin building your Airbnb portfolio.", noMatches: "No matching houses", noMatchesHelp: "Try a different house name.",
    houses: "Houses", open: "Open", actions: "Actions for", editDetails: "Edit details", changeColor: "Change color", chooseColor: "Choose house color", houseColor: "house color", deleteHouse: "Delete house",
    editProperty: "Edit property", newProperty: "New property", editHouse: "Edit house", closeDialog: "Close dialog", houseName: "House name", houseNamePlaceholder: "e.g. Seaside retreat", address: "Address", addressPlaceholder: "e.g. 12 Ocean Drive, Miami",
    cancel: "Cancel", saving: "Saving", saveChanges: "Save changes", deleteProperty: "Delete property", deleteQuestion: "Delete", deleteDescription: "This house and all its tracking sheets will be permanently removed. This action cannot be undone.", deleting: "Deleting", deleteConfirm: "Delete house",
    apiError: "Couldn’t reach the API. Make sure the backend is running.", saveError: "Couldn’t save this house. Please try again.", colorError: "Couldn’t update the house color. Please try again.", deleteError: "Couldn’t delete this house. Please try again.", created: "House added successfully.", updated: "House details updated.", colorUpdated: "House color updated.", deleted: "House deleted.", close: "Close",
  },
} as const

const houseColorStyles: Record<HouseColor, string> = {
  blue: "bg-[#114dad]/55 text-white/90",
  wine: "bg-[#8a1c2e]/55 text-white/90",
  green: "bg-[#1d5e35]/55 text-white/90",
  cyan: "bg-[#48afcf]/55 text-white/90",
  purple: "bg-[#6d239e]/55 text-white/90",
  red: "bg-[#d11717]/55 text-white/90",
}

const colorSwatches: Record<HouseColor, string> = {
  blue: "bg-[#114dad]/75",
  wine: "bg-[#8a1c2e]/75",
  green: "bg-[#1d5e35]/75",
  cyan: "bg-[#48afcf]/75",
  purple: "bg-[#6d239e]/75",
  red: "bg-[#d11717]/75",
}

export default function Page() {
  const { language } = useLanguage()
  const copy = pageCopy[language]
  const [houses, setHouses] = useState<HouseRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const dismissSuccess = useCallback(() => setSuccess(null), [])
  const [colorPickerHouseId, setColorPickerHouseId] = useState<number | null>(null)
  const [menuHouseId, setMenuHouseId] = useState<number | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [editingHouse, setEditingHouse] = useState<HouseRecord | null>(null)
  const [houseToDelete, setHouseToDelete] = useState<HouseRecord | null>(null)
  const [name, setName] = useState("")
  const [address, setAddress] = useState("")
  const [searchQuery, setSearchQuery] = useState("")

  const filteredHouses = houses.filter((house) =>
    house.name.toLocaleLowerCase().includes(searchQuery.trim().toLocaleLowerCase())
  )

  useEffect(() => {
    let isActive = true

    void getHouses()
      .then((loadedHouses) => {
        if (isActive) setHouses(loadedHouses)
      })
      .catch(() => {
        if (isActive) setError(pageCopy[language].apiError)
      })
      .finally(() => {
        if (isActive) setIsLoading(false)
      })

    return () => {
      isActive = false
    }
  }, [language])

  useEffect(() => {
    if (menuHouseId === null) return

    function handlePointerDown(event: PointerEvent) {
      const target = event.target
      if (target instanceof Node && menuRef.current?.contains(target)) return

      setMenuHouseId(null)
      setColorPickerHouseId(null)
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuHouseId(null)
        setColorPickerHouseId(null)
      }
    }

    document.addEventListener("pointerdown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [menuHouseId])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    setError(null)

    try {
      if (editingHouse) {
        const updatedHouse = await updateHouse(editingHouse.id, { name, address })
        setHouses((currentHouses) => currentHouses.map((house) => house.id === updatedHouse.id ? updatedHouse : house))
        setSuccess(copy.updated)
      } else {
        const house = await createHouse({ name, address })
        setHouses((currentHouses) => [house, ...currentHouses])
        setSuccess(copy.created)
      }
      setName("")
      setAddress("")
      setEditingHouse(null)
      setIsDialogOpen(false)
    } catch {
      setError(copy.saveError)
    } finally {
      setIsSaving(false)
    }
  }

  async function selectHouseColor(id: number, color: HouseColor) {
    setError(null)
    try {
      const updatedHouse = await updateHouseColor(id, color)
      setHouses((currentHouses) => currentHouses.map((house) => house.id === id ? updatedHouse : house))
      setColorPickerHouseId(null)
      setMenuHouseId(null)
      setSuccess(copy.colorUpdated)
    } catch {
      setError(copy.colorError)
    }
  }

  function openCreateDialog() {
    setEditingHouse(null)
    setName("")
    setAddress("")
    setMenuHouseId(null)
    setIsDialogOpen(true)
  }

  function openEditDialog(house: HouseRecord) {
    setEditingHouse(house)
    setName(house.name)
    setAddress(house.address)
    setMenuHouseId(null)
    setIsDialogOpen(true)
  }

  function closeHouseDialog() {
    setIsDialogOpen(false)
    setEditingHouse(null)
  }

  async function confirmDeleteHouse() {
    if (!houseToDelete) return

    setIsDeleting(true)
    setError(null)
    try {
      await deleteHouse(houseToDelete.id)
      setHouses((currentHouses) => currentHouses.filter((house) => house.id !== houseToDelete.id))
      setHouseToDelete(null)
      setSuccess(copy.deleted)
    } catch {
      setError(copy.deleteError)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <main className="min-h-svh bg-stone-100 p-2 text-stone-950 sm:p-6">
      <div className="mx-auto min-h-[calc(100svh-1rem)] max-w-6xl border border-stone-200 bg-stone-50 px-4 py-8 shadow-sm sm:min-h-[calc(100svh-3rem)] sm:px-10 sm:py-12">
        <header className="flex flex-col items-center border-b border-stone-200 pb-8 text-center sm:pb-10">
          <div className="flex w-full items-center justify-end gap-3">
            <LanguageSwitcher />
            <AccountMenu />
          </div>
          <div className="flex max-w-2xl flex-col items-center">
            <Image src="/cleaning-care-mark.png" alt="Madeira Cleaning & Care logo mark" width={1000} height={777} className="mb-2 h-16 w-auto mix-blend-multiply object-contain sm:h-[72px]" />
            <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-5xl">{copy.title}</h1>
            <p className="mt-3 max-w-lg text-sm leading-6 text-stone-600 sm:text-base sm:leading-7">{copy.subtitle}</p>
          </div>
          <div className="mt-6 flex w-full flex-col items-center gap-3 sm:mt-7">
            <Button className="w-full sm:w-auto" onClick={openCreateDialog}>
              <Plus weight="bold" data-icon="inline-start" />
              {copy.addHouse}
            </Button>
          </div>
          <label className="relative mt-4 w-full max-w-56 text-left">
            <span className="sr-only">{copy.search}</span>
            <MagnifyingGlass className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-stone-500" aria-hidden="true" />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={copy.search}
              className="h-10 w-full border border-stone-300 bg-white py-2 pr-3 pl-10 text-sm outline-none placeholder:text-stone-500 focus:border-stone-800"
            />
          </label>
        </header>

        {error && (
          <div className="mt-6 flex flex-col items-stretch justify-between gap-2 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 sm:flex-row sm:items-center sm:gap-4" role="alert">
            {error}
            <Button className="self-end sm:self-auto" variant="ghost" size="xs" onClick={() => setError(null)}>{copy.dismiss}</Button>
          </div>
        )}

        {isLoading ? (
          <div className="flex min-h-72 items-center justify-center text-stone-500">
            <SpinnerGap className="mr-2 size-5 animate-spin" /> {copy.loading}
          </div>
        ) : houses.length === 0 ? (
          <section className="mt-8 flex min-h-72 flex-col items-center justify-center border border-dashed border-stone-300 bg-white px-4 py-8 text-center shadow-sm sm:mt-10 sm:min-h-80 sm:px-6">
            <div className="flex size-12 items-center justify-center rounded-full bg-stone-100"><House className="size-6" /></div>
            <h2 className="mt-5 text-xl font-semibold">{copy.noHouses}</h2>
            <p className="mt-2 max-w-sm text-sm leading-6 text-stone-600">{copy.noHousesHelp}</p>
            <Button className="mt-6 w-full sm:w-auto" onClick={openCreateDialog}><Plus weight="bold" data-icon="inline-start" />{copy.addHouse}</Button>
          </section>
        ) : filteredHouses.length === 0 ? (
          <section className="mt-8 flex min-h-72 flex-col items-center justify-center border border-dashed border-stone-300 bg-white px-4 py-8 text-center shadow-sm sm:mt-10 sm:min-h-80 sm:px-6">
            <MagnifyingGlass className="size-7 text-stone-500" aria-hidden="true" />
            <h2 className="mt-4 text-xl font-semibold">{copy.noMatches}</h2>
            <p className="mt-2 max-w-sm text-sm leading-6 text-stone-600">{copy.noMatchesHelp}</p>
          </section>
        ) : (
          <section className="mx-auto mt-8 grid max-w-5xl gap-4 sm:mt-10 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3" aria-label={copy.houses}>
            {filteredHouses.map((house) => (
              <article key={house.id} className="relative flex min-h-48 flex-col items-center justify-center border border-stone-300 bg-white p-5 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:min-h-52 sm:p-6">
                <Link href={`/houses/${house.id}`} className="absolute inset-0 z-0 flex flex-col items-center justify-center p-5 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stone-800" aria-label={`${copy.open} ${house.name}`}>
                  <span className={`flex size-10 items-center justify-center rounded-full shadow-md shadow-stone-400/25 saturate-75 ${houseColorStyles[house.color]}`} aria-hidden="true"><House className="size-5" weight="fill" /></span>
                  <span className="mt-5 text-lg font-semibold">{house.name}</span>
                  <span className="mt-2 flex items-start justify-center gap-2 text-sm leading-6 text-stone-600"><MapPin className="mt-1 size-4 shrink-0" aria-hidden="true" />{house.address}</span>
                </Link>
                <div className="absolute top-3 right-3 z-30" ref={menuHouseId === house.id ? menuRef : null}>
                  <button
                    type="button"
                    className={`flex size-9 items-center justify-center rounded-full shadow-sm ring-1 transition duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-500 ${menuHouseId === house.id ? "bg-stone-900 text-white ring-stone-900 shadow-md" : "bg-white/90 text-stone-600 ring-stone-200/80 backdrop-blur hover:bg-white hover:text-stone-950 hover:shadow-md"}`}
                    aria-label={`${copy.actions} ${house.name}`}
                    aria-haspopup="menu"
                    aria-expanded={menuHouseId === house.id}
                    onClick={() => {
                      setColorPickerHouseId(null)
                      setMenuHouseId((currentId) => currentId === house.id ? null : house.id)
                    }}
                  >
                    <DotsThree className="size-5" weight="bold" />
                  </button>
                  {menuHouseId === house.id && (
                    <div className="absolute top-10 -right-2 w-44 origin-top-right rounded-xl border border-stone-200/80 bg-white p-1 text-left shadow-[0_16px_36px_-14px_rgba(28,25,23,0.4)] ring-1 ring-black/5 animate-in fade-in zoom-in-95 slide-in-from-top-1 duration-150" role="menu">
                      <button type="button" className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-[13px] font-medium text-stone-700 transition-colors hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400" role="menuitem" onClick={() => openEditDialog(house)}>
                        <PencilSimple className="size-4 shrink-0 text-stone-500" aria-hidden="true" />
                        {copy.editDetails}
                      </button>
                      <div className="mx-2 my-0.5 h-px bg-stone-100" aria-hidden="true" />
                      <button type="button" className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-[13px] font-medium text-stone-700 transition-colors hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400" role="menuitem" aria-expanded={colorPickerHouseId === house.id} onClick={() => setColorPickerHouseId((currentId) => currentId === house.id ? null : house.id)}>
                        <House className="size-4 shrink-0 text-stone-500" aria-hidden="true" />
                        {copy.changeColor}
                      </button>
                      {colorPickerHouseId === house.id && (
                        <div className="grid grid-cols-6 gap-1 px-2 py-2" role="group" aria-label={copy.chooseColor}>
                          {(Object.keys(colorSwatches) as HouseColor[]).map((color) => (
                            <button key={color} type="button" className={`size-5 rounded-full shadow-inner saturate-75 ring-offset-2 ${colorSwatches[color]} ${house.color === color ? "ring-2 ring-stone-800" : ""}`} aria-label={`${color} ${copy.houseColor}`} aria-pressed={house.color === color} onClick={() => void selectHouseColor(house.id, color)} />
                          ))}
                        </div>
                      )}
                      <div className="mx-2 my-0.5 h-px bg-stone-100" aria-hidden="true" />
                      <button type="button" className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-[13px] font-medium text-red-700 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300" role="menuitem" onClick={() => { setHouseToDelete(house); setMenuHouseId(null) }}>
                        <Trash className="size-4 shrink-0" aria-hidden="true" />
                        {copy.deleteHouse}
                      </button>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </section>
        )}
      </div>

      {isDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-stone-950/35 sm:items-center sm:p-4" role="presentation">
          <div className="max-h-[90svh] w-full max-w-md overflow-y-auto rounded-t-xl bg-white p-5 shadow-xl sm:rounded-none sm:p-6" role="dialog" aria-modal="true" aria-labelledby="house-dialog-title">
            <div className="flex items-start justify-between gap-6">
              <div><p className="text-xs font-semibold tracking-[0.16em] text-stone-500 uppercase">{editingHouse ? copy.editProperty : copy.newProperty}</p><h2 id="house-dialog-title" className="mt-2 text-2xl font-semibold">{editingHouse ? copy.editHouse : copy.addHouse}</h2></div>
              <Button variant="ghost" size="icon-sm" aria-label={copy.closeDialog} onClick={closeHouseDialog}><X className="size-5" /></Button>
            </div>
            <form className="mt-6 space-y-5 sm:mt-7" onSubmit={handleSubmit}>
              <label className="grid gap-2 text-sm font-medium">{copy.houseName}<input required maxLength={255} value={name} onChange={(event) => setName(event.target.value)} placeholder={copy.houseNamePlaceholder} className="h-11 border border-stone-300 bg-white px-3 text-sm outline-none focus:border-stone-800" /></label>
              <label className="grid gap-2 text-sm font-medium">{copy.address}<input required maxLength={500} value={address} onChange={(event) => setAddress(event.target.value)} placeholder={copy.addressPlaceholder} className="h-11 border border-stone-300 bg-white px-3 text-sm outline-none focus:border-stone-800" /></label>
              <div className="flex flex-col-reverse justify-end gap-3 pt-2 sm:flex-row"><Button className="w-full sm:w-auto" type="button" variant="outline" onClick={closeHouseDialog}>{copy.cancel}</Button><Button className="w-full sm:w-auto" type="submit" disabled={isSaving}>{isSaving && <SpinnerGap className="animate-spin" data-icon="inline-start" />}{isSaving ? copy.saving : editingHouse ? copy.saveChanges : copy.addHouse}</Button></div>
            </form>
          </div>
        </div>
      )}

      {houseToDelete && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-stone-950/35 sm:items-center sm:p-4" role="presentation">
          <div className="w-full max-w-sm rounded-t-xl bg-white p-5 shadow-xl sm:rounded-none sm:p-6" role="alertdialog" aria-modal="true" aria-labelledby="delete-house-title" aria-describedby="delete-house-description">
            <p className="text-xs font-semibold tracking-[0.16em] text-red-700 uppercase">{copy.deleteProperty}</p>
            <h2 id="delete-house-title" className="mt-2 text-2xl font-semibold">{copy.deleteQuestion} {houseToDelete.name}?</h2>
            <p id="delete-house-description" className="mt-3 text-sm leading-6 text-stone-600">{copy.deleteDescription}</p>
            <div className="mt-6 flex flex-col-reverse justify-end gap-3 sm:flex-row">
              <Button className="w-full sm:w-auto" type="button" variant="outline" disabled={isDeleting} onClick={() => setHouseToDelete(null)}>{copy.cancel}</Button>
              <Button className="w-full sm:w-auto" type="button" variant="destructive" disabled={isDeleting} onClick={() => void confirmDeleteHouse()}>{isDeleting && <SpinnerGap className="animate-spin" data-icon="inline-start" />}{isDeleting ? copy.deleting : copy.deleteConfirm}</Button>
            </div>
          </div>
        </div>
      )}
      <SuccessToast message={success} onDismiss={dismissSuccess} closeLabel={copy.close} />
    </main>
  )
}
