import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle2, FileClock, Receipt, Users, X } from 'lucide-react'
import { PageCard, PageHeader } from '@/components/ui/PageCard'
import { StatCard } from '@/components/ui/StatCard'
import { DataTable } from '@/components/ui/DataTable'
import type { Column } from '@/components/ui/DataTable'
import { Toolbar } from '@/components/ui/Toolbar'
import { Tabs } from '@/components/ui/Tabs'
import { Pagination, paginate, PAGE_SIZES } from '@/components/ui/Pagination'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { ServiceInvoiceStatusBadge } from '@/components/ui/StatusBadge'
import { currentAdmin } from '@/data/mock'
import { createInvoiceDrafts, openUsage, useServiceInvoices } from '@/data/invoices'
import type { OpenUsage, Payer, ServiceInvoice } from '@/data/invoices'
import type { ServiceInvoiceStatus } from '@/types/admin'
import { serviceInvoiceStatusLabel } from '@/types/labels'
import { formatCompactSum, formatDate, formatMoney, formatNumber, formatSum } from '@/lib/format'
import {
  CreateInvoicesDialog,
  CutoffInput,
  TODAY,
  cutoffEnd,
  parseCutoff,
  payerKindLabel,
  rangeLabel,
  sumOf,
  taxIdLabel,
} from './invoiceShared'

const ANY = 'all'

const PAYER_OPTIONS = [
  { value: ANY, label: 'Все плательщики' },
  { value: 'company', label: 'Компании' },
  { value: 'individual', label: 'Физические лица' },
]

const STATUS_OPTIONS = [
  { value: ANY, label: 'Любой статус' },
  ...(Object.keys(serviceInvoiceStatusLabel) as ServiceInvoiceStatus[]).map((s) => ({
    value: s,
    label: serviceInvoiceStatusLabel[s],
  })),
]

const PAGE_TABS = [
  { key: 'open', label: 'К выставлению', pill: 'bg-amber-400' },
  { key: 'invoices', label: 'Счета-фактуры', pill: 'bg-gray-300' },
]

function matchesPayer(payer: Payer, kind: string, q: string): boolean {
  if (kind !== ANY && payer.payerKind !== kind) return false
  return !q || payer.payerName.toLowerCase().includes(q) || payer.payerTaxId.includes(q)
}

function PayerCell({ payer }: { payer: Payer }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-medium text-slate-800">{payer.payerName}</span>
      <span className="text-xs whitespace-nowrap text-gray-500">{taxIdLabel(payer)}</span>
    </div>
  )
}

