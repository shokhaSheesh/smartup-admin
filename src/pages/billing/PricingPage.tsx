import { useMemo, useState } from 'react'
import {
  Plus,
  Pencil,
  Info,
  Gift,
  Package,
  CreditCard,
  Wallet,
  Ban,
  ArrowRight,
} from 'lucide-react'
import type { PriceTier } from '@/types/admin'
import { priceTiers as seedTiers, billingSettings } from '@/data/mock'
import { PageCard, FormCard, PageHeader } from '@/components/ui/PageCard'
import { DataTable } from '@/components/ui/DataTable'
import type { Column } from '@/components/ui/DataTable'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { RowMenu } from '@/components/ui/RowMenu'
import { formatDate, formatMoney, formatNumber } from '@/lib/format'
import { cn } from '@/lib/cn'

type TierDraft = {
  name: string
  volumeFrom: string
  volumeTo: string
  pricePerDoc: string
  effectiveFrom: string
}

function emptyTierDraft(): TierDraft {
  return {
    name: '',
    volumeFrom: '',
    volumeTo: '',
    pricePerDoc: '',
    effectiveFrom: new Date().toISOString().slice(0, 10),
  }
}

function draftFromTier(tier: PriceTier): TierDraft {
  return {
    name: tier.name,
    volumeFrom: String(tier.volumeFrom),
    volumeTo: tier.volumeTo === null ? '' : String(tier.volumeTo),
    pricePerDoc: String(tier.pricePerDoc),
    effectiveFrom: tier.effectiveFrom.slice(0, 10),
  }
}

