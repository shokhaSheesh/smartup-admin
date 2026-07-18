import { useMemo, useState } from 'react'
import { Plus, Pencil, Copy, Archive } from 'lucide-react'
import type { Plan } from '@/types/admin'
import { plans as seedPlans } from '@/data/mock'
import { periodLabel } from '@/types/labels'
import { PageCard, PageHeader } from '@/components/ui/PageCard'
import { Toolbar } from '@/components/ui/Toolbar'
import { DataTable } from '@/components/ui/DataTable'
import type { Column } from '@/components/ui/DataTable'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Checkbox } from '@/components/ui/Checkbox'
import { Button } from '@/components/ui/Button'
import { RowMenu } from '@/components/ui/RowMenu'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { formatMoney, formatNumber } from '@/lib/format'
import { cn } from '@/lib/cn'

type PlanPeriod = Plan['period']

/** Feature flags offered by the platform — checkbox list in the plan form. */
const FEATURE_OPTIONS = [
  'Электронная подпись',
  'Базовая поддержка',
  'Приоритетная поддержка',
  'Персональный менеджер',
  'Импорт Excel',
  'API-доступ',
  'Интеграция 1С',
  'Расширенная аналитика',
]

const PERIOD_OPTIONS: Array<{ value: PlanPeriod; label: string }> = [
  { value: 'month', label: periodLabel.month },
  { value: 'quarter', label: periodLabel.quarter },
  { value: 'year', label: periodLabel.year },
]

type PlanDraft = {
  nameRu: string
  nameUz: string
  description: string
  price: string
  period: PlanPeriod
  docQuota: string
  maxEmployees: string
  features: string[]
  isActive: boolean
  visibleToNewSignups: boolean
  sortOrder: string
}

function emptyDraft(sortOrder: number): PlanDraft {
  return {
    nameRu: '',
    nameUz: '',
    description: '',
    price: '',
    period: 'month',
    docQuota: '',
    maxEmployees: '',
    features: [],
    isActive: true,
    visibleToNewSignups: true,
    sortOrder: String(sortOrder),
  }
}

function draftFromPlan(plan: Plan): PlanDraft {
  return {
    nameRu: plan.nameRu,
    nameUz: plan.nameUz,
    description: plan.description,
    price: String(plan.price),
    period: plan.period,
    docQuota: String(plan.docQuota),
    maxEmployees: String(plan.maxEmployees),
    features: [...plan.features],
    isActive: plan.isActive,
    visibleToNewSignups: plan.visibleToNewSignups,
    sortOrder: String(plan.sortOrder),
  }
}

