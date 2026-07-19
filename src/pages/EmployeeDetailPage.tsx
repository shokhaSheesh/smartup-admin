import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Ban,
  CheckCircle2,
  CreditCard,
  FileCheck,
  FileText,
  FileX,
  Info,
  Send,
} from 'lucide-react'
import type { ReactNode } from 'react'
import type { AdminDocument } from '@/types/admin'
import { docTypeLabel } from '@/types/admin'
import {
  companyById,
  documentsByActor,
  paymentsByActor,
  platformUsers,
  userNameById,
} from '@/data/mock'
import { applyUserEdit, useUserEdits, withEdits } from '@/data/userEdits'
import { paymentMethodLabel, tenantUserRoleLabel } from '@/types/labels'
import { PageCard, FormCard, PageHeader, Field } from '@/components/ui/PageCard'
import { Tabs } from '@/components/ui/Tabs'
import { DataTable } from '@/components/ui/DataTable'
import type { Column } from '@/components/ui/DataTable'
import { ChargeTypeBadge, DocStatusBadge, UserStatusBadge } from '@/components/ui/StatusBadge'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Button } from '@/components/ui/Button'
import {
  formatDate,
  formatDateTime,
  formatInn,
  formatMoney,
  formatSigned,
} from '@/lib/format'
import { cn } from '@/lib/cn'

type FeedItem = {
  id: string
  at: string
  kind: 'doc_sent' | 'doc_signed' | 'doc_rejected' | 'topup'
  title: string
  detail: string
  amount: number | null
}

const feedIcon: Record<FeedItem['kind'], ReactNode> = {
  doc_sent: <Send className="size-4 text-Smart-blue" />,
  doc_signed: <FileCheck className="size-4 text-emerald-600" />,
  doc_rejected: <FileX className="size-4 text-red-500" />,
  topup: <CreditCard className="size-4 text-emerald-600" />,
}

/**
 * A company employee. Unlike a физическое лицо they hold no balance of their
 * own — what is theirs is the work they did on the company's behalf.
 */
