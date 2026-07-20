import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Paperclip, Plus, Search, ShieldAlert } from 'lucide-react'
import { PageCard, PageHeader } from '@/components/ui/PageCard'
import { DataTable } from '@/components/ui/DataTable'
import type { Column } from '@/components/ui/DataTable'
import { Toolbar } from '@/components/ui/Toolbar'
import { Pagination, paginate, PAGE_SIZES } from '@/components/ui/Pagination'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import {
  adjustments as seedAdjustments,
  adminUsers,
  companies,
  currentAdmin,
  platformUsers,
} from '@/data/mock'
import type { Adjustment } from '@/types/admin'
import { formatDateTime, formatInn, formatMoney, formatNumber, formatSum } from '@/lib/format'
import { cn } from '@/lib/cn'

const DAY = 86_400_000

type Direction = 'credit' | 'debit'

const directionLabel: Record<Direction, string> = {
  credit: 'Начисление (Credit)',
  debit: 'Списание (Debit)',
}

const directionShort: Record<Direction, string> = {
  credit: 'Credit',
  debit: 'Debit',
}

const DIRECTION_OPTIONS = [
  { value: 'all', label: 'Все направления' },
  { value: 'credit', label: directionLabel.credit },
  { value: 'debit', label: directionLabel.debit },
]

const ADMIN_OPTIONS = [
  { value: 'all', label: 'Все администраторы' },
  ...adminUsers.map((a) => ({ value: a.fullName, label: a.fullName })),
]

/** A company or an individual — both hold balances that can be adjusted. */
type Subject = {
  type: 'company' | 'individual'
  id: string
  name: string
  taxId: string
  balance: number
}

const SUBJECTS: Subject[] = [
  ...companies.map<Subject>((c) => ({
    type: 'company',
    id: c.id,
    name: c.name,
    taxId: c.inn,
    balance: c.balance,
  })),
  ...platformUsers
    .filter((u) => u.kind === 'individual')
    .map<Subject>((u) => ({
      type: 'individual',
      id: u.id,
      name: u.fullName,
      taxId: u.pinfl,
      balance: u.balance ?? 0,
    })),
]

function SubjectBadge({ type }: { type: Subject['type'] }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        type === 'company'
          ? 'bg-blue-50 text-Smart-blue'
          : 'bg-purple-50 text-purple-600',
      )}
    >
      {type === 'company' ? 'Компания' : 'Физ. лицо'}
    </span>
  )
}

