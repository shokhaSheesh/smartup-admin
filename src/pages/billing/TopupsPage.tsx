import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Building2,
  CreditCard,
  Eye,
  RefreshCw,
  TrendingUp,
  Wallet,
  XCircle,
} from 'lucide-react'
import { PageCard, PageHeader, Field } from '@/components/ui/PageCard'
import { DataTable } from '@/components/ui/DataTable'
import type { Column } from '@/components/ui/DataTable'
import { Toolbar } from '@/components/ui/Toolbar'
import { Pagination, paginate, PAGE_SIZES } from '@/components/ui/Pagination'
import { StatCard } from '@/components/ui/StatCard'
import { Tabs } from '@/components/ui/Tabs'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { PaymentStatusBadge } from '@/components/ui/StatusBadge'
import { RowMenu } from '@/components/ui/RowMenu'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { balances, payments } from '@/data/mock'
import type { BalanceAccount, Payment, PaymentMethod, PaymentStatus } from '@/types/admin'
import { paymentMethodLabel, paymentStatusLabel } from '@/types/labels'
import { formatDate, formatDateTime, formatInn, formatMoney, formatNumber, formatSum } from '@/lib/format'
import { cn } from '@/lib/cn'

/** Balances below this are surfaced as at-risk — sending stops when funds run out. */
const LOW_BALANCE = 100_000
const CRITICAL_BALANCE = 20_000

const STATUS_OPTIONS = [
  { value: 'all', label: 'Все статусы' },
  ...(Object.keys(paymentStatusLabel) as PaymentStatus[]).map((s) => ({
    value: s,
    label: paymentStatusLabel[s],
  })),
]

const METHOD_OPTIONS = [
  { value: 'all', label: 'Все методы' },
  ...(Object.keys(paymentMethodLabel) as PaymentMethod[]).map((m) => ({
    value: m,
    label: paymentMethodLabel[m],
  })),
]

function balanceTone(balance: number): string {
  if (balance < CRITICAL_BALANCE) return 'text-red-600'
  if (balance < LOW_BALANCE) return 'text-amber-500'
  return 'text-slate-800'
}

const DAY = 86_400_000

