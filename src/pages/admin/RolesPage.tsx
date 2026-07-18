import { useMemo, useState } from 'react'
import { RotateCcw, Save, ShieldAlert, Users } from 'lucide-react'
import { PageCard, PageHeader } from '@/components/ui/PageCard'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { adminUsers, PERMISSION_MODULES, roles } from '@/data/mock'
import type { AdminRole, PermissionLevel } from '@/types/admin'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/cn'

/** Cycle order for the in-cell permission picker. */
const LEVELS: PermissionLevel[] = ['full', 'edit', 'view', 'metadata', 'own', 'none']

const levelLabel: Record<PermissionLevel, string> = {
  full: 'Полный',
  edit: 'Редактирование',
  view: 'Просмотр',
  metadata: 'Только метаданные',
  own: 'Свои действия',
  none: '—',
}

const levelHint: Record<PermissionLevel, string> = {
  full: 'Полный доступ: просмотр, создание, изменение и удаление, включая специальные действия.',
  edit: 'Просмотр и изменение записей, включая блокировку, но без настройки модуля.',
  view: 'Только чтение — изменения недоступны.',
  metadata: 'Видны только метаданные (номер, стороны, суммы). Содержимое документа скрыто.',
  own: 'Доступны только собственные действия администратора.',
  none: 'Доступа к модулю нет — раздел скрыт в интерфейсе.',
}

const levelStyle: Record<PermissionLevel, string> = {
  full: 'bg-green-100 text-emerald-600 hover:brightness-105',
  edit: 'bg-blue-50 text-Smart-blue hover:brightness-105',
  view: 'bg-blue-50 text-Smart-blue hover:brightness-105',
  metadata: 'bg-gray-100 text-slate-600 hover:bg-gray-200',
  own: 'bg-gray-100 text-slate-600 hover:bg-gray-200',
  none: 'bg-gray-50 text-gray-400 hover:bg-gray-100',
}

type Matrix = Record<AdminRole, Record<string, PermissionLevel>>

/** Builds the editable matrix from the seed roles. */
function buildMatrix(): Matrix {
  return roles.reduce((acc, role) => {
    acc[role.id] = { ...role.permissions }
    return acc
  }, {} as Matrix)
}

function nextLevel(level: PermissionLevel): PermissionLevel {
  const i = LEVELS.indexOf(level)
  return LEVELS[(i + 1) % LEVELS.length]
}

export default function RolesPage() {
  const [matrix, setMatrix] = useState<Matrix>(buildMatrix)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const holders = useMemo(() => {
    return roles.reduce<Record<string, number>>((acc, role) => {
      acc[role.id] = adminUsers.filter((u) => u.role === role.id).length
      return acc
    }, {})
  }, [])

  const baseline = useMemo(buildMatrix, [])

  const dirtyCount = useMemo(() => {
    let n = 0
    for (const role of roles) {
      for (const m of PERMISSION_MODULES) {
        if (matrix[role.id][m.key] !== baseline[role.id][m.key]) n += 1
      }
    }
    return n
  }, [matrix, baseline])

  function cycle(roleId: AdminRole, moduleKey: string) {
    setMatrix((prev) => ({
      ...prev,
      [roleId]: { ...prev[roleId], [moduleKey]: nextLevel(prev[roleId][moduleKey]) },
    }))
  }

  function save(reason: string) {
    // In a real build the reason and the diff travel to the audit log.
    void reason
    setConfirmOpen(false)
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Роли и права доступа"
        subtitle="Матрица прав — источник истины для доступа администраторов к модулям платформы"
        actions={
          <>
            <Button
              hierarchy="secondary-gray"
              size="md"
              leadingIcon={<RotateCcw className="size-4" />}
              disabled={dirtyCount === 0}
              onClick={() => setMatrix(buildMatrix())}
            >
              Сбросить
            </Button>
            <Button
              size="md"
              leadingIcon={<Save className="size-4" />}
              disabled={dirtyCount === 0}
              onClick={() => setConfirmOpen(true)}
            >
              Сохранить изменения
            </Button>
          </>
        }
      />

      {/* --------------------------------------------------------- role cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {roles.map((role) => (
          <div
            key={role.id}
            className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-[0px_4px_12px_0px_rgba(0,0,0,0.08)]"
          >
            <span className="text-base font-semibold text-slate-800">{role.name}</span>
            <p className="flex-1 text-sm text-gray-500">{role.description}</p>
            <span className="mt-1 flex items-center gap-2 text-sm font-medium text-slate-700">
              <Users className="size-4 text-gray-400" />
              {formatNumber(holders[role.id] ?? 0)} администраторов
            </span>
          </div>
        ))}
      </div>

      {/* ------------------------------------------------------------- matrix */}
      <PageCard>
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-slate-800">Матрица прав</h2>
          <span className="text-sm text-gray-500">
            {dirtyCount > 0
              ? `Несохранённых изменений: ${formatNumber(dirtyCount)}`
              : 'Изменений нет'}
          </span>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Нажмите на ячейку, чтобы переключить уровень доступа.
        </p>

        <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="border-b border-gray-200 px-4 py-3 text-left text-xs font-medium whitespace-nowrap text-gray-900">
                  Модуль
                </th>
                {roles.map((role) => (
                  <th
                    key={role.id}
                    className="border-b border-gray-200 px-4 py-3 text-left text-xs font-medium whitespace-nowrap text-gray-900"
                  >
                    {role.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSION_MODULES.map((m) => (
                <tr key={m.key} className="border-b border-gray-200 last:border-b-0">
                  <td className="h-16 px-4 text-sm font-medium whitespace-nowrap text-slate-800">
                    {m.label}
                  </td>
                  {roles.map((role) => {
                    const level = matrix[role.id][m.key]
                    const changed = level !== baseline[role.id][m.key]
                    return (
                      <td key={role.id} className="h-16 px-4">
                        <button
                          type="button"
                          onClick={() => cycle(role.id, m.key)}
                          title={levelHint[level]}
                          className={cn(
                            'inline-flex min-w-36 items-center justify-between gap-2 rounded-md px-3 py-1 text-sm font-medium transition',
                            levelStyle[level],
                            changed && 'ring-2 ring-Smart-blue ring-offset-1',
                          )}
                        >
                          {levelLabel[level]}
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ------------------------------------------------------------ legend */}
        <div className="mt-6">
          <h3 className="text-sm font-medium leading-5 text-slate-700">
            Условные обозначения
          </h3>
          <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
            {LEVELS.map((level) => (
              <div key={level} className="flex items-start gap-3">
                <span
                  className={cn(
                    'inline-flex shrink-0 items-center rounded-md px-3 py-1 text-sm font-medium',
                    levelStyle[level],
                  )}
                >
                  {levelLabel[level]}
                </span>
                <span className="text-sm text-gray-500">{levelHint[level]}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 flex items-start gap-2 rounded-lg bg-gray-50 px-3.5 py-2.5">
          <ShieldAlert className="mt-0.5 size-4 shrink-0 text-gray-400" />
          <span className="text-sm text-gray-500">
            Любое изменение прав записывается в журнал аудита и применяется ко всем
            администраторам с этой ролью при следующем входе.
          </span>
        </div>
      </PageCard>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={save}
        title="Сохранить изменения прав"
        confirmLabel="Сохранить"
        description={
          <>
            Будет изменено{' '}
            <b className="font-semibold text-slate-800">{formatNumber(dirtyCount)}</b> прав
            доступа. Изменение прав — аудируемое действие, причина обязательна.
          </>
        }
      />
    </div>
  )
}
