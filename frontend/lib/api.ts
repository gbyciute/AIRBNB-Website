import axios from "axios"

export type HouseColor = "blue" | "wine" | "green" | "cyan" | "purple" | "red"

export type House = {
  id: number
  name: string
  address: string
  color: HouseColor
}

export type CreateHouseInput = Omit<House, "id" | "color">

export type InventoryOperation = "check_in" | "check_out" | "laundry"
export type InventoryCategory = "bed_linen" | "bath_linen" | "kitchen_cleaning" | "decorative_textiles"

export type InventoryFormLineInput = {
  category: InventoryCategory
  description: string
  stock_total: number | null
  current_quantity: number | null
  outgoing_laundry: number | null
  incoming_clean: number | null
  status_observations: string
}

export type InventoryFormLine = InventoryFormLineInput & {
  id: number
  sort_order: number
}

export type InventoryFormInput = {
  count_date: string
  operation_types: InventoryOperation[]
  room_division: string
  responsible: string
  counter_name: string
  responsible_signature: string
  checked_by: string
  lines: InventoryFormLineInput[]
}

export type InventoryForm = Omit<InventoryFormInput, "lines"> & {
  id: number
  house_id: number
  created_at: string
  updated_at: string
  lines: InventoryFormLine[]
}

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000",
})

export async function getHouses(): Promise<House[]> {
  const response = await api.get<House[]>("/houses")
  return response.data
}

export async function getHouse(id: number): Promise<House> {
  const response = await api.get<House>(`/houses/${id}`)
  return response.data
}

export async function getInventoryForms(houseId: number): Promise<InventoryForm[]> {
  const response = await api.get<InventoryForm[]>(`/houses/${houseId}/inventory-forms`)
  return response.data
}

export async function createInventoryForm(houseId: number, input: InventoryFormInput): Promise<InventoryForm> {
  const response = await api.post<InventoryForm>(`/houses/${houseId}/inventory-forms`, input)
  return response.data
}

export async function getInventoryForm(formId: number): Promise<InventoryForm> {
  const response = await api.get<InventoryForm>(`/inventory-forms/${formId}`)
  return response.data
}

export async function updateInventoryForm(formId: number, input: InventoryFormInput): Promise<InventoryForm> {
  const response = await api.put<InventoryForm>(`/inventory-forms/${formId}`, input)
  return response.data
}

export async function deleteInventoryForm(formId: number): Promise<void> {
  await api.delete(`/inventory-forms/${formId}`)
}

export function downloadInventoryFormPdf(
  houseId: number,
  input: InventoryFormInput,
  language: "pt" | "en",
): void {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000"
  const form = document.createElement("form")
  form.method = "POST"
  form.action = `${baseUrl}/houses/${houseId}/inventory-forms/pdf-download`
  form.hidden = true

  const payloadField = document.createElement("input")
  payloadField.type = "hidden"
  payloadField.name = "payload"
  payloadField.value = JSON.stringify(input)

  const languageField = document.createElement("input")
  languageField.type = "hidden"
  languageField.name = "language"
  languageField.value = language

  form.append(payloadField, languageField)
  document.body.appendChild(form)
  form.submit()
  window.setTimeout(() => form.remove(), 0)
}

export async function createHouse(input: CreateHouseInput): Promise<House> {
  const response = await api.post<House>("/houses", input)
  return response.data
}

export async function updateHouseColor(id: number, color: HouseColor): Promise<House> {
  const response = await api.patch<House>(`/houses/${id}/color`, { color })
  return response.data
}

export async function updateHouse(id: number, input: CreateHouseInput): Promise<House> {
  const response = await api.patch<House>(`/houses/${id}`, input)
  return response.data
}

export async function deleteHouse(id: number): Promise<void> {
  await api.delete(`/houses/${id}`)
}