export default function TopupsPage() {
  const navigate = useNavigate()

  const [tab, setTab] = useState<'balances' | 'payments'>('balances')

  /* ---------------------------------------------------------- balances tab */
  const [balanceSearch, setBalanceSearch] = useState('')
  const [balancePage, setBalancePage] = useState(1)
  const [balancePageSize, setBalancePageSize] = useState(PAGE_SIZES[0])

  /* ---------------------------------------------------------- payments tab */
  const [paymentSearch, setPaymentSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [status, setStatus] = useState('all')
  const [method, setMethod] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [amountFrom, setAmountFrom] = useState('')
  const [amountTo, setAmountTo] = useState('')
  const [paymentPage, setPaymentPage] = useState(1)
  const [paymentPageSize, setPaymentPageSize] = useState(PAGE_SIZES[0])

  const [detail, setDetail] = useState<Payment | null>(null)
  const [retryTarget, setRetryTarget] = useState<Payment | null>(null)
  /** Locally reconciled payments — nothing is persisted in this prototype. */
  const [reconciled, setReconciled] = useState<Record<string, PaymentStatus>>({})
  const [notice, setNotice] = useState<string | null>(null)

  const statusOf = (p: Payment): PaymentStatus => reconciled[p.id] ?? p.status

  /* -------------------------------------------------------------------- kpi */
  const kpi = useMemo(() => {
    const liability = balances.reduce((sum, b) => sum + b.balance, 0)
    const cutoff = Date.now() - 30 * DAY
    const recent = payments.filter(
      (p) => p.status === 'success' && +new Date(p.createdAt) >= cutoff,
    )
    const recentTotal = recent.reduce((sum, p) => sum + p.amount, 0)
    const successful = payments.filter((p) => p.status === 'success')
    const avg = successful.length
      ? successful.reduce((sum, p) => sum + p.amount, 0) / successful.length
      : 0
    return {
      liability,
      recentTotal,
      recentCount: recent.length,
      failed: payments.filter((p) => p.status === 'failed').length,
      avg,
    }
  }, [])

  /* ------------------------------------------------------- balances filter */
  const filteredBalances = useMemo(() => {
    const q = balanceSearch.trim().toLowerCase()
    if (!q) return balances
    return balances.filter(
      (b) => b.companyName.toLowerCase().includes(q) || b.companyInn.includes(q),
    )
  }, [balanceSearch])

  const balanceRows = paginate(filteredBalances, balancePage, balancePageSize)

  /* ------------------------------------------------------- payments filter */
  const filtersActive =
    status !== 'all' ||
    method !== 'all' ||
    dateFrom !== '' ||
    dateTo !== '' ||
    amountFrom !== '' ||
    amountTo !== ''

  const filteredPayments = useMemo(() => {
    const q = paymentSearch.trim().toLowerCase()
    const min = amountFrom === '' ? null : Number(amountFrom)
    const max = amountTo === '' ? null : Number(amountTo)
    const from = dateFrom === '' ? null : +new Date(dateFrom)
    const to = dateTo === '' ? null : +new Date(dateTo) + DAY

    return payments.filter((p) => {
      if (status !== 'all' && (reconciled[p.id] ?? p.status) !== status) return false
      if (method !== 'all' && p.method !== method) return false
      const t = +new Date(p.createdAt)
      if (from !== null && t < from) return false
      if (to !== null && t >= to) return false
      if (min !== null && !Number.isNaN(min) && p.amount < min) return false
      if (max !== null && !Number.isNaN(max) && p.amount > max) return false
      if (!q) return true
      return (
        p.companyName.toLowerCase().includes(q) ||
        p.companyInn.includes(q) ||
        p.providerRef.toLowerCase().includes(q) ||
        (p.cardMask ?? '').includes(q)
      )
    })
  }, [paymentSearch, status, method, dateFrom, dateTo, amountFrom, amountTo, reconciled])

  const paymentRows = paginate(filteredPayments, paymentPage, paymentPageSize)

  function resetPayments() {
    setStatus('all')
    setMethod('all')
    setDateFrom('')
    setDateTo('')
    setAmountFrom('')
    setAmountTo('')
    setPaymentPage(1)
  }

  function retryPayment(reason: string) {
    if (!retryTarget) return
    void reason // in a real build the reason travels to the audit log
    setReconciled((prev) => ({ ...prev, [retryTarget.id]: 'pending' }))
    setNotice(
      `Платёж ${retryTarget.providerRef} отправлен на сверку с провайдером. Результат появится в журнале аудита.`,
    )
    setRetryTarget(null)
  }

  /* ---------------------------------------------------------------- columns */
  const balanceColumns: Column<BalanceAccount>[] = [
    {
      key: 'company',
      header: 'Компания',
      cell: (b) => (
        <div className="flex flex-col">
          <span className="text-sm font-medium text-slate-800">{b.companyName}</span>
          <span className="text-xs text-gray-500">ИНН {formatInn(b.companyInn)}</span>
        </div>
      ),
    },
    {
      key: 'balance',
      header: 'Текущий баланс',
      cls: 'text-right',
      cell: (b) => (
        <span
          className={cn(
            'text-sm font-semibold whitespace-nowrap tabular-nums',
            balanceTone(b.balance),
          )}
        >
          {formatMoney(b.balance)}
        </span>
      ),
    },
    {
      key: 'lastTopUp',
      header: 'Последнее пополнение',
      cell: (b) => (
        <span className="text-sm whitespace-nowrap text-gray-900">{formatDate(b.lastTopUpAt)}</span>
      ),
    },
    {
      key: 'toppedUp',
      header: 'Всего пополнено',
      cls: 'text-right',
      cell: (b) => (
        <span className="text-sm whitespace-nowrap tabular-nums text-gray-900">
          {formatMoney(b.totalToppedUp)}
        </span>
      ),
    },
    {
      key: 'consumed',
      header: 'Всего израсходовано',
      cls: 'text-right',
      cell: (b) => (
        <span className="text-sm whitespace-nowrap tabular-nums text-gray-900">
          {formatMoney(b.totalConsumed)}
        </span>
      ),
    },
    {
      key: 'freeAllowance',
      header: 'Бесплатный лимит',
      cell: (b) => (
        <span className="text-sm whitespace-nowrap text-gray-900">
          {b.freeAllowanceUsed} / {b.freeAllowanceTotal}
          <span className="ml-1 text-xs text-gray-500">док.</span>
        </span>
      ),
    },
  ]

  const paymentColumns: Column<Payment>[] = [
    {
      key: 'date',
      header: 'Дата',
      cell: (p) => (
        <span className="text-sm whitespace-nowrap text-gray-900">{formatDateTime(p.createdAt)}</span>
      ),
    },
    {
      key: 'company',
      header: 'Компания',
      cell: (p) => (
        <div className="flex flex-col">
          <span className="text-sm font-medium text-slate-800">{p.companyName}</span>
          <span className="text-xs text-gray-500">ИНН {formatInn(p.companyInn)}</span>
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Сумма',
      cls: 'text-right',
      cell: (p) => (
        <span className="text-sm font-semibold whitespace-nowrap tabular-nums text-slate-800">
          {formatMoney(p.amount)}
        </span>
      ),
    },
    {
      key: 'method',
      header: 'Метод',
      cell: (p) => (
        <span className="text-sm whitespace-nowrap text-gray-900">{paymentMethodLabel[p.method]}</span>
      ),
    },
    {
      key: 'ref',
      header: 'Ссылка платежа',
      cell: (p) => (
        <span className="font-mono text-xs whitespace-nowrap text-gray-600">{p.providerRef}</span>
      ),
    },
    { key: 'status', header: 'Статус', cell: (p) => <PaymentStatusBadge status={statusOf(p)} /> },
    {
      key: 'card',
      header: 'Маска карты',
      cell: (p) => (
        <span className="text-sm whitespace-nowrap text-gray-900">{p.cardMask ?? '—'}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      cls: 'w-12',
      cell: (p) => (
        <div onClick={(e) => e.stopPropagation()}>
          <RowMenu
            items={[
              {
                label: 'Детали платежа',
                icon: <Eye className="size-4" />,
                onClick: () => setDetail(p),
              },
              {
                label: 'Открыть компанию',
                icon: <Building2 className="size-4" />,
                onClick: () => navigate(`/tenants/${p.companyId}`),
              },
              {
                label: 'Повторить/сверить',
                icon: <RefreshCw className="size-4" />,
                disabled: statusOf(p) !== 'failed',
                onClick: () => setRetryTarget(p),
              },
            ]}
          />
        </div>
      ),
    },
  ]

  const lowBalanceCount = balances.filter((b) => b.balance < LOW_BALANCE).length

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Балансы и пополнения"
        subtitle={`Предоплаченные средства клиентов и история платежей — ${formatNumber(balances.length)} счетов, ${formatNumber(payments.length)} платежей`}
      />

      <div className="flex flex-wrap gap-4">
        <StatCard
          value={formatSum(kpi.liability)}
          label="Всего балансов у клиентов"
          icon={Wallet}
          iconBg="bg-blue-50"
          iconColor="text-Smart-blue"
        />
        <StatCard
          value={formatSum(kpi.recentTotal)}
          label={`Пополнений за 30 дней · ${formatNumber(kpi.recentCount)} шт.`}
          icon={TrendingUp}
          iconBg="bg-green-100"
          iconColor="text-emerald-600"
        />
        <StatCard
          value={formatNumber(kpi.failed)}
          label="Неуспешных платежей"
          icon={XCircle}
          iconBg="bg-red-100"
          iconColor="text-red-600"
        />
        <StatCard
          value={formatSum(kpi.avg)}
          label="Средний чек пополнения"
          icon={CreditCard}
          iconBg="bg-gray-50"
          iconColor="text-gray-400"
        />
      </div>

      {notice && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-Smart-blue/30 bg-Smart-blue/5 px-4 py-3">
          <span className="text-sm text-slate-700">{notice}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="text-sm font-semibold text-Smart-blue transition hover:underline"
          >
            Скрыть
          </button>
        </div>
      )}

      <PageCard>
        <Tabs
          tabs={[
            { key: 'balances', label: 'Балансы', count: balances.length },
            {
              key: 'payments',
              label: 'Пополнения',
              count: payments.length,
              pill: 'bg-green-400',
            },
          ]}
          active={tab}
          onChange={(k) => setTab(k as 'balances' | 'payments')}
        />

        {tab === 'balances' ? (
          <div className="mt-4">
            <Toolbar
              search={balanceSearch}
              onSearchChange={(v) => {
                setBalanceSearch(v)
                setBalancePage(1)
              }}
              placeholder="Поиск по ИНН или названию компании"
            />

            <p className="mt-3 text-sm text-gray-500">
              Балансы ниже {formatSum(LOW_BALANCE)} выделены — при нулевом балансе отправка
              документов у клиента блокируется.{' '}
              <b className="font-semibold text-amber-500">{lowBalanceCount}</b> компаний в зоне
              риска.
            </p>

            <DataTable
              columns={balanceColumns}
              rows={balanceRows}
              rowKey={(b) => b.companyId}
              onRowClick={(b) => navigate(`/tenants/${b.companyId}`)}
              emptyMessage="Балансы не найдены"
            />

            <Pagination
              page={balancePage}
              pageSize={balancePageSize}
              total={filteredBalances.length}
              onPageChange={setBalancePage}
              onPageSizeChange={setBalancePageSize}
            />
          </div>
        ) : (
          <div className="mt-4">
            <Toolbar
              search={paymentSearch}
              onSearchChange={(v) => {
                setPaymentSearch(v)
                setPaymentPage(1)
              }}
              placeholder="Поиск по компании, ИНН, ссылке платежа или карте"
              filtersActive={showFilters || filtersActive}
              onToggleFilters={() => setShowFilters((v) => !v)}
            />

            {showFilters && (
              <div className="mt-4 grid grid-cols-1 gap-4 rounded-xl border border-gray-200 bg-gray-50 p-4 sm:grid-cols-3">
                <Select
                  label="Статус"
                  options={STATUS_OPTIONS}
                  value={status}
                  onChange={(v) => {
                    setStatus(v)
                    setPaymentPage(1)
                  }}
                />
                <Select
                  label="Метод"
                  options={METHOD_OPTIONS}
                  value={method}
                  onChange={(v) => {
                    setMethod(v)
                    setPaymentPage(1)
                  }}
                />
                <div />
                <Input
                  label="Дата с"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value)
                    setPaymentPage(1)
                  }}
                />
                <Input
                  label="Дата по"
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value)
                    setPaymentPage(1)
                  }}
                />
                <div />
                <Input
                  label="Сумма от"
                  type="number"
                  inputMode="numeric"
                  placeholder="0"
                  value={amountFrom}
                  onChange={(e) => {
                    setAmountFrom(e.target.value)
                    setPaymentPage(1)
                  }}
                />
                <Input
                  label="Сумма до"
                  type="number"
                  inputMode="numeric"
                  placeholder="Без ограничения"
                  value={amountTo}
                  onChange={(e) => {
                    setAmountTo(e.target.value)
                    setPaymentPage(1)
                  }}
                />
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={resetPayments}
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

            <DataTable
              columns={paymentColumns}
              rows={paymentRows}
              rowKey={(p) => p.id}
              onRowClick={(p) => setDetail(p)}
              emptyMessage="Пополнения не найдены"
            />

            <Pagination
              page={paymentPage}
              pageSize={paymentPageSize}
              total={filteredPayments.length}
              onPageChange={setPaymentPage}
              onPageSizeChange={setPaymentPageSize}
            />
          </div>
        )}
      </PageCard>

      <Modal
        open={detail !== null}
        onClose={() => setDetail(null)}
        title="Детали платежа"
        maxWidth="max-w-xl"
      >
        {detail && (
          <div className="flex flex-col gap-5 px-6 py-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Идентификатор">
                <span className="font-mono text-xs">{detail.id}</span>
              </Field>
              <Field label="Ссылка платежа">
                <span className="font-mono text-xs">{detail.providerRef}</span>
              </Field>
              <Field label="Дата и время">{formatDateTime(detail.createdAt)}</Field>
              <Field label="Статус">
                <PaymentStatusBadge status={statusOf(detail)} />
              </Field>
              <Field label="Компания">{detail.companyName}</Field>
              <Field label="ИНН">{formatInn(detail.companyInn)}</Field>
              <Field label="Сумма">
                <span className="font-semibold tabular-nums">{formatSum(detail.amount)}</span>
              </Field>
              <Field label="Метод">{paymentMethodLabel[detail.method]}</Field>
              <Field label="Маска карты">{detail.cardMask ?? '—'}</Field>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  const id = detail.companyId
                  setDetail(null)
                  navigate(`/tenants/${id}`)
                }}
                className="rounded-lg border border-gray-200 px-6 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-gray-50"
              >
                Открыть компанию
              </button>
              <button
                type="button"
                onClick={() => setDetail(null)}
                className="rounded-lg bg-Smart-blue px-6 py-2.5 text-sm font-semibold text-white shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] transition hover:brightness-105"
              >
                Закрыть
              </button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={retryTarget !== null}
        onClose={() => setRetryTarget(null)}
        onConfirm={retryPayment}
        title="Повторить или сверить платёж"
        confirmLabel="Отправить на сверку"
        description={
          retryTarget && (
            <span>
              Платёж <b className="font-semibold text-slate-800">{retryTarget.providerRef}</b> на{' '}
              {formatSum(retryTarget.amount)} для{' '}
              <b className="font-semibold text-slate-800">{retryTarget.companyName}</b> будет
              повторно запрошен у платёжного провайдера. Баланс клиента изменится только после
              подтверждения от провайдера.
            </span>
          )
        }
      />
    </div>
  )
}
