import { useEffect, useMemo, useState } from 'react'
import { RotateCcw, ShieldAlert, Wand2 } from 'lucide-react'
import type { Company } from '@/types/admin'
import { plans } from '@/data/mock'
import {
  effectiveTerms,
  periodEndForPlan,
  useTenantEdits,
  type BalanceAdjustment,
  type TenantEdit,
} from '@/data/tenantEdits'
import { periodLabel } from '@/types/labels'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { formatInn, formatMoney, formatNumber, formatSum } from '@/lib/format'
import { cn } from '@/lib/cn'

const NO_PLAN = 'none'

/** `<input type="date">` wants `YYYY-MM-DD`. */
function toDateInput(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toISOString().slice(0, 10)
}

function fromDateInput(value: string): string | null {
  if (!value) return null
  return new Date(`${value}T00:00:00Z`).toISOString()
}

/** Label + optional "auto-filled / overridden" affordance. */
function FieldLabel({
  children,
  overridden,
  onReset,
}: {
  children: string
  overridden?: boolean
  onReset?: () => void
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm leading-5 font-medium text-slate-700">{children}</span>
      {overridden && (
        <>
          <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-600">
            изменено
          </span>
          {onReset && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1 text-xs font-semibold text-Smart-blue transition hover:underline"
            >
              <RotateCcw className="size-3" />
              Сбросить
            </button>
          )}
        </>
      )}
    </div>
  )
}

function NumberField({
  label,
  value,
  onChange,
  overridden,
  onReset,
  hint,
  suffix,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  overridden?: boolean
  onReset?: () => void
  hint?: string
  suffix?: string
}) {
  return (
    <div className="flex w-full flex-col items-start gap-1.5">
      <FieldLabel overridden={overridden} onReset={onReset}>
        {label}
      </FieldLabel>
      <div className="flex w-full items-center gap-2 overflow-hidden rounded-lg bg-white px-3.5 py-2.5 outline outline-1 outline-offset-[-1px] outline-gray-200 transition focus-within:outline-Smart-blue">
        <input
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^\d]/g, ''))}
          className="flex-1 bg-transparent text-base leading-6 font-normal text-neutral-900 tabular-nums outline-none placeholder:text-gray-500"
        />
        {suffix && <span className="shrink-0 text-sm text-gray-500">{suffix}</span>}
      </div>
      {hint && <span className="text-sm leading-5 text-gray-500">{hint}</span>}
    </div>
  )
}

type TariffEditModalProps = {
  open: boolean
  onClose: () => void
  company: Company | null
  onSave: (
    companyId: string,
    patch: Partial<TenantEdit>,
    reason: string,
    adjustment: BalanceAdjustment | null,
  ) => void
}

