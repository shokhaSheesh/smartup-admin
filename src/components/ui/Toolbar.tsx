import type { ReactNode } from 'react'
import { Search, SlidersHorizontal } from 'lucide-react'
import { cn } from '@/lib/cn'

type ToolbarProps = {
  search: string
  onSearchChange: (value: string) => void
  placeholder?: string
  filtersActive?: boolean
  onToggleFilters?: () => void
  children?: ReactNode
}

/** Search field + optional filter toggle + trailing actions. */
export function Toolbar({
  search,
  onSearchChange,
  placeholder = 'Поиск',
  filtersActive,
  onToggleFilters,
  children,
}: ToolbarProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex flex-1 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3.5 py-2.5">
        <Search className="size-5 shrink-0 text-gray-400" />
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-base text-gray-700 outline-none placeholder:text-gray-500"
        />
      </div>

      {onToggleFilters && (
        <button
          type="button"
          onClick={onToggleFilters}
          aria-label="Фильтры"
          className={cn(
            'flex size-11 shrink-0 items-center justify-center rounded-lg border transition',
            filtersActive
              ? 'border-Smart-blue bg-Smart-blue/5 text-Smart-blue'
              : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50',
          )}
        >
          <SlidersHorizontal className="size-5" />
        </button>
      )}

      {children}
    </div>
  )
}

/** Square icon button matching the toolbar geometry. */
export function ToolbarIconButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition hover:bg-gray-50"
    >
      <Icon className="size-5" />
    </button>
  )
}
