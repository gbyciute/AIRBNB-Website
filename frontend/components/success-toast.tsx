"use client"

import { useEffect } from "react"
import { CheckCircle, X } from "@phosphor-icons/react"

export function SuccessToast({ message, onDismiss, closeLabel }: { message: string | null; onDismiss: () => void; closeLabel: string }) {
  useEffect(() => {
    if (!message) return
    const timeout = window.setTimeout(onDismiss, 4000)
    return () => window.clearTimeout(timeout)
  }, [message, onDismiss])

  if (!message) return null

  return (
    <div className="fixed right-3 bottom-3 left-3 z-50 flex items-center gap-3 border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900 shadow-lg sm:right-5 sm:left-auto sm:max-w-sm" role="status">
      <CheckCircle className="size-5 shrink-0 text-emerald-700" weight="fill" aria-hidden="true" />
      <span className="flex-1">{message}</span>
      <button type="button" onClick={onDismiss} className="inline-flex size-7 shrink-0 items-center justify-center text-emerald-800 hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600" aria-label={closeLabel}>
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  )
}
