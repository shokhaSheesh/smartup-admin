import { X } from 'lucide-react'

export type DateRange = { from: string; to: string }

export const EMPTY_RANGE: DateRange = { from: '', to: '' }

/** Inclusive range check against an ISO timestamp. Empty bounds are open. */
export function inRange(iso: string | null, range: DateRange): boolean {
  if (!iso) return range.from === '' && range.to === ''
  const day = new Date(iso).toISOString().slice(0, 10)
  if (range.from && day < range.from) return false
  if (range.to && day > range.to) return false
  return true
}

type DateRangeFilterProps = {
  label?: string
  value: DateRange
  onChange: (range: DateRange) => void
}

export function DateRangeFilter({ label = 'Период', value, onChange }: DateRangeFilterProps) {
  const dirty = value.from !== '' || value.to !== ''

  return (
    <div className="flex w-full flex-col items-start gap-1.5">
      <div className="flex items-center gap-2">
        <span className="text-sm leading-5 font-medium text-slate-700">{label}</span>
        {dirty && (
          <button
            type="button"
            onClick={() => onChange(EMPTY_RANGE)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-Smart-blue transition hover:underline"
          >
            <X className="size-3" />
            Сбросить
          </button>
        )}
      </div>
      <div className="flex w-full items-center gap-2">
        <div className="flex flex-1 items-center rounded-lg bg-white px-3 py-2.5 outline outline-1 outline-offset-[-1px] outline-gray-200 transition focus-within:outline-Smart-blue">
          <input
            type="date"
            aria-label={`${label} — с`}
            value={value.from}
            max={value.to || undefined}
            onChange={(e) => onChange({ ...value, from: e.target.value })}
            className="w-full bg-transparent text-sm text-neutral-900 outline-none"
          />
        </div>
        <span className="shrink-0 text-sm text-gray-400">—</span>
        <div className="flex flex-1 items-center rounded-lg bg-white px-3 py-2.5 outline outline-1 outline-offset-[-1px] outline-gray-200 transition focus-within:outline-Smart-blue">
          <input
            type="date"
            aria-label={`${label} — по`}
            value={value.to}
            min={value.from || undefined}
            onChange={(e) => onChange({ ...value, to: e.target.value })}
            className="w-full bg-transparent text-sm text-neutral-900 outline-none"
          />
        </div>
      </div>
    </div>
  )
}