function toNumber(value: string): number {
  const n = Number(value.replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

export default function PlansPage() {
  const [list, setList] = useState<Plan[]>(() => seedPlans.map((p) => ({ ...p })))
  const [search, setSearch] = useState('')

  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<PlanDraft>(() => emptyDraft(1))
  const [touched, setTouched] = useState(false)

  const [archiveTarget, setArchiveTarget] = useState<Plan | null>(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const sorted = [...list].sort((a, b) => a.sortOrder - b.sortOrder)
    if (!q) return sorted
    return sorted.filter(
      (p) =>
        p.nameRu.toLowerCase().includes(q) ||
        p.nameUz.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q),
    )
  }, [list, search])

  function openCreate() {
    setEditingId(null)
    setDraft(emptyDraft(list.length + 1))
    setTouched(false)
    setFormOpen(true)
  }

  function openEdit(plan: Plan) {
    setEditingId(plan.id)
    setDraft(draftFromPlan(plan))
    setTouched(false)
    setFormOpen(true)
  }

  function duplicate(plan: Plan) {
    const copy: Plan = {
      ...plan,
      id: `plan-copy-${Date.now()}`,
      nameRu: `${plan.nameRu} (копия)`,
      nameUz: `${plan.nameUz} (nusxa)`,
      features: [...plan.features],
      isActive: false,
      visibleToNewSignups: false,
      sortOrder: Math.max(0, ...list.map((p) => p.sortOrder)) + 1,
      activeSubscribers: 0,
    }
    setList((prev) => [...prev, copy])
  }

  const nameInvalid = draft.nameRu.trim().length === 0

  function submit() {
    setTouched(true)
    if (nameInvalid) return

    if (editingId) {
      setList((prev) =>
        prev.map((p) =>
          p.id === editingId
            ? {
                ...p,
                nameRu: draft.nameRu.trim(),
                nameUz: draft.nameUz.trim(),
                description: draft.description.trim(),
                price: toNumber(draft.price),
                period: draft.period,
                docQuota: toNumber(draft.docQuota),
                maxEmployees: toNumber(draft.maxEmployees),
                features: draft.features,
                isActive: draft.isActive,
                visibleToNewSignups: draft.visibleToNewSignups,
                sortOrder: toNumber(draft.sortOrder),
              }
            : p,
        ),
      )
    } else {
      setList((prev) => [
        ...prev,
        {
          id: `plan-${Date.now()}`,
          nameRu: draft.nameRu.trim(),
          nameUz: draft.nameUz.trim(),
          description: draft.description.trim(),
          price: toNumber(draft.price),
          period: draft.period,
          docQuota: toNumber(draft.docQuota),
          maxEmployees: toNumber(draft.maxEmployees),
          features: draft.features,
          isActive: draft.isActive,
          visibleToNewSignups: draft.visibleToNewSignups,
          sortOrder: toNumber(draft.sortOrder),
          activeSubscribers: 0,
        },
      ])
    }
    setFormOpen(false)
  }

  const columns: Column<Plan>[] = [
    {
      key: 'name',
      header: 'Название',
      cell: (p) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-medium text-slate-800">{p.nameRu}</span>
          <span className="text-xs text-gray-500">{p.nameUz}</span>
        </div>
      ),
    },
    {
      key: 'price',
      header: 'Цена',
      cls: 'text-right',
      cell: (p) => (
        <span className="font-medium whitespace-nowrap tabular-nums text-slate-800">
          {formatMoney(p.price)}
        </span>
      ),
    },
    {
      key: 'period',
      header: 'Период',
      cell: (p) => <span className="whitespace-nowrap">{periodLabel[p.period]}</span>,
    },
    {
      key: 'quota',
      header: 'Квота документов',
      cls: 'text-right',
      cell: (p) => <span className="tabular-nums">{formatNumber(p.docQuota)}</span>,
    },
    {
      key: 'subscribers',
      header: 'Активных подписчиков',
      cls: 'text-right',
      cell: (p) => <span className="tabular-nums">{formatNumber(p.activeSubscribers)}</span>,
    },
    {
      key: 'status',
      header: 'Статус',
      cell: (p) => (
        <span
          className={cn(
            'inline-flex items-center rounded-md px-3 py-1 text-sm font-medium',
            p.isActive ? 'bg-green-100 text-emerald-600' : 'bg-gray-100 text-gray-500',
          )}
        >
          {p.isActive ? 'Активен' : 'Архивный'}
        </span>
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
                label: 'Редактировать',
                icon: <Pencil className="size-4" />,
                onClick: () => openEdit(p),
              },
              {
                label: 'Дублировать',
                icon: <Copy className="size-4" />,
                onClick: () => duplicate(p),
              },
              {
                label: 'Архивировать',
                icon: <Archive className="size-4" />,
                danger: true,
                disabled: !p.isActive,
                onClick: () => setArchiveTarget(p),
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
          title="Тарифные планы"
          subtitle={`Планов на платформе: ${formatNumber(list.length)} · активных: ${formatNumber(
            list.filter((p) => p.isActive).length,
          )}`}
        />

        <div className="mt-4">
          <Toolbar
            search={search}
            onSearchChange={setSearch}
            placeholder="Поиск по названию плана"
          >
            <button
              type="button"
              onClick={openCreate}
              className="flex shrink-0 items-center gap-2 rounded-lg bg-Smart-green px-4 py-2.5 text-base font-semibold text-white shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] transition hover:brightness-105"
            >
              <Plus className="size-5" />
              Создать план
            </button>
          </Toolbar>
        </div>

        <DataTable
          columns={columns}
          rows={filtered}
          rowKey={(p) => p.id}
          onRowClick={(p) => openEdit(p)}
          emptyMessage="Планы не найдены"
        />
      </PageCard>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingId ? 'Редактировать план' : 'Создать план'}
        maxWidth="max-w-3xl"
      >
        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Название RU"
              value={draft.nameRu}
              destructive={touched && nameInvalid}
              hint={touched && nameInvalid ? 'Укажите название плана' : undefined}
              onChange={(e) => setDraft((d) => ({ ...d, nameRu: e.target.value }))}
              placeholder="Бизнес"
            />
            <Input
              label="Название UZ"
              value={draft.nameUz}
              onChange={(e) => setDraft((d) => ({ ...d, nameUz: e.target.value }))}
              placeholder="Biznes"
            />
          </div>

          <div className="mt-4 flex w-full flex-col items-start gap-1.5">
            <label
              htmlFor="plan-description"
              className="text-sm font-medium leading-5 text-slate-700"
            >
              Описание
            </label>
            <div className="flex w-full items-center gap-2 overflow-hidden rounded-lg bg-white px-3.5 py-2.5 outline outline-1 outline-offset-[-1px] outline-gray-200 transition focus-within:outline-Smart-blue">
              <textarea
                id="plan-description"
                rows={2}
                value={draft.description}
                onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                placeholder="Для кого этот план"
                className="flex-1 resize-none bg-transparent text-base font-normal leading-6 text-neutral-900 outline-none placeholder:text-gray-500"
              />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Цена за период, сум"
              value={draft.price}
              inputMode="numeric"
              onChange={(e) => setDraft((d) => ({ ...d, price: e.target.value }))}
              placeholder="450000"
            />
            <Select
              label="Период"
              value={draft.period}
              options={PERIOD_OPTIONS}
              onChange={(v) => setDraft((d) => ({ ...d, period: v as PlanPeriod }))}
            />
            <Input
              label="Включённая квота документов (N)"
              value={draft.docQuota}
              inputMode="numeric"
              hint="Исходящие документы, списываются из квоты по факту отправки"
              onChange={(e) => setDraft((d) => ({ ...d, docQuota: e.target.value }))}
              placeholder="1500"
            />
            <Input
              label="Макс. сотрудников"
              value={draft.maxEmployees}
              inputMode="numeric"
              onChange={(e) => setDraft((d) => ({ ...d, maxEmployees: e.target.value }))}
              placeholder="10"
            />
            <Input
              label="Порядок сортировки"
              value={draft.sortOrder}
              inputMode="numeric"
              onChange={(e) => setDraft((d) => ({ ...d, sortOrder: e.target.value }))}
              placeholder="1"
            />
          </div>

          <div className="mt-6">
            <span className="text-sm font-medium leading-5 text-slate-700">Функции</span>
            <div className="mt-2 grid grid-cols-1 gap-2.5 rounded-xl border border-gray-200 bg-gray-50 p-4 sm:grid-cols-2">
              {FEATURE_OPTIONS.map((feature) => (
                <Checkbox
                  key={feature}
                  checked={draft.features.includes(feature)}
                  onChange={(checked) =>
                    setDraft((d) => ({
                      ...d,
                      features: checked
                        ? [...d.features, feature]
                        : d.features.filter((f) => f !== feature),
                    }))
                  }
                >
                  <span className="text-sm text-slate-700">{feature}</span>
                </Checkbox>
              ))}
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <Checkbox
              checked={draft.isActive}
              onChange={(checked) => setDraft((d) => ({ ...d, isActive: checked }))}
            >
              <span className="text-sm text-slate-700">Активен</span>
            </Checkbox>
            <Checkbox
              checked={draft.visibleToNewSignups}
              onChange={(checked) => setDraft((d) => ({ ...d, visibleToNewSignups: checked }))}
            >
              <span className="text-sm text-slate-700">Виден новым регистрациям</span>
            </Checkbox>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
          <Button hierarchy="secondary-gray" size="md" onClick={() => setFormOpen(false)}>
            Отменить
          </Button>
          <Button size="md" onClick={submit}>
            {editingId ? 'Сохранить' : 'Создать'}
          </Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={archiveTarget !== null}
        onClose={() => setArchiveTarget(null)}
        destructive
        confirmLabel="Архивировать"
        title="Архивировать план"
        description={
          archiveTarget && (
            <>
              План <b className="font-semibold text-slate-800">{archiveTarget.nameRu}</b> перестанет
              быть доступен для новых подписок. Действующие подписки (
              {formatNumber(archiveTarget.activeSubscribers)}) продолжат работать до конца периода.
              Действие записывается в журнал аудита.
            </>
          )
        }
        onConfirm={() => {
          if (!archiveTarget) return
          setList((prev) =>
            prev.map((p) =>
              p.id === archiveTarget.id
                ? { ...p, isActive: false, visibleToNewSignups: false }
                : p,
            ),
          )
        }}
      />
    </div>
  )
}
