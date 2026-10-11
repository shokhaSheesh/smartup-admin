import { useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, RotateCcw } from 'lucide-react'
import { FormCard, Field, PageCard, PageHeader } from '@/components/ui/PageCard'
import { DataTable } from '@/components/ui/DataTable'
import type { Column } from '@/components/ui/DataTable'
import { Toolbar } from '@/components/ui/Toolbar'
import { Pagination, paginate, PAGE_SIZES } from '@/components/ui/Pagination'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { ServiceInvoiceStatusBadge } from '@/components/ui/StatusBadge'
import { currentAdmin } from '@/data/mock'
import { createInvoiceDrafts, openUsage, useServiceInvoices } from '@/data/invoices'
import type { OpenUsage, UsageOperation } from '@/data/invoices'
import { txTypeLabel } from '@/types/labels'
import { formatDate, formatDateTime, formatMoney, formatNumber, formatSum } from '@/lib/format'
import {
  CreateInvoicesDialog,
  CutoffInput,
  InvoiceSteps,
  TODAY,
  cutoffEnd,
  parseCutoff,
  payerKindLabel,
  rangeLabel,
  taxIdLabel,
} from './invoiceShared'

const ANY = 'all'

const TYPE_OPTIONS = [
  { value: ANY, label: 'Все операции' },
  { value: 'subscription_payment', label: txTypeLabel.subscription_payment },
  { value: 'document_charge', label: txTypeLabel.document_charge },
]

/** Every operation behind the total — there can be thousands, hence a page of its own. */
function OperationsCard({ operations }: { operations: UsageOperation[] }) {
  const [search, setSearch] = useState('')
  const [type, setType] = useState(ANY)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return operations.filter((op) => {
      if (type !== ANY && op.type !== type) return false
      return (
        !q ||
        (op.documentNumber ?? '').toLowerCase().includes(q) ||
        (op.planName ?? '').toLowerCase().includes(q)
      )
    })
  }, [operations, search, type])

  // The list shrinks when the cutoff moves, so the page may fall off the end.
  const current = Math.min(page, Math.max(1, Math.ceil(filtered.length / pageSize)))

  const columns: Column<UsageOperation>[] = [
    {
      key: 'date',
      header: 'Дата/время',
      cell: (op) => <span className="whitespace-nowrap">{formatDateTime(op.createdAt)}</span>,
    },
    {
      key: 'type',
      header: 'Тип',
      cell: (op) => <span className="whitespace-nowrap">{txTypeLabel[op.type]}</span>,
    },
    {
      key: 'subject',
      header: 'Документ № / тариф',
      cell: (op) => (
        <span className="whitespace-nowrap text-gray-600">
          {op.documentNumber ?? op.planName ?? '—'}
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'Сумма',
      cls: 'text-right',
      cell: (op) => (
        <span className="font-semibold whitespace-nowrap tabular-nums text-slate-800">
          {formatMoney(op.amount)}
        </span>
      ),
    },
  ]

  return (
    <PageCard>
      <PageHeader title="Операции" subtitle={`Всего: ${formatNumber(operations.length)}`} />
      <div className="mt-4">
        <Toolbar
          search={search}
          onSearchChange={(v) => {
            setSearch(v)
            setPage(1)
          }}
          placeholder="Поиск по номеру документа или тарифу"
        >
          <div className="w-64 shrink-0">
            <Select
              options={TYPE_OPTIONS}
              value={type}
              onChange={(v) => {
                setType(v)
                setPage(1)
              }}
            />
          </div>
        </Toolbar>
      </div>

      <DataTable
        columns={columns}
        rows={paginate(filtered, current, pageSize)}
        rowKey={(op) => op.id}
        emptyMessage="Операции не найдены"
      />

      <Pagination
        page={current}
        pageSize={pageSize}
        total={filtered.length}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
    </PageCard>
  )
}

/**
 * One page for both sides of a faktura: a payer's open operations before it
 * exists (`/open/:payerId`) and the faktura itself once created (`/:invoiceId`).
 */
