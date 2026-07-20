import { useMemo, useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import type { PriceTier } from '@/types/admin'
import { priceTiers as seedTiers, billingSettings } from '@/data/mock'
import { PageCard, FormCard, PageHeader } from '@/components/ui/PageCard'
import { DataTable } from '@/components/ui/DataTable'
import type { Column } from '@/components/ui/DataTable'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { RowMenu } from '@/components/ui/RowMenu'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { formatDate, formatMoney, formatNumber } from '@/lib/format'

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

export default function PricingPage() {
  const [tiers, setTiers] = useState<PriceTier[]>(() => seedTiers.map((t) => ({ ...t })))

  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<TierDraft>(emptyTierDraft)
  const [touched, setTouched] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<PriceTier | null>(null)

  const [allowance, setAllowance] = useState({
    docs: String(billingSettings.freeAllowanceDocs),
    days: String(billingSettings.freeAllowanceDays),
  })
  const [allowanceSaved, setAllowanceSaved] = useState(false)

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
              {
                label: 'Удалить уровень',
                icon: <Trash2 className="size-4" />,
                danger: true,
                onClick: () => setDeleteTarget(t),
              },
            ]}
          />
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <FormCard
        title="Бесплатный лимит"
        action={
          <div className="flex items-center gap-3">
            {allowanceSaved && (
              <span className="text-sm font-medium text-emerald-600">Сохранено</span>
            )}
            <Button
              size="md"
              onClick={() => {
                billingSettings.freeAllowanceDocs = Number(allowance.docs) || 0
                billingSettings.freeAllowanceDays = Number(allowance.days) || 0
                setAllowanceSaved(true)
              }}
            >
              Сохранить
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:max-w-2xl sm:grid-cols-2">
          <Input
            label="Документов бесплатно"
            inputMode="numeric"
            value={allowance.docs}
            onChange={(e) => {
              setAllowance((a) => ({ ...a, docs: e.target.value.replace(/[^\d]/g, '') }))
              setAllowanceSaved(false)
            }}
            placeholder="10"
          />
          <Input
            label="Длительность, дней"
            inputMode="numeric"
            value={allowance.days}
            onChange={(e) => {
              setAllowance((a) => ({ ...a, days: e.target.value.replace(/[^\d]/g, '') }))
              setAllowanceSaved(false)
            }}
            placeholder="30"
          />
        </div>
      </FormCard>

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

        <DataTable
          columns={columns}
          rows={sortedTiers}
          rowKey={(t) => t.id}
          onRowClick={(t) => openEdit(t)}
          emptyMessage="Уровни не найдены"
        />
      </PageCard>

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

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        destructive
        confirmLabel="Удалить"
        title="Удалить ценовой уровень"
        description={
          deleteTarget && (
            <>
              Уровень <b className="font-semibold text-slate-800">{deleteTarget.name}</b> (
              {formatNumber(deleteTarget.volumeFrom)}–
              {deleteTarget.volumeTo === null ? '∞' : formatNumber(deleteTarget.volumeTo)} док.)
              будет удалён. Документы в этом объёме начнут тарифицироваться по соседнему уровню.
            </>
          )
        }
        onConfirm={() => {
          if (!deleteTarget) return
          setTiers((prev) => prev.filter((t) => t.id !== deleteTarget.id))
        }}
      />
    </div>
  )
}
