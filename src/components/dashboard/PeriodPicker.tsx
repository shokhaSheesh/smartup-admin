import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Select } from '@/components/ui/Select'
import {
  MONTH_OPTIONS,
  availableYears,
  type Granularity,
} from '@/data/dashboard'

export type Period = {
  granularity: Granularity
  year: number
  month: number
}

const YEAR_OPTIONS = availableYears().map((y) => ({ value: String(y), label: String(y) }))

/**
 * Granularity drives which period inputs matter: Дни needs a month, Месяцы a
 * year, Годы neither. Showing only the relevant input keeps the choice honest.
 */
export function PeriodPicker({
  value,
  onChange,
}: {
  value: Period
  onChange: (period: Period) => void
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="sm:w-64">
        <span className="mb-1.5 block text-sm leading-5 font-medium text-slate-700">
          Разбивка
        </span>
        <SegmentedControl
          value={value.granularity}
          onChange={(granularity) => onChange({ ...value, granularity })}
          options={[
            { value: 'day', label: 'Дни' },
            { value: 'month', label: 'Месяцы' },
            { value: 'year', label: 'Годы' },
          ]}
        />
      </div>

      {value.granularity !== 'year' && (
        <div className="sm:w-40">
          <Select
            label="Год"
            options={YEAR_OPTIONS}
            value={String(value.year)}
            onChange={(v) => onChange({ ...value, year: Number(v) })}
          />
        </div>
      )}

      {value.granularity === 'day' && (
        <div className="sm:w-40">
          <Select
            label="Месяц"
            options={MONTH_OPTIONS}
            value={String(value.month)}
            onChange={(v) => onChange({ ...value, month: Number(v) })}
          />
        </div>
      )}
    </div>
  )
}
