import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Ban,
  CheckCircle2,
  FileText,
  Info,
  KeyRound,
  Wallet,
} from 'lucide-react'
import { platformUsers, currentAdmin } from '@/data/mock'
import {
  applyUserBalanceAdjustment,
  applyUserEdit,
  useAdjustmentHistory,
  useUserEdits,
  withEdits,
} from '@/data/userEdits'
import {
  adjustmentCategoryLabel,
  authMethodLabel,
  tenantUserRoleLabel,
  userKindLabel,
} from '@/types/labels'
import { PageCard, FormCard, PageHeader, Field } from '@/components/ui/PageCard'
import { UserStatusBadge } from '@/components/ui/StatusBadge'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { BalanceAdjustModal } from '@/components/users/BalanceAdjustModal'
import { Button } from '@/components/ui/Button'
import { formatDateTime, formatInn, formatSigned, formatSum } from '@/lib/format'
import { cn } from '@/lib/cn'

export default function UserDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()

  const edits = useUserEdits()
  const allHistory = useAdjustmentHistory()

  const [adjustOpen, setAdjustOpen] = useState(false)
  const [statusPending, setStatusPending] = useState(false)
  const [banner, setBanner] = useState<string | null>(null)

  const base = platformUsers.find((u) => u.id === id)
  const user = base ? withEdits(base, edits) : undefined

  const history = useMemo(
    () => allHistory.filter((a) => a.userId === id),
    [allHistory, id],
  )

  if (!user) {
    return (
      <PageCard>
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <span className="text-lg font-semibold text-slate-800">
            Пользователь не найден
          </span>
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
          subtitle={`${userKindLabel[user.kind]} · ПИНФЛ ${user.pinfl}`}
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
      </PageCard>

      <FormCard title="Личные данные">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="ФИО">{user.fullName}</Field>
          <Field label="ПИНФЛ">{user.pinfl}</Field>
          <Field label="Телефон">{user.phone}</Field>
          <Field label="Адрес">{user.address ?? '—'}</Field>
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
              <Field label="ИНН компании">
                {user.companyInn ? formatInn(user.companyInn) : '—'}
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
          <Field label="Способ входа">
            <span className="inline-flex items-center gap-2">
              <KeyRound className="size-4 text-gray-400" />
              {authMethodLabel[user.authMethod]}
            </span>
          </Field>
          <Field label="Статус">
            <UserStatusBadge status={user.status} />
          </Field>
          <Field label="Регистрация">{formatDateTime(user.registeredAt)}</Field>
          <Field label="Последний вход">{formatDateTime(user.lastLoginAt)}</Field>
        </div>
      </FormCard>

      {/* Balance is the only editable thing on this page. */}
      {user.balance !== null ? (
        <FormCard
          title="Баланс"
          action={
            <Button
              hierarchy="secondary-gray"
              size="md"
              leadingIcon={<Wallet className="size-4" />}
              onClick={() => setAdjustOpen(true)}
            >
              Корректировать
            </Button>
          }
        >
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
                        {adjustmentCategoryLabel[a.category]}
                      </span>
                      <span className="text-sm text-gray-500">{a.reason}</span>
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
      ) : (
        <FormCard title="Баланс">
          <p className="text-sm text-gray-500">
            У сотрудника нет собственного баланса — документы оплачиваются со счёта
            компании.
          </p>
        </FormCard>
      )}

      <div className="flex items-center gap-2 pb-2 text-xs text-gray-400">
        <FileText className="size-4" />
        Все действия администратора над пользователем фиксируются в журнале аудита.
      </div>

      <BalanceAdjustModal
        open={adjustOpen}
        onClose={() => setAdjustOpen(false)}
        currentBalance={user.balance ?? 0}
        subjectName={user.fullName}
        onApply={(adj) => {
          applyUserBalanceAdjustment(user.id, adj, currentAdmin.fullName)
          const signed = adj.direction === 'credit' ? adj.amount : -adj.amount
          setBanner(
            `Баланс изменён на ${formatSigned(signed)} сум. Причина: ${adj.reason}`,
          )
        }}
      />

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
