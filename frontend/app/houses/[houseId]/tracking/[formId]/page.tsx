import { InventoryFormEditor } from "@/components/inventory-form-editor"

export default async function EditTrackingSheetPage({ params }: { params: Promise<{ houseId: string; formId: string }> }) {
  const { houseId, formId } = await params
  return <InventoryFormEditor houseId={Number(houseId)} formId={Number(formId)} />
}