export default function EmployeeDetailPage() {
  const { companyId = '', userId = '' } = useParams()
  const navigate = useNavigate()

  const edits = useUserEdits()
  const [tab, setTab] = useState('overview')
  const [statusPending, setStatusPending] = useState(false)
  const [banner, setBanner] = useState<string | null>(null)

  const base = platformUsers.find((u) => u.id === userId)
  const user = base ? withEdits(base, edits) : undefined
  const company = companyById(companyId)

  const docs = useMemo(() => documentsByActor(userId), [userId])
  const topUps = useMemo(
    () => paymentsByActor(userId).filter((p) => p.status === 'success'),
    [userId],
  )

  const feed = useMemo<FeedItem[]>(() => {
    const docEvents: FeedItem[] = docs.flatMap((d) => {
      const items: FeedItem[] = []
      if (d.sentBy === userId && d.sentAt) {
        items.push({
          id: `s-${d.id}`,
          at: d.sentAt,
          kind: 'doc_sent',
          title: 'Отправил документ',
          detail: `${d.number} · ${docTypeLabel(d.type, d.subtype)}`,
          amount: null,
        })
      }
      if (d.resolvedBy === userId && d.status === 'signed') {
        items.push({
          id: `g-${d.id}`,
          at: d.resolvedAt ?? d.sentAt ?? '',
          kind: 'doc_signed',
          title: 'Подписал документ',
          detail: `${d.number} · ${docTypeLabel(d.type, d.subtype)}`,
          amount: null,
        })
      }
      if (d.resolvedBy === userId && d.status === 'rejected') {
        items.push({
          id: `r-${d.id}`,
          at: d.resolvedAt ?? d.sentAt ?? '',
          kind: 'doc_rejected',
          title: 'Отклонил документ',
          detail: `${d.number} · ${docTypeLabel(d.type, d.subtype)}`,
          amount: null,
        })
      }
      return items
    })

    const payEvents: FeedItem[] = topUps.map((p) => ({
      id: `p-${p.id}`,
      at: p.createdAt,
      kind: 'topup',
      title: 'Пополнил баланс компании',
      detail: `${paymentMethodLabel[p.method]} · ${p.providerRef}`,
      amount: p.amount,
    }))

    return [...docEvents, ...payEvents].sort((a, b) => +new Date(b.at) - +new Date(a.at))
  }, [docs, topUps, userId])

  if (!user || user.kind !== 'employee') {
    return (
      <PageCard>
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <span className="text-lg font-semibold text-slate-800">Сотрудник не найден</span>
          <span className="text-sm text-gray-500">
            Сотрудник с идентификатором «{userId}» отсутствует в этой компании.
          </span>
          <div className="mt-4">
            <Button hierarchy="secondary-gray" onClick={() => navigate('/users')}>
              К списку пользователей
            </Button>
          </div>
        </div>
      </PageCard>
    )
  }

  const blocked = user.status === 'blocked'

  const docColumns: Column<AdminDocument>[] = [
    {
      key: 'number',
      header: '№',
      cell: (d) => <span className="font-medium text-slate-800">{d.number}</span>,
    },
    {
      key: 'type',
      header: 'Тип документа',
      cell: (d) => (
        <div className="flex flex-col">
          <span className="text-slate-800">{d.type}</span>
          {d.subtype && <span className="text-xs text-gray-500">{d.subtype}</span>}
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Действие',
      cell: (d) => (
        <span className="whitespace-nowrap text-slate-600">
          {d.sentBy === userId
            ? 'Отправил'
            : d.status === 'rejected'
              ? 'Отклонил'
              : 'Подписал'}
        </span>
      ),
    },
    {
      key: 'counterparty',
      header: 'Контрагент',
      // The counterparty is whichever side is not this employee's own company —
      // the document's own direction is relative to its owner, not to this page.
      cell: (d) => {
        const ownSide = d.senderInn === user.companyInn
        const name = ownSide ? d.receiverName : d.senderName
        const inn = ownSide ? d.receiverInn : d.senderInn
        return (
          <div className="flex flex-col">
            <span className="text-slate-800">{name}</span>
            <span className="text-xs text-gray-500">{formatInn(inn)}</span>
          </div>
        )
      },
    },
    { key: 'status', header: 'Статус', cell: (d) => <DocStatusBadge status={d.status} /> },
    {
      key: 'amount',
      header: 'Сумма',
      cls: 'text-right',
      cell: (d) => <span className="tabular-nums">{formatMoney(d.amount)}</span>,
    },
    {
      key: 'sentAt',
      header: 'Отправлен',
      cell: (d) => <span className="whitespace-nowrap">{formatDate(d.sentAt)}</span>,
    },
    { key: 'charge', header: 'Списание', cell: (d) => <ChargeTypeBadge type={d.chargeType} /> },
  ]

  const tabs = [
    { key: 'overview', label: 'Обзор' },
    { key: 'documents', label: 'Документы', count: docs.length },
    { key: 'activity', label: 'Активность', count: feed.length },
  ]

  const sentCount = docs.filter((d) => d.sentBy === userId).length
  const resolvedCount = docs.filter((d) => d.resolvedBy === userId).length

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={() => navigate(`/tenants/${user.companyId}`)}
        className="flex w-fit items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-slate-900"
      >
        <ArrowLeft className="size-4" />
        {company ? `К компании ${company.name}` : 'К компании'}
      </button>

      <PageCard>
        <PageHeader
          title={user.fullName}
          subtitle={`${user.role ? tenantUserRoleLabel[user.role] : 'Сотрудник'} · ${user.companyName ?? ''}`}
          actions={
            <>
              <UserStatusBadge status={user.status} />
              <button
                type="button"
                onClick={() => setStatusPending(true)}
                className={cn(
                  'flex items-center gap-2 rounded-lg border px-6 py-2.5 text-sm font-semibold transition',
                  blocked
                    ? 'border-gray-200 text-slate-700 hover:bg-gray-50'
                    : 'border-red-300 text-red-500 hover:bg-red-50',
                )}
              >
                {blocked ? <CheckCircle2 className="size-4" /> : <Ban className="size-4" />}
                {blocked ? 'Разблокировать' : 'Заблокировать'}
              </button>
            </>
          }
        />

        {banner && (
          <div className="mt-4 flex items-start gap-2 rounded-lg bg-blue-50 px-3.5 py-2.5">
            <Info className="mt-0.5 size-4 shrink-0 text-Smart-blue" />
            <span className="text-sm text-slate-700">{banner}</span>
          </div>
        )}

        <Tabs tabs={tabs} active={tab} onChange={setTab} />
      </PageCard>

      {tab === 'overview' && (
        <div className="flex flex-col gap-4">
          <FormCard title="Данные сотрудника">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="ФИО">{user.fullName}</Field>
              <Field label="Роль в компании">
                {user.role ? tenantUserRoleLabel[user.role] : '—'}
              </Field>
              <Field label="Телефон">{user.phone}</Field>
              <Field label="Компания">
                <button
                  type="button"
                  onClick={() => navigate(`/tenants/${user.companyId}`)}
                  className="font-semibold text-Smart-blue transition hover:underline"
                >
                  {user.companyName}
                </button>
              </Field>
            </div>
          </FormCard>

          <FormCard title="Учётная запись">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Статус">
                <UserStatusBadge status={user.status} />
              </Field>
              <Field label="Последний вход">{formatDateTime(user.lastLoginAt)}</Field>
            </div>
          </FormCard>

          <FormCard title="Работа с документами">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Отправлено документов">{sentCount}</Field>
              <Field label="Подписано и отклонено">{resolvedCount}</Field>
              <Field label="Пополнений баланса">{topUps.length}</Field>
            </div>
          </FormCard>
        </div>
      )}

      {tab === 'documents' && (
        <PageCard>
          <h2 className="text-lg font-semibold text-slate-800">Документы сотрудника</h2>
          <p className="mt-1 text-sm text-gray-500">
            Документы, которые сотрудник отправил, подписал или отклонил от имени компании.
          </p>
          <DataTable
            columns={docColumns}
            rows={docs}
            rowKey={(d) => d.id}
            onRowClick={(d) => navigate(`/documents/${d.id}`)}
            emptyMessage="Документы не найдены"
          />
        </PageCard>
      )}

      {tab === 'activity' && (
        <PageCard>
          <h2 className="text-lg font-semibold text-slate-800">Хронология событий</h2>
          {feed.length === 0 ? (
            <p className="py-12 text-center text-gray-400">Событий пока нет</p>
          ) : (
            <ol className="mt-4 flex flex-col">
              {feed.map((item) => (
                <li
                  key={item.id}
                  className="flex gap-3 border-b border-gray-100 py-3 last:border-b-0"
                >
                  <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-gray-50">
                    {feedIcon[item.kind]}
                  </div>
                  <div className="flex flex-1 flex-col gap-0.5">
                    <span className="text-sm font-medium text-slate-800">{item.title}</span>
                    <span className="text-sm text-gray-500">{item.detail}</span>
                  </div>
                  <div className="flex flex-col items-end gap-0.5">
                    {item.amount !== null && (
                      <span className="text-sm font-semibold text-emerald-600 tabular-nums">
                        {formatSigned(item.amount)}
                      </span>
                    )}
                    <span className="text-xs whitespace-nowrap text-gray-400">
                      {formatDateTime(item.at)}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </PageCard>
      )}

      <div className="flex items-center gap-2 pb-2 text-xs text-gray-400">
        <FileText className="size-4" />
        Все действия администратора над сотрудником фиксируются в журнале аудита.
      </div>

      <ConfirmDialog
        open={statusPending}
        onClose={() => setStatusPending(false)}
        destructive={!blocked}
        confirmLabel={blocked ? 'Разблокировать' : 'Заблокировать'}
        title={blocked ? 'Разблокировать сотрудника' : 'Заблокировать сотрудника'}
        description={
          <>
            {blocked
              ? 'Сотрудник снова сможет работать от имени компании: '
              : 'Сотрудник потеряет доступ к работе от имени компании: '}
            <b className="font-semibold text-slate-800">{user.fullName}</b>
            {userNameById(user.id) && <> ({user.companyName}).</>}
          </>
        }
        onConfirm={(reason) => {
          applyUserEdit(user.id, { status: blocked ? 'active' : 'blocked' })
          setBanner(
            `${blocked ? 'Сотрудник разблокирован' : 'Сотрудник заблокирован'}. Причина: ${reason}`,
          )
        }}
      />
    </div>
  )
}