/** Searchable picker over companies and individuals alike. */
function SubjectPicker({
  value,
  onChange,
  invalid,
}: {
  value: Subject | null
  onChange: (subject: Subject) => void
  invalid: boolean
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (q) {
      return SUBJECTS.filter(
        (s) => s.taxId.includes(q) || s.name.toLowerCase().includes(q),
      ).slice(0, 40)
    }
    // Unfiltered, show both kinds — otherwise the companies fill the list and
    // individuals look absent until someone happens to search for one.
    return [
      ...SUBJECTS.filter((s) => s.type === 'company').slice(0, 20),
      ...SUBJECTS.filter((s) => s.type === 'individual').slice(0, 20),
    ]
  }, [query])

  return (
    <div className="flex w-full flex-col items-start gap-1.5" ref={ref}>
      <span className="text-sm leading-5 font-medium text-slate-700">
        Компания или физическое лицо<span className="text-red-500"> *</span>
      </span>
      <div className="relative w-full">
        <div
          className={cn(
            'flex w-full items-center gap-2 overflow-hidden rounded-lg bg-white px-3.5 py-2.5 outline outline-1 outline-offset-[-1px] transition',
            invalid
              ? 'outline-red-300 focus-within:outline-red-400'
              : 'outline-gray-200 focus-within:outline-Smart-blue',
          )}
        >
          <Search className="size-5 shrink-0 text-gray-400" />
          <input
            value={
              open ? query : value ? `${formatInn(value.taxId)} · ${value.name}` : query
            }
            onChange={(e) => {
              setQuery(e.target.value)
              setOpen(true)
            }}
            onFocus={() => {
              setQuery('')
              setOpen(true)
            }}
            placeholder="Поиск по ИНН, ПИНФЛ или названию"
            className="flex-1 bg-transparent text-base leading-6 font-normal text-neutral-900 outline-none placeholder:text-gray-500"
          />
        </div>

        {open && (
          <div className="absolute z-20 mt-1.5 max-h-60 w-full overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
            {matches.length === 0 ? (
              <div className="px-3.5 py-2 text-sm text-gray-500">Ничего не найдено</div>
            ) : (
              matches.map((subject) => (
                <button
                  key={`${subject.type}-${subject.id}`}
                  type="button"
                  onClick={() => {
                    onChange(subject)
                    setQuery('')
                    setOpen(false)
                  }}
                  className="flex w-full items-center justify-between gap-2 px-3.5 py-2 text-left hover:bg-gray-50"
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium text-slate-800">
                      {subject.name}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatInn(subject.taxId)} · баланс {formatMoney(subject.balance)}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <SubjectBadge type={subject.type} />
                    {value?.id === subject.id && (
                      <Check className="size-4 shrink-0 text-Smart-blue" />
                    )}
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>
      {invalid && (
        <span className="text-sm leading-5 text-red-600">Выберите компанию или физлицо</span>
      )}
    </div>
  )
}

export default function AdjustmentsPage() {
  /** Local ledger — new adjustments are prepended, nothing is persisted. */
  const [rowsData, setRowsData] = useState<Adjustment[]>(seedAdjustments)

  const [search, setSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [direction, setDirection] = useState('all')
  const [admin, setAdmin] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0])

  /* --------------------------------------------------------------- the form */
  const [formOpen, setFormOpen] = useState(false)
  const [fSubject, setFSubject] = useState<Subject | null>(null)
  const [fDirection, setFDirection] = useState<Direction>('credit')
  const [fAmount, setFAmount] = useState('')
  const [fReason, setFReason] = useState('')
  const [fFileName, setFFileName] = useState<string | null>(null)
  const [touched, setTouched] = useState(false)
  const [confirmation, setConfirmation] = useState<Adjustment | null>(null)

  const amountValue = Number(fAmount)
  const subjectInvalid = fSubject === null
  const amountInvalid = fAmount.trim() === '' || Number.isNaN(amountValue) || amountValue <= 0
  const reasonInvalid = fReason.trim().length === 0
  const formInvalid = subjectInvalid || amountInvalid || reasonInvalid

  function openForm() {
    setFSubject(null)
    setFDirection('credit')
    setFAmount('')
    setFReason('')
    setFFileName(null)
    setTouched(false)
    setFormOpen(true)
  }

  function submitForm() {
    setTouched(true)
    if (formInvalid || !fSubject) return

    const entry: Adjustment = {
      id: `adj-local-${Date.now()}`,
      createdAt: new Date().toISOString(),
      subjectType: fSubject.type,
      subjectId: fSubject.id,
      subjectName: fSubject.name,
      subjectTaxId: fSubject.taxId,
      direction: fDirection,
      amount: amountValue,
      reason: fReason.trim(),
      performedBy: currentAdmin.fullName,
    }

    setRowsData((prev) => [entry, ...prev])
    setConfirmation(entry)
    setFormOpen(false)
    setPage(1)
  }

  /* ------------------------------------------------------------------ list */
  const filtersActive =
    direction !== 'all' ||
    admin !== 'all' ||
    dateFrom !== '' ||
    dateTo !== ''

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const from = dateFrom === '' ? null : +new Date(dateFrom)
    const to = dateTo === '' ? null : +new Date(dateTo) + DAY

    return rowsData.filter((a) => {
      if (direction !== 'all' && a.direction !== direction) return false
      if (admin !== 'all' && a.performedBy !== admin) return false
      const ts = +new Date(a.createdAt)
      if (from !== null && ts < from) return false
      if (to !== null && ts >= to) return false
      if (!q) return true
      return (
        a.subjectName.toLowerCase().includes(q) ||
        a.subjectTaxId.includes(q) ||
        a.reason.toLowerCase().includes(q) ||
        a.performedBy.toLowerCase().includes(q)
      )
    })
  }, [rowsData, search, direction, admin, dateFrom, dateTo])

  const rows = paginate(filtered, page, pageSize)

  function resetFilters() {
    setDirection('all')
    setAdmin('all')
    setDateFrom('')
    setDateTo('')
    setPage(1)
  }

  const columns: Column<Adjustment>[] = [
    {
      key: 'date',
      header: 'Дата',
      cell: (a) => (
        <span className="text-sm whitespace-nowrap text-gray-900">
          {formatDateTime(a.createdAt)}
        </span>
      ),
    },
    {
      key: 'company',
      header: 'Кому',
      cell: (a) => (
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-800">{a.subjectName}</span>
            <SubjectBadge type={a.subjectType} />
          </div>
          <span className="text-xs text-gray-500">{formatInn(a.subjectTaxId)}</span>
        </div>
      ),
    },
    {
      key: 'direction',
      header: 'Направление',
      cell: (a) => (
        <span
          className={cn(
            'text-sm font-semibold whitespace-nowrap',
            a.direction === 'credit' ? 'text-emerald-600' : 'text-red-600',
          )}
        >
          {directionShort[a.direction]}
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'Сумма',
      cls: 'text-right',
      cell: (a) => (
        <span
          className={cn(
            'text-sm font-semibold whitespace-nowrap tabular-nums',
            a.direction === 'credit' ? 'text-emerald-600' : 'text-red-600',
          )}
        >
          {a.direction === 'credit' ? '+' : '−'}
          {formatMoney(a.amount)}
        </span>
      ),
    },
    {
      key: 'reason',
      header: 'Причина',
      cell: (a) => <span className="text-sm text-gray-600">{a.reason}</span>,
    },
    {
      key: 'performedBy',
      header: 'Выполнил',
      cell: (a) => (
        <span className="text-sm whitespace-nowrap text-gray-900">{a.performedBy}</span>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Ручные корректировки"
        subtitle={`Начисления и списания по балансам вручную — ${formatNumber(rowsData.length)} записей`}
        actions={
          <button
            type="button"
            onClick={openForm}
            className="flex items-center gap-2 rounded-lg bg-Smart-green px-4 py-2.5 text-base font-semibold text-white shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] transition hover:brightness-105"
          >
            <Plus className="size-5" />
            Новая корректировка
          </button>
        }
      />

      {confirmation && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
          <div className="flex items-start gap-3">
            <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" />
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold text-slate-800">
                Корректировка проведена:{' '}
                {confirmation.direction === 'credit' ? 'начисление' : 'списание'}{' '}
                {formatSum(confirmation.amount)} — {confirmation.subjectName}
              </span>
              <span className="text-sm text-slate-600">
                Запись добавлена в «Транзакции» как отдельная проводка и зафиксирована в «Журнале
                аудита» с вашим именем ({confirmation.performedBy}),{' '}
                {formatDateTime(confirmation.createdAt)}. Отменить её нельзя — только провести
                обратную корректировку.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setConfirmation(null)}
            className="shrink-0 text-sm font-semibold text-emerald-600 transition hover:underline"
          >
            Скрыть
          </button>
        </div>
      )}

      <PageCard>
        <Toolbar
          search={search}
          onSearchChange={(v) => {
            setSearch(v)
            setPage(1)
          }}
          placeholder="Поиск по компании, физлицу, ИНН, ПИНФЛ, причине или администратору"
          filtersActive={showFilters || filtersActive}
          onToggleFilters={() => setShowFilters((v) => !v)}
        />

        {showFilters && (
          <div className="mt-4 grid grid-cols-1 gap-4 rounded-xl border border-gray-200 bg-gray-50 p-4 sm:grid-cols-3">
            <Select
              label="Направление"
              options={DIRECTION_OPTIONS}
              value={direction}
              onChange={(v) => {
                setDirection(v)
                setPage(1)
              }}
            />
            <Select
              label="Администратор"
              options={ADMIN_OPTIONS}
              value={admin}
              onChange={(v) => {
                setAdmin(v)
                setPage(1)
              }}
            />
            <Input
              label="Дата с"
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value)
                setPage(1)
              }}
            />
            <Input
              label="Дата по"
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value)
                setPage(1)
              }}
            />
            <div className="flex items-end">
              <button
                type="button"
                onClick={resetFilters}
                disabled={!filtersActive}
                className={cn(
                  'pb-2.5 text-sm font-semibold transition',
                  filtersActive ? 'text-Smart-blue hover:underline' : 'cursor-not-allowed text-gray-400',
                )}
              >
                Сбросить фильтры
              </button>
            </div>
          </div>
        )}

        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(a) => a.id}
          emptyMessage="Корректировки не найдены"
        />

        <Pagination
          page={page}
          pageSize={pageSize}
          total={filtered.length}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </PageCard>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title="Новая корректировка баланса"
        maxWidth="max-w-xl"
      >
        <div className="flex flex-col gap-4 px-6 py-5">
          <SubjectPicker
            value={fSubject}
            onChange={setFSubject}
            invalid={touched && subjectInvalid}
          />

          {fSubject && (
            <p className="-mt-2 text-sm text-gray-500">
              Текущий баланс: <b className="font-semibold text-slate-800">{formatSum(fSubject.balance)}</b>
            </p>
          )}

          <div className="flex w-full flex-col items-start gap-1.5">
            <span className="text-sm font-medium leading-5 text-slate-700">Направление</span>
            <SegmentedControl<Direction>
              options={[
                { value: 'credit', label: directionLabel.credit },
                { value: 'debit', label: directionLabel.debit },
              ]}
              value={fDirection}
              onChange={setFDirection}
            />
          </div>

          <Input
            label="Сумма"
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="0"
            value={fAmount}
            onChange={(e) => setFAmount(e.target.value)}
            destructive={touched && amountInvalid}
            hint={
              touched && amountInvalid
                ? 'Укажите сумму больше нуля'
                : amountInvalid
                  ? 'Сумма в сумах, без копеек'
                  : `${fDirection === 'credit' ? 'Начислить' : 'Списать'} ${formatSum(amountValue)}`
            }
          />

          <div className="flex w-full flex-col items-start gap-1.5">
            <label
              htmlFor="adjustment-reason"
              className="text-sm font-medium leading-5 text-slate-700"
            >
              Причина<span className="text-red-500"> *</span>
            </label>
            <div
              className={cn(
                'flex w-full items-center gap-2 overflow-hidden rounded-lg bg-white px-3.5 py-2.5 outline outline-1 outline-offset-[-1px] transition',
                touched && reasonInvalid
                  ? 'outline-red-300 focus-within:outline-red-400'
                  : 'outline-gray-200 focus-within:outline-Smart-blue',
              )}
            >
              <textarea
                id="adjustment-reason"
                rows={3}
                value={fReason}
                onChange={(e) => setFReason(e.target.value)}
                placeholder="Опишите основание корректировки — текст попадёт в журнал аудита"
                className="flex-1 resize-none bg-transparent text-base leading-6 font-normal text-neutral-900 outline-none placeholder:text-gray-500"
              />
            </div>
            <span
              className={cn(
                'text-sm leading-5',
                touched && reasonInvalid ? 'text-red-600' : 'text-gray-500',
              )}
            >
              {touched && reasonInvalid
                ? 'Причина обязательна'
                : 'Обязательное поле — свободный текст'}
            </span>
          </div>

          <div className="flex w-full flex-col items-start gap-1.5">
            <span className="text-sm font-medium leading-5 text-slate-700">
              Вложение <span className="text-gray-500">(необязательно)</span>
            </span>
            <label className="flex w-full cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 transition hover:bg-gray-50">
              <Paperclip className="size-5 shrink-0 text-gray-400" />
              <span
                className={cn('flex-1 text-base', fFileName ? 'text-neutral-900' : 'text-gray-500')}
              >
                {fFileName ?? 'Прикрепить файл-основание'}
              </span>
              <input
                type="file"
                className="hidden"
                onChange={(e) => setFFileName(e.target.files?.[0]?.name ?? null)}
              />
            </label>
          </div>

          <div className="flex items-start gap-2 rounded-lg bg-gray-50 px-3.5 py-2.5">
            <ShieldAlert className="mt-0.5 size-4 shrink-0 text-gray-400" />
            <span className="text-sm text-gray-500">
              Корректировка необратима: она создаёт отдельную проводку в «Транзакциях» и запись в
              «Журнале аудита» с вашим именем и IP-адресом.
            </span>
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="rounded-lg border border-gray-200 px-6 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-gray-50"
            >
              Отменить
            </button>
            <button
              type="button"
              onClick={submitForm}
              className="rounded-lg bg-Smart-green px-6 py-2.5 text-sm font-semibold text-white shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] transition hover:brightness-105"
            >
              Провести корректировку
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
