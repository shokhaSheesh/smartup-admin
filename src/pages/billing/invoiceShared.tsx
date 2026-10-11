import { CheckCircle2, Circle, XCircle } from 'lucide-react'
import { Field } from '@/components/ui/PageCard'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { DASHBOARD_NOW } from '@/data/dashboard'
import type { OpenUsage, Payer, ServiceInvoice, UsageSummary } from '@/data/invoices'
import { formatDate, formatDateTime, formatInn, formatNumber, formatSum } from '@/lib/format'
import { toIso } from '@/lib/date'
import { cn } from '@/lib/cn'

/** Pieces the faktura list and its detail pages share. */

const DAY = 86_400_000

export const TODAY = toIso(DASHBOARD_NOW)

/** A `YYYY-MM-DD` from the URL, or today when absent, malformed or in the future. */
export function parseCutoff(value: string | null): string {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) && value <= TODAY ? value : TODAY
}

/** The last millisecond of the cutoff day — operations on that day still count. */
export const cutoffEnd = (cutoff: string) => +new Date(`${cutoff}T00:00:00`) + DAY - 1

export const payerKindLabel = (payer: Payer) =>
  payer.payerKind === 'company' ? 'Компания' : 'Физическое лицо'

export const taxIdLabel = (payer: Payer) =>
  payer.payerKind === 'company' ? `ИНН ${formatInn(payer.payerTaxId)}` : `ПИНФЛ ${payer.payerTaxId}`

/** The dates the summed operations span — a single date when they share a day. */
export function rangeLabel(usage: UsageSummary): string {
  const from = formatDate(usage.from)
  const to = formatDate(usage.to)
  return from === to ? from : `${from} – ${to}`
}

export const sumOf = (rows: UsageSummary[]) => rows.reduce((sum, row) => sum + row.total, 0)

/** Operations after the chosen day are left for a later faktura. */
export function CutoffInput({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="flex h-11 shrink-0 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3.5 text-sm">
      <span className="whitespace-nowrap text-gray-500">Операции по</span>
      <input
        type="date"
        value={value}
        max={TODAY}
        onChange={(e) => onChange(e.target.value || TODAY)}
        className="bg-transparent text-slate-800 outline-none"
      />
    </label>
  )
}

/** The path a faktura takes once created — the last step turns red on rejection. */
export function InvoiceSteps({ invoice }: { invoice: ServiceInvoice | null }) {
  const rejected = invoice?.status === 'rejected'
  const reached = invoice ? { draft: 1, sent: 2, signed: 3, rejected: 3 }[invoice.status] : 0

  const steps = [
    {
      title: 'Черновик создан',
      hint: 'Раздел «Черновики» нашего аккаунта в Smartup24 Doc',
      at: invoice?.createdAt ?? null,
    },
    {
      title: 'Подписана нами и отправлена',
      hint: 'Бухгалтер проверяет и подписывает черновик',
      at: invoice?.sentAt ?? null,
    },
    {
      title: rejected ? 'Отклонена клиентом' : 'Подписана клиентом',
      hint: rejected
        ? 'Операции вернулись в «К выставлению»'
        : 'Клиент подписывает входящий документ',
      at: invoice?.resolvedAt ?? null,
    },
  ]

  return (
    <ol className="flex flex-col gap-3">
      {steps.map((step, i) => {
        const done = i < reached
        const failed = done && rejected && i === 2
        const Icon = failed ? XCircle : done ? CheckCircle2 : Circle
        return (
          <li key={step.title} className="flex items-start gap-3">
            <Icon
              className={cn(
                'mt-0.5 size-5 shrink-0',
                failed ? 'text-red-500' : done ? 'text-emerald-500' : 'text-gray-300',
              )}
            />
            <div className="flex flex-1 flex-col">
              <span className={cn('text-sm font-medium', done ? 'text-slate-800' : 'text-gray-400')}>
                {step.title}
              </span>
              <span className="text-xs text-gray-500">{step.hint}</span>
            </div>
            {done && step.at && (
              <span className="text-xs whitespace-nowrap text-gray-500">
                {formatDateTime(step.at)}
              </span>
            )}
          </li>
        )
      })}
    </ol>
  )
}

/** Confirmation before drafts are created — `rows` is null while closed. */
export function CreateInvoicesDialog({
  rows,
  cutoff,
  onClose,
  onConfirm,
}: {
  rows: OpenUsage[] | null
  cutoff: string
  onClose: () => void
  onConfirm: (rows: OpenUsage[]) => void
}) {
  return (
    <ConfirmDialog
      open={rows !== null}
      onClose={onClose}
      onConfirm={() => rows && onConfirm(rows)}
      requireReason={false}
      title={rows?.length === 1 ? 'Создать счёт-фактуру' : 'Создать счета-фактуры'}
      confirmLabel={rows?.length === 1 ? 'Создать черновик' : 'Создать черновики'}
      description={
        rows && (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-3 gap-4 rounded-xl border border-gray-200 px-4 py-3">
              <Field label="Фактур">{formatNumber(rows.length)}</Field>
              <Field label="Операции по">{formatDate(cutoff)}</Field>
              <Field label="На сумму">{formatSum(sumOf(rows))}</Field>
            </div>
            <p>
              {rows.length === 1 ? (
                <>
                  Для <b className="font-semibold text-slate-800">{rows[0].payerName}</b> (
                  {taxIdLabel(rows[0])}) будет создан черновик
                </>
              ) : (
                <>Для каждого плательщика будет создан отдельный черновик</>
              )}{' '}
              в разделе «Черновики» нашего аккаунта Smartup24 Doc. Клиент получит фактуру только
              после того, как бухгалтер её подпишет. Если клиент отклонит её, операции вернутся в
              «К выставлению».
            </p>
          </div>
        )
      }
    />
  )
}
