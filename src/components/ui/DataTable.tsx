import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/** Config-driven column, per the design system convention. */
export type Column<T> = {
  key: string
  header: string
  show?: boolean
  cls?: string
  cell: (row: T) => ReactNode
}

type DataTableProps<T> = {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string
  onRowClick?: (row: T) => void
  emptyMessage?: string
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  emptyMessage = 'Ничего не найдено',
}: DataTableProps<T>) {
  const cols = columns.filter((c) => c.show !== false)

  return (
    <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-gray-50">
            {cols.map((c) => (
              <th
                key={c.key}
                className={cn(
                  'border-b border-gray-200 px-4 py-3 text-left text-xs font-medium whitespace-nowrap text-gray-900',
                  c.cls,
                )}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={cols.length} className="px-4 py-12 text-center text-gray-400">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  'border-b border-gray-200 transition last:border-b-0 hover:bg-gray-50',
                  onRowClick && 'cursor-pointer',
                )}
              >
                {cols.map((c) => (
                  <td key={c.key} className={cn('h-16 px-4 text-gray-900', c.cls)}>
                    {c.cell(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
