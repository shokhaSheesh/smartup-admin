import { useMemo, useState } from 'react'
import { Pencil, Trash2, UserPlus } from 'lucide-react'
import { PageCard, PageHeader } from '@/components/ui/PageCard'
import { DataTable } from '@/components/ui/DataTable'
import type { Column } from '@/components/ui/DataTable'
import { Toolbar } from '@/components/ui/Toolbar'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { RowMenu } from '@/components/ui/RowMenu'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { adminUsers } from '@/data/mock'
import type { AdminRole, AdminUser } from '@/types/admin'
import { roleName, useRoles } from '@/data/roles'
import { formatDate, formatDateTime, formatNumber } from '@/lib/format'
import { cn } from '@/lib/cn'

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'Все статусы' },
  { value: 'active', label: 'Активен' },
  { value: 'disabled', label: 'Отключён' },
]

const adminStatusLabel: Record<AdminUser['status'], string> = {
  active: 'Активен',
  disabled: 'Отключён',
}

/* ------------------------------------------------------------ local helpers */

/** Admin account status badge — same shape as the shared StatusBadge family. */
function AdminStatusBadge({ status }: { status: AdminUser['status'] }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-3 py-1 text-sm font-medium',
        status === 'active' ? 'bg-green-100 text-emerald-600' : 'bg-gray-100 text-gray-500',
      )}
    >
      {adminStatusLabel[status]}
    </span>
  )
}

type InviteDraft = {
  fullName: string
  email: string
  phone: string
  role: AdminRole
}

const emptyInvite: InviteDraft = {
  fullName: '',
  email: '',
  phone: '',
  role: 'support',
}

