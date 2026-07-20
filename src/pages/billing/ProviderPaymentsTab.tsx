import { useMemo, useState } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'
import type { Payment, PaymentStatus } from '@/types/admin'
import { PAYMENT_PROVIDERS } from '@/types/admin'
import { payments } from '@/data/mock'
import { paymentStatusLabel } from '@/types/labels'
import { PageCard } from '@/components/ui/PageCard'
import { StatCard } from '@/components/ui/StatCard'
import { DataTable } from '@/components/ui/DataTable'
import type { Column } from '@/components/ui/DataTable'
import { Toolbar } from '@/components/ui/Toolbar'
import { Pagination, paginate, PAGE_SIZES } from '@/components/ui/Pagination'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { PaymentStatusBadge } from '@/components/ui/StatusBadge'
import { formatDateTime, formatInn, formatMoney, formatNumber } from '@/lib/format'

const ANY = 'all'

const PROVIDER_OPTIONS = [
  { value: ANY, label: 'Все провайдеры' },
  ...PAYMENT_PROVIDERS.map((p) => ({ value: p, label: p })),
]

const STATUS_OPTIONS = [
  { value: ANY, label: 'Любой статус' },
  ...(Object.keys(paymentStatusLabel) as PaymentStatus[]).map((s) => ({
    value: s,
    label: paymentStatusLabel[s],
  })),
]

/**
 * Settlement attempts at payment providers. Deliberately says nothing about
 * what the money was for — the point here is the provider's own response, so a
 * failed payment can be proved to be theirs rather than ours.
 */
export function ProviderPaymentsTab() {
  const [search, setSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [provider, setProvider] = useState(ANY)
  const [status, setStatus] = useState(ANY)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0])
  const [inspected, setInspected] = useState<Payment | null>(null)

  /** Manual top-ups never touched a provider, so they are not settlements. */
  const providerPayments = useMemo(
    () =>
      payments
        .filter((p) => p.provider !== null)
        .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
    [],
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return providerPayments.filter((p) => {
      if (provider !== ANY && p.provider !== provider) return false
      if (status !== ANY && p.status !== status) return false
      if (!q) return true
      return (
        p.providerRef.toLowerCase().includes(q) ||
        p.companyName.toLowerCase().includes(q) ||
        p.companyInn.includes(q)
      )
    })
  }, [providerPayments, search, provider, status])

  const stats = useMemo(
    () => ({
      success: filtered.filter((p) => p.status === 'success').length,
      failed: filtered.filter((p) => p.status === 'failed').length,
    }),
    [filtered],
  )

  const rows = paginate(filtered, page, pageSize)

  const columns: Column<Payment>[] = [
    {
      key: 'createdAt',
      header: 'Время',
      cell: (p) => (
        <span className="text-sm whitespace-nowrap text-gray-900">
          {formatDateTime(p.createdAt)}
        </span>
      ),
    },
    {
      key: 'provider',
      header: 'Провайдер',
      cell: (p) => (
        <span className="text-sm font-medium whitespace-nowrap text-slate-800">
          {p.provider}
        </span>
      ),
    },
    {
      key: 'company',
      header: 'Компания',
      cell: (p) => (
        <div className="flex flex-col">
          <span className="text-sm text-slate-800">{p.companyName}</span>
          <span className="text-xs text-gray-500">ИНН {formatInn(p.companyInn)}</span>
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Сумма',
      cls: 'text-right',
      cell: (p) => (
        <span className="text-sm font-medium whitespace-nowrap tabular-nums text-slate-800">
          {formatMoney(p.amount)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Статус',
      cell: (p) => <PaymentStatusBadge status={p.status} />,
    },
    {
      key: 'payload',
      header: '',
      cls: 'w-28',
      cell: (p) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setInspected(p)
          }}
          className="text-sm font-semibold whitespace-nowrap text-Smart-blue transition hover:underline"
        >
          Ответ JSON
        </button>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 lg:flex-row">
        <StatCard
          value={formatNumber(stats.success)}
          label="Успешные"
          icon={CheckCircle2}
          iconBg="bg-green-100"
          iconColor="text-emerald-600"
        />
        <StatCard
          value={formatNumber(stats.failed)}
          label="Ошибки"
          icon={XCircle}
          iconBg="bg-red-100"
          iconColor="text-red-600"
        />
      </div>

      <PageCard>
        <Toolbar
          search={search}
          onSearchChange={(v) => {
            setSearch(v)
            setPage(1)
          }}
          placeholder="Поиск по ссылке провайдера, компании или ИНН"
          filtersActive={showFilters || provider !== ANY || status !== ANY}
          onToggleFilters={() => setShowFilters((v) => !v)}
        />

        {showFilters && (
          <div className="mt-4 grid grid-cols-1 gap-4 rounded-xl border border-gray-200 bg-gray-50 p-4 sm:grid-cols-2">
            <Select
              label="Провайдер"
              options={PROVIDER_OPTIONS}
              value={provider}
              onChange={(v) => {
                setProvider(v)
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
          </div>
        )}

        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(p) => p.id}
          onRowClick={(p) => setInspected(p)}
          emptyMessage="Платежи не найдены"
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
        open={inspected !== null}
        onClose={() => setInspected(null)}
        title="Ответ платёжного провайдера"
        maxWidth="max-w-2xl"
      >
        {inspected && (
          <div className="flex flex-col gap-4 px-6 py-5">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-gray-500">Провайдер</span>
                <span className="text-sm font-medium text-slate-800">
                  {inspected.provider}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-gray-500">Сумма</span>
                <span className="text-sm font-medium text-slate-800 tabular-nums">
                  {formatMoney(inspected.amount)}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-gray-500">Время</span>
                <span className="text-sm text-slate-800">
                  {formatDateTime(inspected.createdAt)}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-gray-500">Статус</span>
                <PaymentStatusBadge status={inspected.status} />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm leading-5 font-medium text-slate-700">
                  Тело ответа
                </span>
                <button
                  type="button"
                  onClick={() => navigator.clipboard?.writeText(inspected.rawResponse)}
                  className="text-sm font-semibold text-Smart-blue transition hover:underline"
                >
                  Скопировать
                </button>
              </div>
              <pre className="max-h-80 overflow-auto rounded-lg border border-gray-200 bg-gray-50 p-4 font-mono text-xs whitespace-pre text-slate-800">
                {inspected.rawResponse}
              </pre>
              <span className="text-sm text-gray-500">
                Ответ сохранён в том виде, в котором получен от провайдера.
              </span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
