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
import { documentsByUser, platformUsers } from '@/data/mock'
import {
  applyUserEdit,
  useAdjustmentHistory,
  useUserEdits,
  withEdits,
} from '@/data/userEdits'
import {
  tenantUserRoleLabel,
  userKindLabel,
} from '@/types/labels'
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
  formatNumber,
  formatSigned,
  formatSum,
} from '@/lib/format'
import { cn } from '@/lib/cn'

type FeedItem = {
  id: string
  at: string
  kind: 'doc_sent' | 'doc_signed' | 'doc_rejected' | 'balance'
  title: string
  detail: string
  amount: number | null
}

const feedIcon: Record<FeedItem['kind'], ReactNode> = {
  doc_sent: <Send className="size-4 text-Smart-blue" />,
  doc_signed: <FileCheck className="size-4 text-emerald-600" />,
  doc_rejected: <FileX className="size-4 text-red-500" />,
  balance: <CreditCard className="size-4 text-emerald-600" />,
}

export default function UserDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()

  const edits = useUserEdits()
  const allHistory = useAdjustmentHistory()

  const [tab, setTab] = useState('overview')
  const [statusPending, setStatusPending] = useState(false)
  const [banner, setBanner] = useState<string | null>(null)

  const base = platformUsers.find((u) => u.id === id)
  const user = base ? withEdits(base, edits) : undefined

  const history = useMemo(() => allHistory.filter((a) => a.userId === id), [allHistory, id])
  const docs = useMemo(() => documentsByUser(id), [id])

  const feed = useMemo<FeedItem[]>(() => {
    const docEvents: FeedItem[] = docs.flatMap((d) => {
      const items: FeedItem[] = []
      if (d.direction === 'outgoing' && d.sentAt) {
        items.push({
          id: `s-${d.id}`,
          at: d.sentAt,
          kind: 'doc_sent',
          title: 'Документ отправлен',
          detail: `${d.number} · ${docTypeLabel(d.type, d.subtype)}`,
          amount: null,
        })
      }
      if (d.status === 'signed') {
        items.push({
          id: `g-${d.id}`,
          at: d.sentAt ?? d.createdAt,
          kind: 'doc_signed',
          title: 'Документ подписан',
          detail: `${d.number} · ${docTypeLabel(d.type, d.subtype)}`,
          amount: null,
        })
      }
      if (d.status === 'rejected') {
        items.push({
          id: `r-${d.id}`,
          at: d.sentAt ?? d.createdAt,
          kind: 'doc_rejected',
          title: 'Документ отклонён',
          detail: `${d.number} · ${docTypeLabel(d.type, d.subtype)}`,
          amount: null,
        })
      }
      return items
    })

    const balanceEvents: FeedItem[] = history.map((a) => ({
      id: `b-${a.id}`,
      at: a.at,
      kind: 'balance',
      title: a.direction === 'credit' ? 'Начисление на баланс' : 'Списание с баланса',
      detail: `${a.reason} · ${a.admin}`,
      amount: a.direction === 'credit' ? a.amount : -a.amount,
    }))

    return [...docEvents, ...balanceEvents].sort(
      (a, b) => +new Date(b.at) - +new Date(a.at),
    )
  }, [docs, history])

  if (!user) {
    return (
      <PageCard>
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <span className="text-lg font-semibold text-slate-800">Пользователь не найден</span>
          <span className="text-sm text-gray-500">
            Пользователь с идентификатором «{id}» отсутствует в системе.
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
  const isIndividual = user.kind === 'individual'

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
      key: 'direction',
      header: 'Направление',
      cell: (d) => (d.direction === 'outgoing' ? 'Исходящий' : 'Входящий'),
    },
    {
      key: 'counterparty',
      header: 'Контрагент',
      cell: (d) => {
        const out = d.direction === 'outgoing'
        return (
          <div className="flex flex-col">
            <span className="text-slate-800">{out ? d.receiverName : d.senderName}</span>
            <span className="text-xs text-gray-500">
              {formatInn(out ? d.receiverInn : d.senderInn)}
            </span>
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

  const tabs = isIndividual
    ? [
        { key: 'overview', label: 'Обзор' },
        { key: 'documents', label: 'Документы', count: docs.length },
        { key: 'activity', label: 'Активность', count: feed.length },
      ]
    : [{ key: 'overview', label: 'Обзор' }]

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={() => navigate('/users')}
        className="flex w-fit items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-slate-900"
      >
        <ArrowLeft className="size-4" />
        К списку пользователей
      </button>

      <PageCard>
        <PageHeader
          title={user.fullName}
          subtitle={
            isIndividual
              ? `${userKindLabel[user.kind]} · ПИНФЛ ${user.pinfl}`
              : `${userKindLabel[user.kind]} · ${user.companyName ?? ''}`
          }
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
          <FormCard title="Личные данные">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="ФИО">{user.fullName}</Field>
              {isIndividual && <Field label="ПИНФЛ">{user.pinfl}</Field>}
              <Field label="Телефон">{user.phone}</Field>
              {isIndividual && <Field label="Адрес">{user.address ?? '—'}</Field>}
              {!isIndividual && (
                <>
                  <Field label="Компания">
                    {user.companyName ? (
                      <button
                        type="button"
                        onClick={() => navigate(`/tenants/${user.companyId}`)}
                        className="font-semibold text-Smart-blue transition hover:underline"
                      >
                        {user.companyName}
                      </button>
                    ) : (
                      '—'
                    )}
                  </Field>
                  <Field label="Роль в компании">
                    {user.role ? tenantUserRoleLabel[user.role] : '—'}
                  </Field>
                </>
              )}
            </div>
          </FormCard>

          <FormCard title="Учётная запись">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Статус">
                <UserStatusBadge status={user.status} />
              </Field>
              <Field label="Регистрация">{formatDateTime(user.registeredAt)}</Field>
              <Field label="Последний вход">{formatDateTime(user.lastLoginAt)}</Field>
            </div>
          </FormCard>

          {user.balance !== null && (
            <FormCard title="Баланс">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-gray-500">Текущий баланс</span>
                  <span
                    className={cn(
                      'text-2xl leading-8 font-bold tabular-nums',
                      user.balance <= 0 ? 'text-red-600' : 'text-slate-800',
                    )}
                  >
                    {formatSum(user.balance)}
                  </span>
                </div>
                <Field label="Отправлено документов за месяц">
                  {formatNumber(user.docsSentThisMonth)}
                </Field>
              </div>

              {history.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-slate-700">
                    Корректировки в этой сессии
                  </h3>
                  <ol className="mt-2 flex flex-col">
                    {history.map((a) => (
                      <li
                        key={a.id}
                        className="flex items-start gap-3 border-b border-gray-100 py-3 last:border-b-0"
                      >
                        <div className="flex flex-1 flex-col gap-0.5">
                          <span className="text-sm font-medium text-slate-800">
                            {a.reason}
                          </span>
                          <span className="text-xs text-gray-400">
                            {formatDateTime(a.at)} · {a.admin}
                          </span>
                        </div>
                        <span
                          className={cn(
                            'text-sm font-semibold tabular-nums',
                            a.direction === 'credit' ? 'text-emerald-600' : 'text-red-600',
                          )}
                        >
                          {formatSigned(a.direction === 'credit' ? a.amount : -a.amount)}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </FormCard>
          )}
        </div>
      )}

      {tab === 'documents' && (
        <PageCard>
          <h2 className="text-lg font-semibold text-slate-800">Документы пользователя</h2>
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
                      <span
                        className={cn(
                          'text-sm font-semibold tabular-nums',
                          item.amount >= 0 ? 'text-emerald-600' : 'text-red-600',
                        )}
                      >
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
        Все действия администратора над пользователем фиксируются в журнале аудита.
      </div>

      <ConfirmDialog
        open={statusPending}
        onClose={() => setStatusPending(false)}
        destructive={!blocked}
        confirmLabel={blocked ? 'Разблокировать' : 'Заблокировать'}
        title={blocked ? 'Разблокировать пользователя' : 'Заблокировать пользователя'}
        description={
          <>
            {blocked
              ? 'Пользователь снова получит доступ к платформе: '
              : 'Пользователь потеряет доступ к платформе: '}
            <b className="font-semibold text-slate-800">{user.fullName}</b>.
          </>
        }
        onConfirm={(reason) => {
          applyUserEdit(user.id, { status: blocked ? 'active' : 'blocked' })
          setBanner(
            `${blocked ? 'Пользователь разблокирован' : 'Пользователь заблокирован'}. Причина: ${reason}`,
          )
        }}
      />
    </div>
  )
}
