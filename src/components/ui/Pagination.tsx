import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react'
import { formatNumber } from '@/lib/format'

export const PAGE_SIZES = [20, 50, 100]

type PaginationProps = {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
}

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="mt-4 flex items-center gap-3">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        aria-label="Предыдущая страница"
        className="flex size-9 items-center justify-center rounded-full border border-gray-200 bg-white text-slate-700 transition hover:bg-gray-50 disabled:opacity-40"
      >
        <ChevronLeft className="size-4" />
      </button>

      <span className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold text-slate-700">
        {page} / {pageCount}
      </span>

      <button
        type="button"
        disabled={page >= pageCount}
        onClick={() => onPageChange(page + 1)}
        aria-label="Следующая страница"
        className="flex size-9 items-center justify-center rounded-full border border-gray-200 bg-white text-slate-700 transition hover:bg-gray-50 disabled:opacity-40"
      >
        <ChevronRight className="size-4" />
      </button>

      <div className="relative">
        <select
          value={pageSize}
          onChange={(e) => {
            onPageSizeChange(Number(e.target.value))
            onPageChange(1)
          }}
          aria-label="Строк на странице"
          className="appearance-none rounded-lg border border-gray-200 bg-white py-2.5 pl-4 pr-9 text-sm font-semibold text-slate-700 outline-none"
        >
          {PAGE_SIZES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
      </div>

      <span className="ml-auto text-sm text-slate-600">
        Итог по количеству:{' '}
        <b className="font-bold text-slate-800">{formatNumber(total)}</b>
      </span>
    </div>
  )
}

/** Slices rows for the current page. */
export function paginate<T>(rows: T[], page: number, pageSize: number): T[] {
  const start = (page - 1) * pageSize
  return rows.slice(start, start + pageSize)
}