/** Payers with operations no live faktura covers, summed up to the chosen date. */
function OpenUsageTab({
  rows,
  cutoff,
  onCutoffChange,
  onCreated,
}: {
  rows: OpenUsage[]
  cutoff: string
  onCutoffChange: (value: string) => void
  onCreated: (created: { count: number; total: number }) => void
}) {
  const [search, setSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [payerKind, setPayerKind] = useState(ANY)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0])

  const navigate = useNavigate()
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  /** Rows awaiting confirmation before their drafts are created. */
  const [pending, setPending] = useState<OpenUsage[] | null>(null)

  function resetPage<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v)
      setPage(1)
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((row) => matchesPayer(row, payerKind, q))
  }, [rows, search, payerKind])

  const pageRows = paginate(filtered, page, pageSize)
  const selectedRows = rows.filter((row) => selected.has(row.payerId))
  const allSelected = filtered.length > 0 && filtered.every((row) => selected.has(row.payerId))

  function toggle(id: string, on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (on) next.add(id)
      else next.delete(id)
      return next
    })
  }

  function toggleAll(on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev)
      for (const row of filtered) {
        if (on) next.add(row.payerId)
        else next.delete(row.payerId)
      }
      return next
    })
  }

  function confirmCreate(created: OpenUsage[]) {
    createInvoiceDrafts(created, currentAdmin.fullName)
    onCreated({ count: created.length, total: sumOf(created) })
    setSelected(new Set())
    setPage(1)
  }

  /** The detail page sums up to the same day the list does. */
  const detailPath = (row: OpenUsage) =>
    `/billing/invoices/open/${row.payerId}${cutoff === TODAY ? '' : `?through=${cutoff}`}`

  const columns: Column<OpenUsage>[] = [
    {
      key: 'select',
      header: <Checkbox checked={allSelected} onChange={toggleAll} />,
      cls: 'w-10',
      cell: (row) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={selected.has(row.payerId)}
            onChange={(on) => toggle(row.payerId, on)}
          />
        </div>
      ),
    },
    { key: 'payer', header: 'Плательщик', cell: (row) => <PayerCell payer={row} /> },
    {
      key: 'kind',
      header: 'Тип',
      cell: (row) => <span className="whitespace-nowrap text-gray-600">{payerKindLabel(row)}</span>,
    },
    {
      key: 'range',
      header: 'Период операций',
      cell: (row) => (
        <div className="flex flex-col gap-0.5">
          <span className="whitespace-nowrap">{rangeLabel(row)}</span>
          {row.rejected && (
            <span className="text-xs whitespace-nowrap text-red-600">
              Отклонена № {row.rejected.number}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'operations',
      header: 'Операций',
      cls: 'text-right',
      cell: (row) => <span className="tabular-nums">{formatNumber(row.operations.length)}</span>,
    },
    {
      key: 'total',
      header: 'К выставлению',
      cls: 'text-right',
      cell: (row) => (
        <span className="font-semibold whitespace-nowrap tabular-nums text-slate-800">
          {formatMoney(row.total)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      cls: 'text-right',
      cell: (row) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Button
            hierarchy="secondary-gray"
            size="sm"
            className="whitespace-nowrap"
            onClick={() => setPending([row])}
          >
            Создать фактуру
          </Button>
        </div>
      ),
    },
  ]

  return (
    <PageCard>
      <Toolbar
        search={search}
        onSearchChange={resetPage(setSearch)}
        placeholder="Поиск по названию, ИНН или ПИНФЛ"
        filtersActive={showFilters || payerKind !== ANY}
        onToggleFilters={() => setShowFilters((v) => !v)}
      >
        <CutoffInput
          value={cutoff}
          onChange={(value) => {
            onCutoffChange(value)
            setSelected(new Set())
            setPage(1)
          }}
        />
        <Button
          size="md"
          className="h-11 whitespace-nowrap"
          disabled={rows.length === 0}
          onClick={() => setPending(rows)}
        >
          Создать все ({formatNumber(rows.length)})
        </Button>
      </Toolbar>

      {showFilters && (
        <div className="mt-4 grid grid-cols-1 gap-4 rounded-xl border border-gray-200 bg-gray-50 p-4 sm:grid-cols-3">
          <Select
            label="Тип плательщика"
            options={PAYER_OPTIONS}
            value={payerKind}
            onChange={resetPage(setPayerKind)}
          />
        </div>
      )}

      {selectedRows.length > 0 && (
        <div className="mt-4 flex items-center gap-4 rounded-xl border border-Smart-blue/30 bg-Smart-blue/5 px-4 py-3">
          <span className="flex-1 text-sm text-slate-700">
            Выбрано: <b className="font-semibold">{formatNumber(selectedRows.length)}</b> ·{' '}
            <b className="font-semibold">{formatSum(sumOf(selectedRows))}</b>
          </span>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="text-sm font-semibold text-slate-600 transition hover:underline"
          >
            Снять выбор
          </button>
          <Button size="sm" onClick={() => setPending(selectedRows)}>
            Создать фактуры ({formatNumber(selectedRows.length)})
          </Button>
        </div>
      )}

      <DataTable
        columns={columns}
        rows={pageRows}
        rowKey={(row) => row.payerId}
        onRowClick={(row) => navigate(detailPath(row))}
        emptyMessage={
          rows.length === 0
            ? 'Все операции до этой даты уже покрыты фактурами'
            : 'Плательщики не найдены'
        }
      />

      <Pagination
        page={page}
        pageSize={pageSize}
        total={filtered.length}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />

      <CreateInvoicesDialog
        rows={pending}
        cutoff={cutoff}
        onClose={() => setPending(null)}
        onConfirm={confirmCreate}
      />
    </PageCard>
  )
}

/** Every faktura created so far, with the status Smartup24 Doc reports. */
function InvoicesTab({ invoices }: { invoices: ServiceInvoice[] }) {
  const [search, setSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [payerKind, setPayerKind] = useState(ANY)
  const [status, setStatus] = useState(ANY)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0])
  const navigate = useNavigate()

  function resetPage<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v)
      setPage(1)
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return invoices.filter((invoice) => {
      if (status !== ANY && invoice.status !== status) return false
      if (payerKind !== ANY && invoice.payerKind !== payerKind) return false
      return !q || matchesPayer(invoice, ANY, q) || invoice.number.toLowerCase().includes(q)
    })
  }, [invoices, search, status, payerKind])

  const columns: Column<ServiceInvoice>[] = [
    {
      key: 'number',
      header: 'Фактура',
      cell: (invoice) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-medium whitespace-nowrap text-slate-800">№ {invoice.number}</span>
          <span className="text-xs whitespace-nowrap text-gray-500">
            от {formatDate(invoice.createdAt)}
          </span>
        </div>
      ),
    },
    { key: 'payer', header: 'Плательщик', cell: (invoice) => <PayerCell payer={invoice} /> },
    {
      key: 'range',
      header: 'Период операций',
      cell: (invoice) => <span className="whitespace-nowrap">{rangeLabel(invoice)}</span>,
    },
    {
      key: 'operations',
      header: 'Операций',
      cls: 'text-right',
      cell: (invoice) => (
        <span className="tabular-nums">{formatNumber(invoice.operations.length)}</span>
      ),
    },
    {
      key: 'total',
      header: 'Сумма',
      cls: 'text-right',
      cell: (invoice) => (
        <span className="font-semibold whitespace-nowrap tabular-nums text-slate-800">
          {formatMoney(invoice.total)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Статус',
      cell: (invoice) => <ServiceInvoiceStatusBadge status={invoice.status} />,
    },
  ]

  return (
    <PageCard>
      <Toolbar
        search={search}
        onSearchChange={resetPage(setSearch)}
        placeholder="Поиск по номеру фактуры, названию, ИНН или ПИНФЛ"
        filtersActive={showFilters || status !== ANY || payerKind !== ANY}
        onToggleFilters={() => setShowFilters((v) => !v)}
      />

      {showFilters && (
        <div className="mt-4 grid grid-cols-1 gap-4 rounded-xl border border-gray-200 bg-gray-50 p-4 sm:grid-cols-3">
          <Select
            label="Статус"
            options={STATUS_OPTIONS}
            value={status}
            onChange={resetPage(setStatus)}
          />
          <Select
            label="Тип плательщика"
            options={PAYER_OPTIONS}
            value={payerKind}
            onChange={resetPage(setPayerKind)}
          />
        </div>
      )}

      <DataTable
        columns={columns}
        rows={paginate(filtered, page, pageSize)}
        rowKey={(invoice) => invoice.id}
        onRowClick={(invoice) => navigate(`/billing/invoices/${invoice.id}`)}
        emptyMessage="Счета-фактуры не найдены"
      />

      <Pagination
        page={page}
        pageSize={pageSize}
        total={filtered.length}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />

    </PageCard>
  )
}

