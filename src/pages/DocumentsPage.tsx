import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Download, ShieldAlert } from 'lucide-react'
import { PageCard, PageHeader } from '@/components/ui/PageCard'
import { DataTable } from '@/components/ui/DataTable'
import type { Column } from '@/components/ui/DataTable'
import { Toolbar } from '@/components/ui/Toolbar'
import { Pagination, paginate, PAGE_SIZES } from '@/components/ui/Pagination'
import { Tabs } from '@/components/ui/Tabs'
import type { TabItem } from '@/components/ui/Tabs'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { ChargeTypeBadge, DocStatusBadge } from '@/components/ui/StatusBadge'
import { documents } from '@/data/mock'
import { DOC_TYPES } from '@/types/admin'
import type { AdminDocument, ChargeType, DocDirection, DocStatus } from '@/types/admin'
import {
  chargeTypeLabel,
  docDirectionLabel,
  docStatusLabel,
} from '@/types/labels'
import { formatDate, formatInn, formatMoney } from '@/lib/format'
import { cn } from '@/lib/cn'

const TYPE_OPTIONS = [
  { value: 'all', label: 'Все типы' },
  ...DOC_TYPES.map((t) => ({ value: t, label: t })),
]

const DIRECTION_OPTIONS = [
  { value: 'all', label: 'Все направления' },
  ...(Object.keys(docDirectionLabel) as DocDirection[]).map((d) => ({
    value: d,
    label: docDirectionLabel[d],
  })),
]

const CHARGE_OPTIONS = [
  { value: 'all', label: 'Все списания' },
  { value: 'none', label: 'Без списания' },
  ...(Object.keys(chargeTypeLabel) as ChargeType[]).map((c) => ({
    value: c,
    label: chargeTypeLabel[c],
  })),
]

const STATUS_OPTIONS = [
  { value: 'all', label: 'Все статусы' },
  ...(Object.keys(docStatusLabel) as DocStatus[]).map((s) => ({
    value: s,
    label: docStatusLabel[s],
  })),
]

const TAB_PILLS: Record<string, string> = {
  all: 'bg-gray-300',
  draft: 'bg-gray-300',
  sent: 'bg-amber-300',
  signed: 'bg-green-400',
  rejected: 'bg-red-500',
  cancelled: 'bg-gray-300',
}

