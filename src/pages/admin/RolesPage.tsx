import { Fragment, useMemo, useState } from 'react'
import { Pencil, Plus, ShieldCheck, Trash2 } from 'lucide-react'
import {
  ADMIN_PAGES,
  CRUD_ACTIONS,
  FULL_ACCESS,
  NO_ACCESS,
  PAGE_GROUPS,
  accessiblePageCount,
  createRole,
  deleteRole,
  everyPage,
  updateRole,
  useRoles,
} from '@/data/roles'
import type { CrudAction, CrudPermissions, Role, RolePermissions } from '@/data/roles'
import { adminUsers } from '@/data/mock'
import { PageCard, PageHeader } from '@/components/ui/PageCard'
import { DataTable } from '@/components/ui/DataTable'
import type { Column } from '@/components/ui/DataTable'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { RowMenu } from '@/components/ui/RowMenu'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/cn'

/** Reading is the precondition for everything else on a page. */
function normalise(perms: CrudPermissions): CrudPermissions {
  const touchesAnything = perms.create || perms.update || perms.delete
  return touchesAnything ? { ...perms, read: true } : perms
}

export default function RolesPage() {
  const roles = useRoles()

  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [permissions, setPermissions] = useState<RolePermissions>(() => everyPage(NO_ACCESS))
  const [touched, setTouched] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null)

  /** Admins holding each role, so a role in use is obvious before deleting it. */
  const holders = useMemo(() => {
    const counts = new Map<string, number>()
    adminUsers.forEach((a) => counts.set(a.role, (counts.get(a.role) ?? 0) + 1))
    return counts
  }, [])

  function openCreate() {
    setEditingId(null)
    setName('')
    setPermissions(everyPage(NO_ACCESS))
    setTouched(false)
    setFormOpen(true)
  }

  function openEdit(role: Role) {
    setEditingId(role.id)
    setName(role.name)
    setPermissions(
      Object.fromEntries(
        ADMIN_PAGES.map((p) => [p.key, { ...(role.permissions[p.key] ?? NO_ACCESS) }]),
      ),
    )
    setTouched(false)
    setFormOpen(true)
  }

  function toggle(pageKey: string, action: CrudAction, value: boolean) {
    setPermissions((prev) => {
      const next = { ...(prev[pageKey] ?? NO_ACCESS), [action]: value }
      // Unchecking Просмотр clears the rest — you cannot edit what you cannot open.
      const resolved = action === 'read' && !value ? { ...NO_ACCESS } : normalise(next)
      return { ...prev, [pageKey]: resolved }
    })
  }

  function toggleRow(pageKey: string, value: boolean) {
    setPermissions((prev) => ({
      ...prev,
      [pageKey]: value ? { ...FULL_ACCESS } : { ...NO_ACCESS },
    }))
  }

  function toggleColumn(action: CrudAction, value: boolean) {
    setPermissions((prev) => {
      const next: RolePermissions = { ...prev }
      ADMIN_PAGES.forEach((p) => {
        const current = { ...(next[p.key] ?? NO_ACCESS), [action]: value }
        next[p.key] = action === 'read' && !value ? { ...NO_ACCESS } : normalise(current)
      })
      return next
    })
  }

  const nameInvalid = name.trim().length === 0
  const grantsNothing = ADMIN_PAGES.every((p) => !permissions[p.key]?.read)

  function submit() {
    setTouched(true)
    if (nameInvalid || grantsNothing) return
    if (editingId) updateRole(editingId, name, permissions)
    else createRole(name, permissions)
    setFormOpen(false)
  }

  const columns: Column<Role>[] = [
    {
      key: 'name',
      header: 'Роль',
      cell: (r) => (
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-800">{r.name}</span>
          {r.system && (
            <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
              системная
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'pages',
      header: 'Доступно страниц',
      cls: 'text-right',
      cell: (r) => (
        <span className="whitespace-nowrap tabular-nums">
          {formatNumber(accessiblePageCount(r))} из {formatNumber(ADMIN_PAGES.length)}
        </span>
      ),
    },
    ...CRUD_ACTIONS.map<Column<Role>>((action) => ({
      key: action.key,
      header: action.label,
      cls: 'text-right',
      cell: (r) => {
        const count = ADMIN_PAGES.filter((p) => r.permissions[p.key]?.[action.key]).length
        return (
          <span
            className={cn('tabular-nums', count === 0 ? 'text-gray-400' : 'text-slate-800')}
          >
            {count === 0 ? '—' : formatNumber(count)}
          </span>
        )
      },
    })),
    {
      key: 'holders',
      header: 'Администраторов',
      cls: 'text-right',
      cell: (r) => (
        <span className="tabular-nums">{formatNumber(holders.get(r.id) ?? 0)}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      cls: 'w-12',
      cell: (r) => (
        <div onClick={(e) => e.stopPropagation()}>
          <RowMenu
            items={[
              {
                label: 'Изменить',
                icon: <Pencil className="size-4" />,
                onClick: () => openEdit(r),
              },
              {
                label: 'Удалить',
                icon: <Trash2 className="size-4" />,
                danger: true,
                // A system role would leave the panel unusable; a role in use
                // would strand the admins holding it.
                disabled: r.system || (holders.get(r.id) ?? 0) > 0,
                onClick: () => setDeleteTarget(r),
              },
            ]}
          />
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <PageCard>
        <PageHeader
          title="Роли и права"
          subtitle="Каждая роль задаёт права на страницы панели: просмотр, создание, изменение и удаление"
          actions={
            <button
              type="button"
              onClick={openCreate}
              className="flex shrink-0 items-center gap-2 rounded-lg bg-Smart-green px-4 py-2.5 text-base font-semibold text-white shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] transition hover:brightness-105"
            >
              <Plus className="size-5" />
              Создать роль
            </button>
          }
        />

        <DataTable
          columns={columns}
          rows={roles}
          rowKey={(r) => r.id}
          onRowClick={(r) => openEdit(r)}
          emptyMessage="Роли не найдены"
        />
      </PageCard>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingId ? 'Изменить роль' : 'Создать роль'}
        maxWidth="max-w-4xl"
      >
        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
          <div className="sm:max-w-md">
            <Input
              label="Название роли"
              value={name}
              destructive={touched && nameInvalid}
              hint={touched && nameInvalid ? 'Укажите название роли' : undefined}
              onChange={(e) => setName(e.target.value)}
              placeholder="Например: Бухгалтерия"
            />
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between">
              <span className="text-sm leading-5 font-medium text-slate-700">
                Права по страницам
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setPermissions(everyPage(FULL_ACCESS))}
                  className="text-sm font-semibold text-Smart-blue transition hover:underline"
                >
                  Выбрать всё
                </button>
                <button
                  type="button"
                  onClick={() => setPermissions(everyPage(NO_ACCESS))}
                  className="text-sm font-semibold text-gray-500 transition hover:underline"
                >
                  Снять всё
                </button>
              </div>
            </div>

            <div className="mt-2 overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border-b border-gray-200 px-4 py-3 text-left text-xs font-medium text-gray-900">
                      Страница
                    </th>
                    {CRUD_ACTIONS.map((action) => {
                      const all = ADMIN_PAGES.every((p) => permissions[p.key]?.[action.key])
                      return (
                        <th
                          key={action.key}
                          className="border-b border-gray-200 px-4 py-3 text-center text-xs font-medium whitespace-nowrap text-gray-900"
                        >
                          <button
                            type="button"
                            onClick={() => toggleColumn(action.key, !all)}
                            className="transition hover:text-Smart-blue"
                            title={
                              all ? 'Снять со всех страниц' : 'Отметить на всех страницах'
                            }
                          >
                            {action.label}
                          </button>
                        </th>
                      )
                    })}
                    <th className="border-b border-gray-200 px-4 py-3 text-center text-xs font-medium text-gray-900">
                      Всё
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {PAGE_GROUPS.map((group) => (
                    <Fragment key={group}>
                      <tr className="bg-gray-50/60">
                        <td
                          colSpan={CRUD_ACTIONS.length + 2}
                          className="border-b border-gray-200 px-4 py-1.5 text-xs font-semibold text-gray-500"
                        >
                          {group}
                        </td>
                      </tr>
                      {ADMIN_PAGES.filter((p) => p.group === group).map((page) => {
                        const perms = permissions[page.key] ?? NO_ACCESS
                        const allOnRow = CRUD_ACTIONS.every((a) => perms[a.key])
                        return (
                          <tr
                            key={page.key}
                            className="border-b border-gray-200 transition last:border-b-0 hover:bg-gray-50"
                          >
                            <td className="px-4 py-2.5 text-slate-800">{page.label}</td>
                            {CRUD_ACTIONS.map((action) => (
                              <td key={action.key} className="px-4 py-2.5">
                                <div className="flex justify-center">
                                  <Checkbox
                                    checked={perms[action.key]}
                                    onChange={(v) => toggle(page.key, action.key, v)}
                                  />
                                </div>
                              </td>
                            ))}
                            <td className="px-4 py-2.5">
                              <div className="flex justify-center">
                                <Checkbox
                                  checked={allOnRow}
                                  onChange={(v) => toggleRow(page.key, v)}
                                />
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-2 text-sm text-gray-500">
              Создание, изменение и удаление подразумевают просмотр — он отмечается
              автоматически. Страница без просмотра полностью недоступна роли.
            </p>
            {touched && grantsNothing && (
              <p className="mt-1 text-sm text-red-600">
                Отметьте хотя бы одну страницу — роль без доступа бессмысленна.
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
          <Button hierarchy="secondary-gray" size="md" onClick={() => setFormOpen(false)}>
            Отменить
          </Button>
          <Button size="md" onClick={submit}>
            {editingId ? 'Сохранить' : 'Создать роль'}
          </Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        destructive
        confirmLabel="Удалить"
        title="Удалить роль"
        description={
          <span className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-gray-400" />
            <span>
              Роль <b className="font-semibold text-slate-800">{deleteTarget?.name}</b> будет
              удалена. Назначить её новым администраторам станет нельзя.
            </span>
          </span>
        }
        onConfirm={() => {
          if (deleteTarget) deleteRole(deleteTarget.id)
        }}
      />
    </div>
  )
}
