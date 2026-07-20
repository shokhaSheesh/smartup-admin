import { useMemo, useState } from 'react'
import { Plus, Pencil, Copy, Archive, X } from 'lucide-react'
import type { Plan } from '@/types/admin'
import { plans as seedPlans } from '@/data/mock'
import { PageCard, PageHeader } from '@/components/ui/PageCard'
import { Toolbar } from '@/components/ui/Toolbar'
import { DataTable } from '@/components/ui/DataTable'
import type { Column } from '@/components/ui/DataTable'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Checkbox } from '@/components/ui/Checkbox'
import { Button } from '@/components/ui/Button'
import { RowMenu } from '@/components/ui/RowMenu'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { formatMoney, formatNumber } from '@/lib/format'
import { cn } from '@/lib/cn'

type PlanDraft = {
  name: string
  price: string
  durationDays: string
  docQuota: string
  overagePricePerDoc: string
  maxEmployees: string
  features: string[]
  isActive: boolean
  sortOrder: string
}

function emptyDraft(sortOrder: number): PlanDraft {
  return {
    name: '',
    price: '',
    durationDays: '30',
    docQuota: '',
    overagePricePerDoc: '',
    maxEmployees: '',
    features: [],
    isActive: true,
    sortOrder: String(sortOrder),
  }
}