export default function InvoiceDetailPage() {
  const { payerId, invoiceId } = useParams()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const invoices = useServiceInvoices()

  const cutoff = parseCutoff(params.get('through'))
  const open = useMemo(() => openUsage(invoices, cutoffEnd(cutoff)), [invoices, cutoff])
  const [pending, setPending] = useState<OpenUsage[] | null>(null)

  const invoice = invoiceId ? (invoices.find((i) => i.id === invoiceId) ?? null) : null
  const usage = payerId ? (open.find((row) => row.payerId === payerId) ?? null) : null
  const subject = invoice ?? usage

  const through = cutoff === TODAY ? '' : `?through=${cutoff}`
  const listPath = invoiceId ? '/billing/invoices?tab=invoices' : `/billing/invoices${through}`
  const setCutoff = (value: string) =>
    setParams(value === TODAY ? {} : { through: value }, { replace: true })

  const back = (
    <button
      type="button"
      onClick={() => navigate(listPath)}
      className="flex w-fit items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-slate-900"
    >
      <ArrowLeft className="size-4" />
      {invoiceId ? 'К счетам-фактурам' : 'К списку к выставлению'}
    </button>
  )

  if (!subject) {
    return (
      <div className="flex flex-col gap-4">
        {back}
        <PageCard>
          <PageHeader
            title={invoiceId ? 'Счёт-фактура не найдена' : 'Нет операций к выставлению'}
            subtitle={
              invoiceId
                ? undefined
                : `По ${formatDate(cutoff)} все операции плательщика уже покрыты фактурами.`
            }
            actions={invoiceId ? undefined : <CutoffInput value={cutoff} onChange={setCutoff} />}
          />
        </PageCard>
      </div>
    )
  }

  /** What the payer still has open — a rejected faktura's operations end up there. */
  const stillOpen = invoice ? open.find((row) => row.payerId === invoice.payerId) : undefined
  const profilePath =
    subject.payerKind === 'company' ? `/tenants/${subject.payerId}` : `/users/${subject.payerId}`

  function confirmCreate(rows: OpenUsage[]) {
    const [draft] = createInvoiceDrafts(rows, currentAdmin.fullName)
    navigate(`/billing/invoices/${draft.id}`, { replace: true })
  }

  return (
    <div className="flex flex-col gap-4">
      {back}

      <PageCard>
        <PageHeader
          title={invoice ? `Счёт-фактура № ${invoice.number}` : subject.payerName}
          subtitle={
            invoice
              ? `${invoice.payerName} · ${taxIdLabel(invoice)}`
              : `${payerKindLabel(subject)} · ${taxIdLabel(subject)} · фактура ещё не создана`
          }
          actions={
            <>
              {invoice && <ServiceInvoiceStatusBadge status={invoice.status} />}
              {usage && <CutoffInput value={cutoff} onChange={setCutoff} />}
              <Button
                hierarchy="secondary-gray"
                size="md"
                className="h-11 whitespace-nowrap"
                onClick={() => navigate(profilePath)}
              >
                Профиль плательщика
              </Button>
              {usage && (
                <Button
                  size="md"
                  className="h-11 whitespace-nowrap"
                  onClick={() => setPending([usage])}
                >
                  Создать фактуру
                </Button>
              )}
            </>
          }
        />
      </PageCard>

      {usage?.rejected && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <RotateCcw className="mt-0.5 size-4 shrink-0 text-red-500" />
          <span className="flex-1 text-sm text-red-700">
            Клиент отклонил фактуру № {usage.rejected.number} на{' '}
            {formatSum(usage.rejected.total)}. Её операции снова входят в эту сумму — вместе с
            теми, что появились позже.
          </span>
          <button
            type="button"
            onClick={() => navigate(`/billing/invoices/${usage.rejected!.id}`)}
            className="text-sm font-semibold whitespace-nowrap text-red-700 transition hover:underline"
          >
            Открыть фактуру
          </button>
        </div>
      )}

      {invoice?.status === 'rejected' && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <RotateCcw className="mt-0.5 size-4 shrink-0 text-red-500" />
          <span className="flex-1 text-sm text-red-700">
            Клиент отклонил эту фактуру, поэтому её операции снова ждут выставления
            {stillOpen ? ` — сейчас у плательщика открыто ${formatSum(stillOpen.total)}.` : '.'}
          </span>
          {stillOpen && (
            <button
              type="button"
              onClick={() => navigate(`/billing/invoices/open/${invoice.payerId}`)}
              className="text-sm font-semibold whitespace-nowrap text-red-700 transition hover:underline"
            >
              Выставить заново
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <FormCard title="Состав услуг">
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            <Field label="Период операций">{rangeLabel(subject)}</Field>
            <Field label="Операций">{formatNumber(subject.operations.length)}</Field>
          </div>
          <div className="mt-4 rounded-xl border border-gray-200 text-sm">
            {subject.subscriptionCount > 0 && (
              <div className="flex items-center justify-between gap-4 border-b border-gray-200 px-4 py-3">
                <span className="text-slate-800">
                  Оплата подписки{' '}
                  <span className="text-gray-500">× {formatNumber(subject.subscriptionCount)}</span>
                </span>
                <span className="tabular-nums text-slate-800">
                  {formatMoney(subject.subscriptionAmount)}
                </span>
              </div>
            )}
            {subject.documentCount > 0 && (
              <div className="flex items-center justify-between gap-4 border-b border-gray-200 px-4 py-3">
                <span className="text-slate-800">
                  Отправка документов{' '}
                  <span className="text-gray-500">× {formatNumber(subject.documentCount)}</span>
                </span>
                <span className="tabular-nums text-slate-800">
                  {formatMoney(subject.documentAmount)}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between gap-4 bg-gray-50 px-4 py-3 font-semibold">
              <span className="text-slate-800">
                {invoice ? 'Итого по фактуре' : 'Итого к выставлению'}
              </span>
              <span className="tabular-nums text-slate-900">{formatSum(subject.total)}</span>
            </div>
          </div>
        </FormCard>

        <FormCard title="Счёт-фактура">
          {invoice && (
            <div className="mb-4 grid grid-cols-2 gap-x-8 gap-y-4">
              <Field label="Создана">{formatDateTime(invoice.createdAt)}</Field>
              <Field label="Кем">{invoice.createdBy}</Field>
            </div>
          )}
          <div className="flex items-start justify-between gap-4 rounded-xl border border-gray-200 px-4 py-3 text-sm">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-gray-500">Строка документа</span>
              <span className="text-slate-800">
                Услуги электронного документооборота Smartup24 Doc за период{' '}
                {rangeLabel(subject)}
              </span>
            </div>
            <span className="font-semibold whitespace-nowrap tabular-nums text-slate-900">
              {formatMoney(subject.total)}
            </span>
          </div>
          <div className="mt-4">
            <InvoiceSteps invoice={invoice} />
          </div>
        </FormCard>
      </div>

      <OperationsCard key={invoice?.id ?? subject.payerId} operations={subject.operations} />

      <CreateInvoicesDialog
        rows={pending}
        cutoff={cutoff}
        onClose={() => setPending(null)}
        onConfirm={confirmCreate}
      />
    </div>
  )
}