export default function TeamPage() {
  const [team, setTeam] = useState<AdminUser[]>(adminUsers)

  /** Options come from the roles store, so a newly created role is assignable. */
  const roles = useRoles()
  const roleOptions = useMemo(
    () => roles.map((r) => ({ value: r.id, label: r.name })),
    [roles],
  )
  const roleFilterOptions = useMemo(
    () => [{ value: 'all', label: 'Все роли' }, ...roleOptions],
    [roleOptions],
  )

  const [search, setSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  const [inviteOpen, setInviteOpen] = useState(false)
  const [invite, setInvite] = useState<InviteDraft>(emptyInvite)

  const [editTarget, setEditTarget] = useState<AdminUser | null>(null)
  const [edit, setEdit] = useState({
    fullName: '',
    phone: '',
    role: 'support' as AdminRole,
    status: 'active' as AdminUser['status'],
  })

  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null)

  const filtersActive = roleFilter !== 'all' || statusFilter !== 'all'

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return team.filter((u) => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false
      if (statusFilter !== 'all' && u.status !== statusFilter) return false
      if (!q) return true
      return (
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.phone.includes(q)
      )
    })
  }, [team, search, roleFilter, statusFilter])


  const inviteValid =
    invite.fullName.trim().length > 0 && invite.email.trim().length > 0

  function submitInvite() {
    if (!inviteValid) return
    const created: AdminUser = {
      id: `adm-new-${Date.now()}`,
      fullName: invite.fullName.trim(),
      email: invite.email.trim(),
      phone: invite.phone.trim(),
      role: invite.role,
      status: 'active',
      lastLoginAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    }
    setTeam((prev) => [created, ...prev])
    setInvite(emptyInvite)
    setInviteOpen(false)
  }

  function openEdit(u: AdminUser) {
    setEdit({ fullName: u.fullName, phone: u.phone, role: u.role, status: u.status })
    setEditTarget(u)
  }

  function applyEdit() {
    if (!editTarget || edit.fullName.trim().length === 0) return
    setTeam((prev) =>
      prev.map((u) =>
        u.id === editTarget.id
          ? {
              ...u,
              fullName: edit.fullName.trim(),
              phone: edit.phone.trim(),
              role: edit.role,
              status: edit.status,
            }
          : u,
      ),
    )
    setEditTarget(null)
  }

  const columns: Column<AdminUser>[] = [
    {
      key: 'fullName',
      header: 'ФИО',
      cell: (u) => (
        <div className="flex flex-col">
          <span className="text-sm font-medium text-slate-800">{u.fullName}</span>
          <span className="text-xs text-gray-500">{u.phone}</span>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Роль',
      cell: (u) => (
        <span className="inline-flex items-center rounded-md bg-blue-50 px-3 py-1 text-sm font-medium text-Smart-blue">
          {roleName(u.role)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Статус',
      cell: (u) => <AdminStatusBadge status={u.status} />,
    },
    {
      key: 'lastLogin',
      header: 'Последний вход',
      cell: (u) => (
        <span className="text-sm whitespace-nowrap text-gray-900">
          {formatDateTime(u.lastLoginAt)}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Создан',
      cell: (u) => (
        <span className="text-sm whitespace-nowrap text-gray-900">{formatDate(u.createdAt)}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      cls: 'w-12',
      cell: (u) => (
        <div onClick={(e) => e.stopPropagation()}>
          <RowMenu
            items={[
              {
                label: 'Изменить',
                icon: <Pencil className="size-4" />,
                onClick: () => openEdit(u),
              },
              {
                label: 'Удалить',
                icon: <Trash2 className="size-4" />,
                danger: true,
                onClick: () => setDeleteTarget(u),
              },
            ]}
          />
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Команда администраторов"
        subtitle={`${formatNumber(team.length)} учётных записей с доступом к панели управления`}
      />

      <PageCard>
        <Toolbar
          search={search}
          onSearchChange={setSearch}
          placeholder="Поиск по ФИО, email или телефону"
          filtersActive={showFilters || filtersActive}
          onToggleFilters={() => setShowFilters((v) => !v)}
        >
          <button
            type="button"
            onClick={() => setInviteOpen(true)}
            className="flex shrink-0 items-center gap-2 rounded-lg bg-Smart-green px-4 py-2.5 text-base font-semibold text-white shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] transition hover:brightness-105"
          >
            <UserPlus className="size-5" />
            Пригласить администратора
          </button>
        </Toolbar>

        {showFilters && (
          <div className="mt-4 grid grid-cols-1 gap-4 rounded-xl border border-gray-200 bg-gray-50 p-4 sm:grid-cols-3">
            <Select
              label="Роль"
              options={roleFilterOptions}
              value={roleFilter}
              onChange={setRoleFilter}
            />
            <Select
              label="Статус"
              options={STATUS_FILTER_OPTIONS}
              value={statusFilter}
              onChange={setStatusFilter}
            />
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => {
                  setRoleFilter('all')
                  setStatusFilter('all')
                }}
                disabled={!filtersActive}
                className={cn(
                  'py-2.5 text-sm font-semibold transition',
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
          columns={columns}
          rows={rows}
          rowKey={(u) => u.id}
          emptyMessage="Администраторы не найдены"
        />
      </PageCard>

      {/* ------------------------------------------------------- invite modal */}
      <Modal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Пригласить администратора"
        maxWidth="max-w-lg"
      >
        <div className="flex flex-col gap-4 px-6 py-5">
          <Input
            label="ФИО"
            value={invite.fullName}
            onChange={(e) => setInvite({ ...invite, fullName: e.target.value })}
            placeholder="Иванов Иван"
          />
          <Input
            label="Email"
            type="email"
            value={invite.email}
            onChange={(e) => setInvite({ ...invite, email: e.target.value })}
            placeholder="i.ivanov@smartup24.uz"
          />
          <Input
            label="Телефон"
            value={invite.phone}
            onChange={(e) => setInvite({ ...invite, phone: e.target.value })}
            placeholder="+998 90 000 00 00"
          />
          <Select
            label="Роль"
            options={roleOptions}
            value={invite.role}
            onChange={(v) => setInvite({ ...invite, role: v as AdminRole })}
          />
          <div className="flex items-center justify-end gap-3 pt-1">
            <Button hierarchy="secondary-gray" onClick={() => setInviteOpen(false)}>
              Отменить
            </Button>
            <Button onClick={submitInvite} disabled={!inviteValid}>
              Отправить приглашение
            </Button>
          </div>
        </div>
      </Modal>

      {/* -------------------------------------------------------- edit modal */}
      <Modal
        open={editTarget !== null}
        onClose={() => setEditTarget(null)}
        title="Изменить администратора"
        maxWidth="max-w-md"
      >
        <div className="flex flex-col gap-4 px-6 py-5">
          <Input
            label="ФИО"
            value={edit.fullName}
            onChange={(e) => setEdit({ ...edit, fullName: e.target.value })}
            placeholder="Иванов Иван"
          />
          <Input
            label="Телефон"
            value={edit.phone}
            onChange={(e) => setEdit({ ...edit, phone: e.target.value })}
            placeholder="+998 90 000 00 00"
          />
          <Select
            label="Роль"
            options={roleOptions}
            value={edit.role}
            onChange={(v) => setEdit({ ...edit, role: v as AdminRole })}
          />
          <Select
            label="Статус"
            options={[
              { value: 'active', label: adminStatusLabel.active },
              { value: 'disabled', label: adminStatusLabel.disabled },
            ]}
            value={edit.status}
            onChange={(v) => setEdit({ ...edit, status: v as AdminUser['status'] })}
          />
          <p className="text-sm text-gray-500">
            Изменения записываются в журнал аудита.
          </p>
          <div className="flex items-center justify-end gap-3">
            <Button hierarchy="secondary-gray" onClick={() => setEditTarget(null)}>
              Отменить
            </Button>
            <Button disabled={edit.fullName.trim().length === 0} onClick={applyEdit}>
              Сохранить
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        destructive
        confirmLabel="Удалить"
        title="Удалить администратора"
        description={
          <>
            Учётная запись{' '}
            <b className="font-semibold text-slate-800">{deleteTarget?.fullName}</b> будет
            удалена, доступ к панели прекратится немедленно. Записи в журнале аудита
            сохранятся.
          </>
        }
        onConfirm={() => {
          if (!deleteTarget) return
          setTeam((prev) => prev.filter((u) => u.id !== deleteTarget.id))
        }}
      />

    </div>
  )
}
