import { InventoryFormEditor } from "@/components/inventory-form-editor"

export default async function NewTrackingSheetPage({ params }: { params: Promise<{ houseId: string }> }) {
  const { houseId } = await params
  return <InventoryFormEditor houseId={Number(houseId)} />
}