function toNumber(value: string): number {
  const n = Number(value.replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

/** The charge waterfall from the billing spec — one step per card. */
const WATERFALL = [
  {
    icon: Gift,
    title: 'Бесплатный лимит',
    text: '10 исходящих документов в месяц — списание 0',
    tone: 'bg-blue-50 text-Smart-blue',
  },
  {
    icon: Package,
    title: 'Квота подписки',
    text: 'Есть остаток квоты — списание 0, квота уменьшается',
    tone: 'bg-green-100 text-emerald-600',
  },
  {
    icon: CreditCard,
    title: 'Доплата сверх квоты',
    text: 'Квота исчерпана и включён режим «оплата за документ»',
    tone: 'bg-amber-50 text-amber-600',
  },
  {
    icon: Wallet,
    title: 'Баланс PAYG',
    text: 'Списание цены уровня с предоплаченного баланса',
    tone: 'bg-gray-100 text-slate-600',
  },
  {
    icon: Ban,
    title: 'Блокировка',
    text: 'Средств недостаточно — отправка останавливается',
    tone: 'bg-red-100 text-red-600',
  },
]

export default function PricingPage() {
  const [tiers, setTiers] = useState<PriceTier[]>(() => seedTiers.map((t) => ({ ...t })))

  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<TierDraft>(emptyTierDraft)
  const [touched, setTouched] = useState(false)

  const [settings, setSettings] = useState({
    freeMonthlyAllowance: String(billingSettings.freeMonthlyAllowance),
    currency: billingSettings.currency,
    billableRule: billingSettings.billableRule,
    rounding: billingSettings.rounding,
  })
  const [saved, setSaved] = useState(false)

  const sortedTiers = useMemo(
    () => [...tiers].sort((a, b) => a.volumeFrom - b.volumeFrom),
    [tiers],
  )

  function openCreate() {
    setEditingId(null)
    setDraft(emptyTierDraft())
    setTouched(false)
    setFormOpen(true)
  }

  function openEdit(tier: PriceTier) {
    setEditingId(tier.id)
    setDraft(draftFromTier(tier))
    setTouched(false)
    setFormOpen(true)
  }

  const nameInvalid = draft.name.trim().length === 0

  function submitTier() {
    setTouched(true)
    if (nameInvalid) return

    const payload = {
      name: draft.name.trim(),
      volumeFrom: toNumber(draft.volumeFrom),
      volumeTo: draft.volumeTo.trim() === '' ? null : toNumber(draft.volumeTo),
      pricePerDoc: toNumber(draft.pricePerDoc),
      effectiveFrom: new Date(draft.effectiveFrom).toISOString(),
    }

    if (editingId) {
      setTiers((prev) => prev.map((t) => (t.id === editingId ? { ...t, ...payload } : t)))
    } else {
      setTiers((prev) => [...prev, { id: `tier-${Date.now()}`, ...payload }])
    }
    setFormOpen(false)
  }

  const columns: Column<PriceTier>[] = [
    {
      key: 'name',
      header: 'Уровень',
      cell: (t) => <span className="font-medium text-slate-800">{t.name}</span>,
    },
    {
      key: 'from',
      header: 'Объём от',
      cls: 'text-right',
      cell: (t) => <span className="tabular-nums">{formatNumber(t.volumeFrom)}</span>,
    },
    {
      key: 'to',
      header: 'Объём до',
      cls: 'text-right',
      cell: (t) =>
        t.volumeTo === null ? (
          <span className="text-gray-400">—</span>
        ) : (
          <span className="tabular-nums">{formatNumber(t.volumeTo)}</span>
        ),
    },
    {
      key: 'price',
      header: 'Цена за документ',
      cls: 'text-right',
      cell: (t) => (
        <span className="font-medium whitespace-nowrap tabular-nums text-slate-800">
          {formatMoney(t.pricePerDoc)}
        </span>
      ),
    },
    {
      key: 'effective',
      header: 'Действует с',
      cell: (t) => <span className="whitespace-nowrap">{formatDate(t.effectiveFrom)}</span>,
    },
    {
      key: 'actions',
      header: '',
      cls: 'w-12',
      cell: (t) => (
        <div onClick={(e) => e.stopPropagation()}>
          <RowMenu
            items={[
              {
                label: 'Редактировать',
                icon: <Pencil className="size-4" />,
                onClick: () => openEdit(t),
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
          title="Тарификация за документ"
          actions={
            <button
              type="button"
              onClick={openCreate}
              className="flex shrink-0 items-center gap-2 rounded-lg bg-Smart-green px-4 py-2.5 text-base font-semibold text-white shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] transition hover:brightness-105"
            >
              <Plus className="size-5" />
              Добавить уровень
            </button>
          }
        />

        <div className="mt-4 flex items-start gap-3 rounded-xl border border-Smart-blue/30 bg-Smart-blue/5 px-4 py-3">
          <Info className="mt-0.5 size-5 shrink-0 text-Smart-blue" />
          <div className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-slate-800">
              Одна цена за документ — никогда не по типу документа
            </span>
            <span className="text-sm text-slate-600">
              Счёт-фактура, акт, ТТН, договор и любой другой из 16 типов тарифицируются одинаково.
              Отличается только уровень по объёму: цена определяется количеством исходящих
              документов за скользящий месяц. Тарифицируются только исходящие документы при
              успешной отправке — входящие и подписание бесплатны.
            </span>
          </div>
        </div>

        <DataTable
          columns={columns}
          rows={sortedTiers}
          rowKey={(t) => t.id}
          onRowClick={(t) => openEdit(t)}
          emptyMessage="Уровни не найдены"
        />
      </PageCard>

      <FormCard title="Порядок списания за исходящий документ">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-stretch">
          {WATERFALL.map((step, i) => (
            <div key={step.title} className="flex flex-1 items-stretch gap-3">
              <div className="flex flex-1 flex-col gap-2 rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'flex size-8 shrink-0 items-center justify-center rounded-lg',
                      step.tone,
                    )}
                  >
                    <step.icon className="size-4" strokeWidth={1.8} />
                  </span>
                  <span className="text-xs font-medium text-gray-400">Шаг {i + 1}</span>
                </div>
                <span className="text-sm font-semibold text-slate-800">{step.title}</span>
                <span className="text-xs leading-5 text-gray-500">{step.text}</span>
              </div>
              {i < WATERFALL.length - 1 && (
                <ArrowRight className="my-auto hidden size-4 shrink-0 text-gray-300 lg:block" />
              )}
            </div>
          ))}
        </div>
      </FormCard>

      <FormCard
        title="Общие настройки тарификации"
        action={
          saved ? (
            <span className="text-sm font-medium text-emerald-600">Настройки сохранены</span>
          ) : undefined
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:max-w-2xl">
          <Input
            label="Бесплатный месячный лимит"
            value={settings.freeMonthlyAllowance}
            inputMode="numeric"
            hint="Исходящих документов в месяц бесплатно"
            onChange={(e) => {
              setSaved(false)
              setSettings((s) => ({ ...s, freeMonthlyAllowance: e.target.value }))
            }}
          />
          <Input
            label="Валюта"
            value={settings.currency}
            onChange={(e) => {
              setSaved(false)
              setSettings((s) => ({ ...s, currency: e.target.value }))
            }}
          />
          <Input
            label="Что тарифицируется"
            value={settings.billableRule}
            onChange={(e) => {
              setSaved(false)
              setSettings((s) => ({ ...s, billableRule: e.target.value }))
            }}
          />
          <Input
            label="Правило округления"
            value={settings.rounding}
            onChange={(e) => {
              setSaved(false)
              setSettings((s) => ({ ...s, rounding: e.target.value }))
            }}
          />
        </div>

        <div className="mt-6">
          <Button size="md" onClick={() => setSaved(true)}>
            Сохранить
          </Button>
        </div>
      </FormCard>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingId ? 'Редактировать уровень' : 'Добавить уровень'}
        maxWidth="max-w-2xl"
      >
        <div className="px-6 py-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Название уровня"
              value={draft.name}
              destructive={touched && nameInvalid}
              hint={touched && nameInvalid ? 'Укажите название уровня' : undefined}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              placeholder="Уровень 1"
            />
            <Input
              label="Цена за документ, сум"
              value={draft.pricePerDoc}
              inputMode="numeric"
              onChange={(e) => setDraft((d) => ({ ...d, pricePerDoc: e.target.value }))}
              placeholder="500"
            />
            <Input
              label="Объём от"
              value={draft.volumeFrom}
              inputMode="numeric"
              onChange={(e) => setDraft((d) => ({ ...d, volumeFrom: e.target.value }))}
              placeholder="0"
            />
            <Input
              label="Объём до"
              value={draft.volumeTo}
              inputMode="numeric"
              hint="Оставьте пустым для верхнего уровня без ограничения"
              onChange={(e) => setDraft((d) => ({ ...d, volumeTo: e.target.value }))}
              placeholder="1000"
            />
            <Input
              label="Действует с"
              type="date"
              value={draft.effectiveFrom}
              onChange={(e) => setDraft((d) => ({ ...d, effectiveFrom: e.target.value }))}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
          <Button hierarchy="secondary-gray" size="md" onClick={() => setFormOpen(false)}>
            Отменить
          </Button>
          <Button size="md" onClick={submitTier}>
            {editingId ? 'Сохранить' : 'Добавить'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