export function TariffEditModal({ open, onClose, company, onSave }: TariffEditModalProps) {
  const edits = useTenantEdits()
  const current = useMemo(
    () => (company ? effectiveTerms(company, edits) : null),
    [company, edits],
  )

  const [planId, setPlanId] = useState<string>(NO_PLAN)
  const [periodEnd, setPeriodEnd] = useState('')
  const [quota, setQuota] = useState('')
  const [maxEmployees, setMaxEmployees] = useState('')
  const [reason, setReason] = useState('')

  const [adjust, setAdjust] = useState(false)
  const [direction, setDirection] = useState<'credit' | 'debit'>('credit')
  const [amount, setAmount] = useState('')
  const [adjustReason, setAdjustReason] = useState('')

  const [touched, setTouched] = useState(false)

  // Re-seed the form each time the modal opens for a company.
  useEffect(() => {
    if (!open || !current) return
    setPlanId(current.planId ?? NO_PLAN)
    setPeriodEnd(toDateInput(current.periodEnd))
    setQuota(current.docQuota === null ? '' : String(current.docQuota))
    setMaxEmployees(current.maxEmployees === null ? '' : String(current.maxEmployees))
    setReason('')
    setAdjust(false)
    setDirection('credit')
    setAmount('')
    setAdjustReason('')
    setTouched(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, company?.id])

  const selectedPlan = plans.find((p) => p.id === planId) ?? null

  /** Picking a plan auto-fills quota, employee limit and expiry from that plan. */
  function handlePlanChange(next: string) {
    setPlanId(next)
    if (next === NO_PLAN) {
      setQuota('')
      setMaxEmployees('')
      setPeriodEnd('')
      return
    }
    const plan = plans.find((p) => p.id === next)
    if (!plan) return
    setQuota(String(plan.docQuota))
    setMaxEmployees(String(plan.maxEmployees))
    setPeriodEnd(toDateInput(periodEndForPlan(next)))
  }

  if (!company || !current) return null

  const quotaOverridden =
    selectedPlan !== null && quota !== '' && Number(quota) !== selectedPlan.docQuota
  const employeesOverridden =
    selectedPlan !== null &&
    maxEmployees !== '' &&
    Number(maxEmployees) !== selectedPlan.maxEmployees
  const expiryOverridden =
    selectedPlan !== null &&
    periodEnd !== '' &&
    periodEnd !== toDateInput(periodEndForPlan(planId))

  const amountValue = Number(amount || 0)
  const signed = direction === 'credit' ? amountValue : -amountValue
  const newBalance = current.balance + (adjust ? signed : 0)

  const tariffChanged =
    (planId === NO_PLAN ? null : planId) !== current.planId ||
    fromDateInput(periodEnd) !== current.periodEnd ||
    (quota === '' ? null : Number(quota)) !== current.docQuota ||
    (maxEmployees === '' ? null : Number(maxEmployees)) !== current.maxEmployees

  const adjustmentValid = !adjust || (amountValue > 0 && adjustReason.trim().length > 0)
  const reasonValid = !tariffChanged || reason.trim().length > 0
  const anythingToSave = tariffChanged || (adjust && amountValue > 0)
  const canSave = anythingToSave && reasonValid && adjustmentValid

  function handleSave() {
    setTouched(true)
    if (!canSave || !company) return

    onSave(
      company.id,
      {
        planId: planId === NO_PLAN ? null : planId,
        planName: selectedPlan?.nameRu ?? null,
        periodEnd: fromDateInput(periodEnd),
        docQuota: quota === '' ? null : Number(quota),
        maxEmployees: maxEmployees === '' ? null : Number(maxEmployees),
      },
      reason.trim(),
      adjust && amountValue > 0
        ? { direction, amount: amountValue, reason: adjustReason.trim() }
        : null,
    )
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Тарификация компании" maxWidth="max-w-2xl">
      <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
        <div className="flex flex-col gap-5">
          {/* Company identity */}
          <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3.5 py-2.5">
            <span className="text-sm font-semibold text-slate-800">{company.name}</span>
            <span className="text-sm text-gray-500">ИНН {formatInn(company.inn)}</span>
          </div>

          {/* ---------------------------------------------------------- tariff */}
          <div className="flex flex-col gap-4">
            <Select
              label="Тарифный план"
              value={planId}
              onChange={handlePlanChange}
              options={[
                { value: NO_PLAN, label: 'Без плана (оплата за документ)' },
                ...plans
                  .filter((p) => p.isActive || p.id === current.planId)
                  .map((p) => ({
                    value: p.id,
                    label: `${p.nameRu} — ${formatMoney(p.price)} сум / ${periodLabel[
                      p.period
                    ].toLowerCase()}`,
                  })),
              ]}
            />

            {selectedPlan && (
              <div className="flex items-start gap-2 rounded-lg bg-Smart-blue/5 px-3.5 py-2.5">
                <Wand2 className="mt-0.5 size-4 shrink-0 text-Smart-blue" />
                <span className="text-sm text-slate-600">
                  Поля ниже заполнены из плана «{selectedPlan.nameRu}»:{' '}
                  {formatNumber(selectedPlan.docQuota)} док.,{' '}
                  {formatNumber(selectedPlan.maxEmployees)} сотр.,{' '}
                  {periodLabel[selectedPlan.period].toLowerCase()}. Их можно изменить —
                  изменённые значения помечаются.
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex w-full flex-col items-start gap-1.5">
                <FieldLabel
                  overridden={expiryOverridden}
                  onReset={
                    selectedPlan
                      ? () => setPeriodEnd(toDateInput(periodEndForPlan(planId)))
                      : undefined
                  }
                >
                  Действует до
                </FieldLabel>
                <div className="flex w-full items-center gap-2 overflow-hidden rounded-lg bg-white px-3.5 py-2.5 outline outline-1 outline-offset-[-1px] outline-gray-200 transition focus-within:outline-Smart-blue">
                  <input
                    type="date"
                    value={periodEnd}
                    onChange={(e) => setPeriodEnd(e.target.value)}
                    className="flex-1 bg-transparent text-base leading-6 font-normal text-neutral-900 outline-none"
                  />
                </div>
                <span className="text-sm leading-5 text-gray-500">
                  Период не пересчитывается пропорционально
                </span>
              </div>

              <NumberField
                label="Квота документов"
                value={quota}
                onChange={setQuota}
                overridden={quotaOverridden}
                onReset={
                  selectedPlan ? () => setQuota(String(selectedPlan.docQuota)) : undefined
                }
                suffix="док."
                hint={
                  selectedPlan
                    ? `По плану: ${formatNumber(selectedPlan.docQuota)}`
                    : 'Без плана квота не применяется'
                }
              />

              <NumberField
                label="Лимит сотрудников"
                value={maxEmployees}
                onChange={setMaxEmployees}
                overridden={employeesOverridden}
                onReset={
                  selectedPlan
                    ? () => setMaxEmployees(String(selectedPlan.maxEmployees))
                    : undefined
                }
                suffix="чел."
                hint={
                  selectedPlan
                    ? `По плану: ${formatNumber(selectedPlan.maxEmployees)} · сейчас ${formatNumber(company.employees)}`
                    : `Сейчас сотрудников: ${formatNumber(company.employees)}`
                }
              />
            </div>
          </div>

          {/* --------------------------------------------------------- balance */}
          <div className="rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm leading-5 font-medium text-slate-700">Баланс</span>
                <span className="text-lg font-semibold text-slate-800 tabular-nums">
                  {formatSum(current.balance)}
                </span>
              </div>
              {!adjust ? (
                <button
                  type="button"
                  onClick={() => setAdjust(true)}
                  className="rounded-lg border border-Smart-blue px-4 py-2 text-sm font-semibold text-Smart-blue transition hover:bg-blue-50"
                >
                  Корректировать
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setAdjust(false)}
                  className="text-sm font-semibold text-gray-500 transition hover:underline"
                >
                  Отменить корректировку
                </button>
              )}
            </div>

            {adjust && (
              <div className="mt-4 flex flex-col gap-4">
                <SegmentedControl
                  value={direction}
                  onChange={setDirection}
                  options={[
                    { value: 'credit', label: 'Начислить' },
                    { value: 'debit', label: 'Списать' },
                  ]}
                />

                <NumberField label="Сумма" value={amount} onChange={setAmount} suffix="сум" />

                <div className="flex w-full flex-col items-start gap-1.5">
                  <span className="text-sm leading-5 font-medium text-slate-700">
                    Причина корректировки<span className="text-red-500"> *</span>
                  </span>
                  <div
                    className={cn(
                      'flex w-full items-center overflow-hidden rounded-lg bg-white px-3.5 py-2.5 outline outline-1 outline-offset-[-1px] transition',
                      touched && adjust && adjustReason.trim().length === 0
                        ? 'outline-red-300 focus-within:outline-red-400'
                        : 'outline-gray-200 focus-within:outline-Smart-blue',
                    )}
                  >
                    <input
                      value={adjustReason}
                      onChange={(e) => setAdjustReason(e.target.value)}
                      placeholder="Например: компенсация за сбой при отправке"
                      className="flex-1 bg-transparent text-base leading-6 font-normal text-neutral-900 outline-none placeholder:text-gray-500"
                    />
                  </div>
                </div>

                {amountValue > 0 && (
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

                <span className="text-sm text-gray-500">
                  Корректировка создаёт запись в Транзакциях и Журнале аудита.
                </span>
              </div>
            )}
          </div>

          {/* ---------------------------------------------------------- reason */}
          {tariffChanged && (
            <div className="flex w-full flex-col items-start gap-1.5">
              <span className="text-sm leading-5 font-medium text-slate-700">
                Причина изменения тарифа<span className="text-red-500"> *</span>
              </span>
              <div
                className={cn(
                  'flex w-full items-center overflow-hidden rounded-lg bg-white px-3.5 py-2.5 outline outline-1 outline-offset-[-1px] transition',
                  touched && !reasonValid
                    ? 'outline-red-300 focus-within:outline-red-400'
                    : 'outline-gray-200 focus-within:outline-Smart-blue',
                )}
              >
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Например: индивидуальные условия по договору"
                  className="flex-1 bg-transparent text-base leading-6 font-normal text-neutral-900 outline-none placeholder:text-gray-500"
                />
              </div>
              {touched && !reasonValid && (
                <span className="text-sm leading-5 text-red-600">Причина обязательна</span>
              )}
            </div>
          )}

          <div className="flex items-start gap-2 rounded-lg bg-gray-50 px-3.5 py-2.5">
            <ShieldAlert className="mt-0.5 size-4 shrink-0 text-gray-400" />
            <span className="text-sm text-gray-500">
              Изменение тарифа и баланса записывается в журнал аудита с вашим именем и
              IP-адресом.
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-gray-200 px-6 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-gray-50"
        >
          Отменить
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!anythingToSave}
          className="rounded-lg bg-Smart-blue px-6 py-2.5 text-sm font-semibold text-white shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Сохранить
        </button>
      </div>
    </Modal>
  )
}