function toCsv(rows: AdminDocument[]): string {
  const header = [
    '№',
    'Тип',
    'Направление',
    'ИНН отправителя',
    'Отправитель',
    'ИНН получателя',
    'Получатель',
    'Статус',
    'Сумма',
    'Создан',
    'Отправлен',
    'Списание',
    'Сумма списания',
  ]
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`
  const lines = rows.map((d) =>
    [
      d.number,
      d.type,
      docDirectionLabel[d.direction],
      d.senderInn,
      d.senderName,
      d.receiverInn,
      d.receiverName,
      docStatusLabel[d.status],
      String(d.amount),
      formatDate(d.createdAt),
      formatDate(d.sentAt),
      d.chargeType ? chargeTypeLabel[d.chargeType] : '',
      String(d.chargeAmount),
    ]
      .map(escape)
      .join(';'),
  )
  return [header.map(escape).join(';'), ...lines].join('\n')
}

export default function DocumentsPage() {
  const navigate = useNavigate()

  const [search, setSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [tab, setTab] = useState('all')

  const [type, setType] = useState('all')
  const [status, setStatus] = useState('all')
  const [direction, setDirection] = useState('all')
  const [charge, setCharge] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [senderInn, setSenderInn] = useState('')
  const [receiverInn, setReceiverInn] = useState('')

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0])

  const filtersActive =
    type !== 'all' ||
    status !== 'all' ||
    direction !== 'all' ||
    charge !== 'all' ||
    dateFrom !== '' ||
    dateTo !== '' ||
    senderInn !== '' ||
    receiverInn !== ''

  /** Everything except the status tab — the tab counts are computed from this. */
  const base = useMemo(() => {
    const q = search.trim().toLowerCase()
    const from = dateFrom ? new Date(dateFrom).getTime() : null
    const to = dateTo ? new Date(dateTo).getTime() + 86_399_999 : null

    return documents.filter((d) => {
      if (type !== 'all' && d.type !== type) return false
      if (status !== 'all' && d.status !== status) return false
      if (direction !== 'all' && d.direction !== direction) return false
      if (charge !== 'all') {
        if (charge === 'none' ? d.chargeType !== null : d.chargeType !== charge) return false
      }
      if (senderInn && !d.senderInn.includes(senderInn.replace(/\s/g, ''))) return false
      if (receiverInn && !d.receiverInn.includes(receiverInn.replace(/\s/g, ''))) return false

      const created = new Date(d.createdAt).getTime()
      if (from !== null && created < from) return false
      if (to !== null && created > to) return false

      if (!q) return true
      return (
        d.number.toLowerCase().includes(q) ||
        d.type.toLowerCase().includes(q) ||
        d.senderName.toLowerCase().includes(q) ||
        d.receiverName.toLowerCase().includes(q) ||
        d.senderInn.includes(q) ||
        d.receiverInn.includes(q)
      )
    })
  }, [search, type, status, direction, charge, dateFrom, dateTo, senderInn, receiverInn])

  const tabs: TabItem[] = useMemo(() => {
    const counts: Record<string, number> = { all: base.length }
    for (const key of Object.keys(docStatusLabel)) counts[key] = 0
    for (const d of base) counts[d.status] += 1
    return [
      { key: 'all', label: 'Все', count: counts.all, pill: TAB_PILLS.all },
      ...(Object.keys(docStatusLabel) as DocStatus[]).map((s) => ({
        key: s,
        label: docStatusLabel[s],
        count: counts[s],
        pill: TAB_PILLS[s],
      })),
    ]
  }, [base])

  const filtered = useMemo(
    () => (tab === 'all' ? base : base.filter((d) => d.status === tab)),
    [base, tab],
  )

  const rows = paginate(filtered, page, pageSize)

  function exportCsv() {
    const blob = new Blob(['﻿' + toCsv(filtered)], {
      type: 'text/csv;charset=utf-8;',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'documents.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  function resetFilters() {
    setType('all')
    setStatus('all')
    setDirection('all')
    setCharge('all')
    setDateFrom('')
    setDateTo('')
    setSenderInn('')
    setReceiverInn('')
    setPage(1)
  }

  const columns: Column<AdminDocument>[] = [
    {
      key: 'number',
      header: '№',
      cell: (d) => (
        <span className="text-sm font-medium whitespace-nowrap text-slate-800">{d.number}</span>
      ),
    },
    {
      key: 'type',
      header: 'Тип',
      cell: (d) => (
        <div className="flex flex-col">
          <span className="text-sm text-gray-900">{d.type}</span>
          <span className="text-xs text-gray-500">{docDirectionLabel[d.direction]}</span>
        </div>
      ),
    },
    {
      key: 'sender',
      header: 'Отправитель',
      cell: (d) => (
        <div className="flex flex-col">
          <span className="text-sm font-medium text-slate-800">{d.senderName}</span>
          <span className="text-xs text-gray-500">ИНН {formatInn(d.senderInn)}</span>
        </div>
      ),
    },
    {
      key: 'receiver',
      header: 'Получатель',
      cell: (d) => (
        <div className="flex flex-col">
          <span className="text-sm font-medium text-slate-800">{d.receiverName}</span>
          <span className="text-xs text-gray-500">ИНН {formatInn(d.receiverInn)}</span>
        </div>
      ),
    },
    { key: 'status', header: 'Статус', cell: (d) => <DocStatusBadge status={d.status} /> },
    {
      key: 'amount',
      header: 'Сумма',
      cls: 'text-right',
      cell: (d) => (
        <span className="text-sm whitespace-nowrap text-gray-900">{formatMoney(d.amount)}</span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Создан',
      cell: (d) => (
        <span className="text-sm whitespace-nowrap text-gray-900">{formatDate(d.createdAt)}</span>
      ),
    },
    {
      key: 'sentAt',
      header: 'Отправлен',
      cell: (d) => (
        <span className="text-sm whitespace-nowrap text-gray-900">{formatDate(d.sentAt)}</span>
      ),
    },
    {
      key: 'charge',
      header: 'Списание',
      cell: (d) => (
        <div className="flex flex-col items-start gap-1">
          <ChargeTypeBadge type={d.chargeType} />
          {d.chargeAmount > 0 && (
            <span className="text-xs text-gray-500">{formatMoney(d.chargeAmount)} сум</span>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Документы"
        subtitle="Реестр всех документов платформы"
      />

      <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <ShieldAlert className="mt-0.5 size-5 shrink-0 text-amber-500" />
        <p className="text-sm text-amber-700">
          Реестр показывает только метаданные. Открытие содержимого документа записывается в журнал
          аудита — фиксируются администратор, документ, время и IP-адрес.
        </p>
      </div>

      <PageCard>
        <Toolbar
          search={search}
          onSearchChange={(v) => {
            setSearch(v)
            setPage(1)
          }}
          placeholder="Поиск по номеру, типу, ИНН или названию контрагента"
          filtersActive={showFilters || filtersActive}
          onToggleFilters={() => setShowFilters((v) => !v)}
        >
          <button
            type="button"
            onClick={exportCsv}
            className="flex shrink-0 items-center gap-2 rounded-lg bg-Smart-blue px-4 py-2.5 text-base font-semibold text-white shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] transition hover:brightness-105"
          >
            <Download className="size-5" />
            Экспорт CSV
          </button>
        </Toolbar>

        {showFilters && (
          <div className="mt-4 grid grid-cols-1 gap-4 rounded-xl border border-gray-200 bg-gray-50 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <Select
              label="Тип документа"
              options={TYPE_OPTIONS}
              value={type}
              onChange={(v) => {
                setType(v)
                setPage(1)
              }}
            />
            <Select
              label="Статус"
              options={STATUS_OPTIONS}
              value={status}
              onChange={(v) => {
                setStatus(v)
                setPage(1)
              }}
            />
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
              label="Тип списания"
              options={CHARGE_OPTIONS}
              value={charge}
              onChange={(v) => {
                setCharge(v)
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
            <Input
              label="ИНН отправителя"
              placeholder="Например, 302145879"
              value={senderInn}
              onChange={(e) => {
                setSenderInn(e.target.value)
                setPage(1)
              }}
            />
            <Input
              label="ИНН получателя"
              placeholder="Например, 305874120"
              value={receiverInn}
              onChange={(e) => {
                setReceiverInn(e.target.value)
                setPage(1)
              }}
            />
            <div className="lg:col-span-4 sm:col-span-2">
              <button
                type="button"
                onClick={resetFilters}
                disabled={!filtersActive}
                className={cn(
                  'text-sm font-semibold transition',
                  filtersActive
                    ? 'text-Smart-blue hover:underline'
                    : 'cursor-not-allowed text-gray-400',
                )}
              >
                Сбросить фильтры
              </button>
            </div>
          </div>
        )}

        <Tabs
          tabs={tabs}
          active={tab}
          onChange={(key) => {
            setTab(key)
            setPage(1)
          }}
        />

        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(d) => d.id}
          onRowClick={(d) => navigate(`/documents/${d.id}`)}
          emptyMessage="Документы не найдены"
        />

        <Pagination
          page={page}
          pageSize={pageSize}
          total={filtered.length}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </PageCard>
    </div>
  )
}