function draftFromPlan(plan: Plan): PlanDraft {
  return {
    name: plan.name,
    price: String(plan.price),
    durationDays: String(plan.durationDays),
    docQuota: String(plan.docQuota),
    overagePricePerDoc: String(plan.overagePricePerDoc),
    maxEmployees: String(plan.maxEmployees),
    features: [...plan.features],
    isActive: plan.isActive,
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
  const [featureDraft, setFeatureDraft] = useState('')

  /** Adds a typed-in feature, ignoring blanks and duplicates. */
  function addFeature() {
    const value = featureDraft.trim()
    if (!value) return
    setDraft((d) =>
      d.features.includes(value) ? d : { ...d, features: [...d.features, value] },
    )
    setFeatureDraft('')
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const sorted = [...list].sort((a, b) => a.sortOrder - b.sortOrder)
    if (!q) return sorted
    return sorted.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.features.some((f) => f.toLowerCase().includes(q)),
    )
  }, [list, search])

  function openCreate() {
    setEditingId(null)
    setDraft(emptyDraft(list.length + 1))
    setFeatureDraft('')
    setTouched(false)
    setFormOpen(true)
  }

  function openEdit(plan: Plan) {
    setEditingId(plan.id)
    setDraft(draftFromPlan(plan))
    setFeatureDraft('')
    setTouched(false)
    setFormOpen(true)
  }

  function duplicate(plan: Plan) {
    const copy: Plan = {
      ...plan,
      id: `plan-copy-${Date.now()}`,
      name: `${plan.name} (копия)`,
      features: [...plan.features],
      isActive: false,
      sortOrder: Math.max(0, ...list.map((p) => p.sortOrder)) + 1,
      activeSubscribers: 0,
    }
    setList((prev) => [...prev, copy])
  }

  const nameInvalid = draft.name.trim().length === 0

  function submit() {
    setTouched(true)
    if (nameInvalid) return

    if (editingId) {
      setList((prev) =>
        prev.map((p) =>
          p.id === editingId
            ? {
                ...p,
                name: draft.name.trim(),
                price: toNumber(draft.price),
                durationDays: toNumber(draft.durationDays),
                docQuota: toNumber(draft.docQuota),
                overagePricePerDoc: toNumber(draft.overagePricePerDoc),
                maxEmployees: toNumber(draft.maxEmployees),
                features: draft.features,
                isActive: draft.isActive,
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
          name: draft.name.trim(),
          price: toNumber(draft.price),
          durationDays: toNumber(draft.durationDays),
          docQuota: toNumber(draft.docQuota),
          overagePricePerDoc: toNumber(draft.overagePricePerDoc),
          maxEmployees: toNumber(draft.maxEmployees),
          features: draft.features,
          isActive: draft.isActive,
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
      cell: (p) => <span className="font-medium text-slate-800">{p.name}</span>,
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
      key: 'duration',
      header: 'Длительность',
      cls: 'text-right',
      cell: (p) => (
        <span className="whitespace-nowrap tabular-nums">
          {formatNumber(p.durationDays)} дн.
        </span>
      ),
    },
    {
      key: 'quota',
      header: 'Квота документов',
      cls: 'text-right',
      cell: (p) => <span className="tabular-nums">{formatNumber(p.docQuota)}</span>,
    },
    {
      key: 'overage',
      header: 'Сверх квоты, за док.',
      cls: 'text-right',
      cell: (p) => (
        <span className="whitespace-nowrap tabular-nums text-slate-800">
          {formatMoney(p.overagePricePerDoc)}
        </span>
      ),
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
          <Input
            label="Название"
            value={draft.name}
            destructive={touched && nameInvalid}
            hint={touched && nameInvalid ? 'Укажите название плана' : undefined}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            placeholder="Бизнес"
          />

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Цена за период, сум"
              value={draft.price}
              inputMode="numeric"
              onChange={(e) => setDraft((d) => ({ ...d, price: e.target.value }))}
              placeholder="450000"
            />
            <Input
              label="Длительность, дней"
              value={draft.durationDays}
              inputMode="numeric"
              hint="Например: 30, 90, 365"
              onChange={(e) =>
                setDraft((d) => ({ ...d, durationDays: e.target.value.replace(/[^\d]/g, '') }))
              }
              placeholder="30"
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
              label="Цена за документ сверх квоты, сум"
              value={draft.overagePricePerDoc}
              inputMode="numeric"
              hint="Списывается с баланса за каждый документ после исчерпания квоты"
              onChange={(e) =>
                setDraft((d) => ({ ...d, overagePricePerDoc: e.target.value }))
              }
              placeholder="320"
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
            <span className="text-sm leading-5 font-medium text-slate-700">Функции</span>
            <p className="mt-1 text-sm text-gray-500">
              Добавьте любые функции, входящие в план — список произвольный.
            </p>

            <div className="mt-2 flex gap-2">
              <div className="flex flex-1 items-center rounded-lg bg-white px-3.5 py-2.5 outline outline-1 outline-offset-[-1px] outline-gray-200 transition focus-within:outline-Smart-blue">
                <input
                  value={featureDraft}
                  onChange={(e) => setFeatureDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addFeature()
                    }
                  }}
                  placeholder="Например: Интеграция 1С"
                  className="flex-1 bg-transparent text-base leading-6 font-normal text-neutral-900 outline-none placeholder:text-gray-500"
                />
              </div>
              <Button
                hierarchy="secondary-gray"
                size="md"
                disabled={featureDraft.trim().length === 0}
                onClick={addFeature}
              >
                Добавить
              </Button>
            </div>

            {draft.features.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {draft.features.map((feature) => (
                  <span
                    key={feature}
                    className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 py-1 pr-1.5 pl-3 text-sm font-medium text-Smart-blue"
                  >
                    {feature}
                    <button
                      type="button"
                      aria-label={`Удалить «${feature}»`}
                      onClick={() =>
                        setDraft((d) => ({
                          ...d,
                          features: d.features.filter((f) => f !== feature),
                        }))
                      }
                      className="flex size-5 items-center justify-center rounded transition hover:bg-Smart-blue/10"
                    >
                      <X className="size-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <Checkbox
              checked={draft.isActive}
              onChange={(checked) => setDraft((d) => ({ ...d, isActive: checked }))}
            >
              <span className="text-sm text-slate-700">Активен</span>
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
              План <b className="font-semibold text-slate-800">{archiveTarget.name}</b> перестанет
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
              p.id === archiveTarget.id ? { ...p, isActive: false } : p,
            ),
          )
        }}
      />
    </div>
  )
}
