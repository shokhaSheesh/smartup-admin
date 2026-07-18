import { cn } from '@/lib/cn'

export type TabItem = {
  key: string
  label: string
  count?: number
  pill?: string
}

type TabsProps = {
  tabs: TabItem[]
  active: string
  onChange: (key: string) => void
}

/** Underlined tabs with optional count pills. */
export function Tabs({ tabs, active, onChange }: TabsProps) {
  return (
    <div className="mt-6 flex items-center gap-6 border-b border-gray-200">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={cn(
            'flex h-12 items-center gap-3 border-b-2 px-3.5 text-sm font-medium transition',
            active === tab.key
              ? 'border-Smart-blue text-slate-800'
              : 'border-transparent text-gray-400 hover:text-slate-600',
          )}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span
              className={cn(
                'flex min-w-6 items-center justify-center rounded-2xl px-2 py-0.5 text-xs text-white',
                tab.pill ?? 'bg-gray-300',
              )}
            >
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
