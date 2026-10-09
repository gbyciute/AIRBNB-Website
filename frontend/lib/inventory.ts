import type { InventoryCategory, InventoryFormLineInput } from "@/lib/api"
import type { Language } from "@/components/language-provider"

export const inventoryCategories: { id: InventoryCategory; title: string; items: string[] }[] = [
  {
    id: "bed_linen",
    title: "1. TÊXTEIS DE CAMA (QUARTOS)",
    items: [
      "Lençóis de Baixo (Casal / King)",
      "Lençóis de Baixo (Solteiro)",
      "Lençóis de Cima / Camas Casal",
      "Lençóis de Cima / Solteiro",
      "Fronhas de Almofada (Padrão)",
      "Almofadas de Cama (Enchimento)",
      "Protectores de Colchão (Casal)",
      "Protectores de Almofada",
      "Colchas de Cama (Leves)",
      "Coberturas de Cama / Edredões",
      "Mantas Extra / Manta de Sofá",
    ],
  },
  {
    id: "bath_linen",
    title: "2. TÊXTEIS DE BANHO",
    items: [
      "Toalhas Grandes (Banho / Lençol)",
      "Toalhas Médias (Rosto)",
      "Toalhas Pequenas (Mãos / Social)",
      "Tapetes de Banho (Pés)",
      "Roupões de Banho",
      "Toalhas de Piscina / Praia",
    ],
  },
  {
    id: "kitchen_cleaning",
    title: "3. TÊXTEIS DE COZINHA & LIMPEZA",
    items: [
      "Panos de Prato / Louça",
      "Toalhas de Mesa (Pano)",
      "Pega-monstros / Luvas do Forno",
      "Panos de Limpeza / Microfibras",
      "Aventais de Cozinha",
    ],
  },
  {
    id: "decorative_textiles",
    title: "4. DECORAÇÃO, ACESSÓRIOS & TÊXTEIS DECORATIVOS",
    items: [
      "Almofadas Decorativas (Sala/Quartos)",
      "Capas de Almofada Decorativa",
      "Mantas Decorativas (Xailes de Sofá)",
      "Cortinados / Cortinas de Sala e Quarto",
      "Tapetes Decorativos Pequenos / Passadeiras",
      "Sacos de Lavandaria em Pano",
    ],
  },
]

export function createTemplateLines(): InventoryFormLineInput[] {
  return inventoryCategories.flatMap((category) =>
    category.items.map((description) => ({
      category: category.id,
      description,
      stock_total: null,
      current_quantity: null,
      outgoing_laundry: null,
      incoming_clean: null,
      status_observations: "",
    }))
  )
}

const englishDescriptions: Record<string, string> = {
  "Lençóis de Baixo (Casal / King)": "Fitted Sheets (Double / King)",
  "Lençóis de Baixo (Solteiro)": "Fitted Sheets (Single)",
  "Lençóis de Cima / Camas Casal": "Top Sheets / Double Beds",
  "Lençóis de Cima / Solteiro": "Top Sheets / Single Beds",
  "Fronhas de Almofada (Padrão)": "Pillowcases (Standard)",
  "Almofadas de Cama (Enchimento)": "Bed Pillows (Filling)",
  "Protectores de Colchão (Casal)": "Mattress Protectors (Double)",
  "Protectores de Almofada": "Pillow Protectors",
  "Colchas de Cama (Leves)": "Light Bedspreads",
  "Coberturas de Cama / Edredões": "Bed Covers / Duvets",
  "Mantas Extra / Manta de Sofá": "Extra Blankets / Sofa Throws",
  "Toalhas Grandes (Banho / Lençol)": "Large Towels (Bath / Bath Sheet)",
  "Toalhas Médias (Rosto)": "Medium Towels (Face)",
  "Toalhas Pequenas (Mãos / Social)": "Small Towels (Hand / Guest)",
  "Tapetes de Banho (Pés)": "Bath Mats",
  "Roupões de Banho": "Bathrobes",
  "Toalhas de Piscina / Praia": "Pool / Beach Towels",
  "Panos de Prato / Louça": "Tea Towels / Dish Cloths",
  "Toalhas de Mesa (Pano)": "Tablecloths",
  "Pega-monstros / Luvas do Forno": "Pot Holders / Oven Gloves",
  "Panos de Limpeza / Microfibras": "Cleaning Cloths / Microfibres",
  "Aventais de Cozinha": "Kitchen Aprons",
  "Almofadas Decorativas (Sala/Quartos)": "Decorative Cushions (Living Room / Bedrooms)",
  "Capas de Almofada Decorativa": "Decorative Cushion Covers",
  "Mantas Decorativas (Xailes de Sofá)": "Decorative Throws (Sofa Throws)",
  "Cortinados / Cortinas de Sala e Quarto": "Living Room / Bedroom Curtains",
  "Tapetes Decorativos Pequenos / Passadeiras": "Small Decorative Rugs / Runners",
  "Sacos de Lavandaria em Pano": "Fabric Laundry Bags",
}

const portugueseDescriptions = Object.fromEntries(
  Object.entries(englishDescriptions).map(([portuguese, english]) => [english, portuguese])
)

export function translateInventoryDescription(description: string, language: Language) {
  return language === "en"
    ? englishDescriptions[description] ?? description
    : portugueseDescriptions[description] ?? description
}