export default function InvoicesPage() {
  const invoices = useServiceInvoices()

  // Tab and cutoff live in the URL, so coming back from a detail page restores them.
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'invoices' ? 'invoices' : 'open'
  const cutoff = parseCutoff(params.get('through'))
  const [created, setCreated] = useState<{ count: number; total: number } | null>(null)

  function patchParams(patch: { tab?: string; through?: string }) {
    const next = { tab, through: cutoff, ...patch }
    setParams(
      {
        ...(next.tab === 'invoices' && { tab: next.tab }),
        ...(next.through !== TODAY && { through: next.through }),
      },
      { replace: true },
    )
  }
  const setTab = (key: string) => patchParams({ tab: key })
  const setCutoff = (value: string) => patchParams({ through: value })

  const open = useMemo(() => openUsage(invoices, cutoffEnd(cutoff)), [invoices, cutoff])
  const inProgress = invoices.filter((i) => i.status === 'draft' || i.status === 'sent')
  const counts: Record<string, number> = { open: open.length, invoices: invoices.length }

  return (
    <div className="flex flex-col gap-4">
      <PageCard>
        <PageHeader
          title="Счета-фактуры за услуги"
          subtitle="Операции, по которым фактура ещё не выставлена или была отклонена, суммируются по каждому плательщику. Фактура создаётся черновиком в нашем аккаунте Smartup24 Doc — клиент получает её после подписи бухгалтером."
        />
        <Tabs
          tabs={PAGE_TABS.map((t) => ({ ...t, count: counts[t.key] }))}
          active={tab}
          onChange={setTab}
        />
      </PageCard>

      {created && (
        <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
          <span className="flex-1 text-sm text-emerald-700">
            Создано черновиков: <b className="font-semibold">{formatNumber(created.count)}</b> на{' '}
            <b className="font-semibold">{formatSum(created.total)}</b>. Они ждут подписи в
            разделе «Черновики» Smartup24 Doc.
          </span>
          {tab === 'open' && (
            <button
              type="button"
              onClick={() => setTab('invoices')}
              className="text-sm font-semibold whitespace-nowrap text-emerald-700 transition hover:underline"
            >
              Показать фактуры
            </button>
          )}
          <button
            type="button"
            onClick={() => setCreated(null)}
            aria-label="Скрыть"
            className="mt-0.5 text-emerald-600 transition hover:text-emerald-800"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      <div className="flex flex-col gap-4 lg:flex-row">
        <StatCard
          value={formatCompactSum(sumOf(open))}
          label={`Не выставлено по ${formatDate(cutoff)}`}
          icon={Receipt}
          iconBg="bg-amber-50"
          iconColor="text-amber-500"
        />
        <StatCard
          value={formatNumber(open.length)}
          label="Плательщиков к выставлению"
          icon={Users}
        />
        <StatCard
          value={formatCompactSum(sumOf(inProgress))}
          label={`Ждут подписи: ${formatNumber(inProgress.length)}`}
          icon={FileClock}
          iconBg="bg-gray-100"
          iconColor="text-gray-500"
        />
      </div>

      {tab === 'open' ? (
        <OpenUsageTab
          rows={open}
          cutoff={cutoff}
          onCutoffChange={setCutoff}
          onCreated={setCreated}
        />
      ) : (
        <InvoicesTab invoices={invoices} />
      )}
    </div>
  )
}
