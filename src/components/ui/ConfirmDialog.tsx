import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { ShieldAlert } from 'lucide-react'
import { Modal } from './Modal'
import { cn } from '@/lib/cn'

type ConfirmDialogProps = {
  open: boolean
  onClose: () => void
  onConfirm: (reason: string) => void
  title: string
  description?: ReactNode
  confirmLabel?: string
  /** Destructive actions require a written reason — it goes to the audit log. */
  requireReason?: boolean
  destructive?: boolean
}

/**
 * Confirmation for audit-sensitive actions. Per the design system, destructive
 * admin actions are never one-click: they always pass through here with a reason.
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Подтвердить',
  requireReason = true,
  destructive = false,
}: ConfirmDialogProps) {
  const [reason, setReason] = useState('')
  const [touched, setTouched] = useState(false)

  useEffect(() => {
    if (open) {
      setReason('')
      setTouched(false)
    }
  }, [open])

  const invalid = requireReason && reason.trim().length === 0

  function handleConfirm() {
    setTouched(true)
    if (invalid) return
    onConfirm(reason.trim())
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={title} maxWidth="max-w-lg">
      <div className="flex flex-col gap-4 px-6 py-5">
        {description && <div className="text-sm text-slate-600">{description}</div>}

        {requireReason && (
          <div className="flex w-full flex-col items-start gap-1.5">
            <label
              htmlFor="confirm-reason"
              className="text-sm font-medium leading-5 text-slate-700"
            >
              Причина<span className="text-red-500"> *</span>
            </label>
            <div
              className={cn(
                'flex w-full items-center gap-2 overflow-hidden rounded-lg bg-white px-3.5 py-2.5 outline outline-1 outline-offset-[-1px] transition',
                touched && invalid
                  ? 'outline-red-300 focus-within:outline-red-400'
                  : 'outline-gray-200 focus-within:outline-Smart-blue',
              )}
            >
              <textarea
                id="confirm-reason"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Укажите причину — она попадёт в журнал аудита"
                className="flex-1 resize-none bg-transparent text-base leading-6 font-normal text-neutral-900 outline-none placeholder:text-gray-500"
              />
            </div>
            <span
              className={cn(
                'text-sm leading-5',
                touched && invalid ? 'text-red-600' : 'text-gray-500',
              )}
            >
              {touched && invalid
                ? 'Причина обязательна'
                : 'Действие записывается в журнал аудита'}
            </span>
          </div>
        )}

        <div className="flex items-start gap-2 rounded-lg bg-gray-50 px-3.5 py-2.5">
          <ShieldAlert className="mt-0.5 size-4 shrink-0 text-gray-400" />
          <span className="text-sm text-gray-500">
            Действие будет записано в журнал аудита с вашим именем и IP-адресом.
          </span>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-6 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-gray-50"
          >
            Отменить
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className={cn(
              'rounded-lg px-6 py-2.5 text-sm font-semibold transition',
              destructive
                ? 'border border-red-300 text-red-500 hover:bg-red-50'
                : 'bg-Smart-blue text-white shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] hover:brightness-105',
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  )
}
