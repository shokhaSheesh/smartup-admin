import { useEffect, useState } from 'react'
import { ShieldAlert } from 'lucide-react'
import type { UserBalanceAdjustment } from '@/data/userEdits'
import { Modal } from '@/components/ui/Modal'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { formatSum } from '@/lib/format'
import { cn } from '@/lib/cn'

type BalanceAdjustModalProps = {
  open: boolean
  onClose: () => void
  /** Balance before the adjustment, for the preview line. */
  currentBalance: number
  subjectName: string
  onApply: (adj: UserBalanceAdjustment) => void
}

/**
 * Balance is never typed over directly — it moves by a credit or debit with a
 * mandatory reason, so the ledger stays append-only and the audit entry means
 * something.
 */
export function BalanceAdjustModal({
  open,
  onClose,
  currentBalance,
  subjectName,
  onApply,
}: BalanceAdjustModalProps) {
  const [direction, setDirection] = useState<'credit' | 'debit'>('credit')
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [touched, setTouched] = useState(false)

  useEffect(() => {
    if (!open) return
    setDirection('credit')
    setAmount('')
    setReason('')
    setTouched(false)
  }, [open])

  const value = Number(amount || 0)
  const signed = direction === 'credit' ? value : -value
  const newBalance = currentBalance + signed

  const amountInvalid = !(value > 0)
  const reasonInvalid = reason.trim().length === 0
  const canApply = !amountInvalid && !reasonInvalid

  function handleApply() {
    setTouched(true)
    if (!canApply) return
    onApply({ direction, amount: value, reason: reason.trim() })
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Корректировка баланса" maxWidth="max-w-lg">
      <div className="flex flex-col gap-4 px-6 py-5">
        <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3.5 py-2.5">
          <span className="text-sm text-slate-600">{subjectName}</span>
          <span className="text-sm font-semibold text-slate-800 tabular-nums">
            {formatSum(currentBalance)}
          </span>
        </div>

        <SegmentedControl
          value={direction}
          onChange={setDirection}
          options={[
            { value: 'credit', label: 'Начислить' },
            { value: 'debit', label: 'Списать' },
          ]}
        />

        <div className="flex w-full flex-col items-start gap-1.5">
          <span className="text-sm leading-5 font-medium text-slate-700">
            Сумма<span className="text-red-500"> *</span>
          </span>
          <div
            className={cn(
              'flex w-full items-center gap-2 overflow-hidden rounded-lg bg-white px-3.5 py-2.5 outline outline-1 outline-offset-[-1px] transition',
              touched && amountInvalid
                ? 'outline-red-300 focus-within:outline-red-400'
                : 'outline-gray-200 focus-within:outline-Smart-blue',
            )}
          >
            <input
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ''))}
              placeholder="0"
              className="flex-1 bg-transparent text-base leading-6 font-normal text-neutral-900 tabular-nums outline-none placeholder:text-gray-500"
            />
            <span className="shrink-0 text-sm text-gray-500">сум</span>
          </div>
        </div>

        <div className="flex w-full flex-col items-start gap-1.5">
          <span className="text-sm leading-5 font-medium text-slate-700">
            Причина<span className="text-red-500"> *</span>
          </span>
          <div
            className={cn(
              'flex w-full items-center overflow-hidden rounded-lg bg-white px-3.5 py-2.5 outline outline-1 outline-offset-[-1px] transition',
              touched && reasonInvalid
                ? 'outline-red-300 focus-within:outline-red-400'
                : 'outline-gray-200 focus-within:outline-Smart-blue',
            )}
          >
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Например: компенсация за сбой при отправке"
              className="flex-1 bg-transparent text-base leading-6 font-normal text-neutral-900 outline-none placeholder:text-gray-500"
            />
          </div>
          {touched && reasonInvalid && (
            <span className="text-sm leading-5 text-red-600">Причина обязательна</span>
          )}
        </div>

        {value > 0 && (
          <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3.5 py-2.5">
            <span className="text-sm text-slate-600">Новый баланс</span>
            <span
              className={cn(
                'text-sm font-semibold tabular-nums',
                newBalance < 0 ? 'text-red-600' : 'text-slate-800',
              )}
            >
              {formatSum(newBalance)}
            </span>
          </div>
        )}

        <div className="flex items-start gap-2 rounded-lg bg-gray-50 px-3.5 py-2.5">
          <ShieldAlert className="mt-0.5 size-4 shrink-0 text-gray-400" />
          <span className="text-sm text-gray-500">
            Корректировка создаёт запись в Транзакциях и Журнале аудита.
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
            onClick={handleApply}
            className="rounded-lg bg-Smart-blue px-6 py-2.5 text-sm font-semibold text-white shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] transition hover:brightness-105"
          >
            Применить
          </button>
        </div>
      </div>
    </Modal>
  )
}
