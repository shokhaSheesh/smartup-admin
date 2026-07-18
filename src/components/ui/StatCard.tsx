import type { LucideIcon } from 'lucide-react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/cn'

type StatCardProps = {
  value: string
  label: string
  icon: LucideIcon
  iconBg?: string
  iconColor?: string
  /** Percentage change vs the previous period. */
  trend?: number
}

export function StatCard({
  value,
  label,
  icon: Icon,
  iconBg = 'bg-blue-50',
  iconColor = 'text-Smart-blue',
  trend,
}: StatCardProps) {
  return (
    <div className="flex flex-1 items-center gap-6 rounded-xl border border-gray-200 bg-white px-6 py-4 shadow-[0px_4px_12px_0px_rgba(0,0,0,0.08)]">
      <div className="flex flex-col gap-1">
        <span className="text-2xl font-bold leading-8">{value}</span>
        <span className="text-base font-semibold text-slate-800">{label}</span>
        {trend !== undefined && (
          <span
            className={cn(
              'mt-0.5 flex items-center gap-1 text-xs font-medium',
              trend >= 0 ? 'text-emerald-600' : 'text-red-600',
            )}
          >
            {trend >= 0 ? (
              <TrendingUp className="size-3.5" />
            ) : (
              <TrendingDown className="size-3.5" />
            )}
            {trend >= 0 ? '+' : '−'}
            {Math.abs(trend)}% к прошлому периоду
          </span>
        )}
      </div>
      <div
        className={cn(
          'ml-auto flex size-14 shrink-0 items-center justify-center rounded-xl',
          iconBg,
        )}
      >
        <Icon className={cn('size-6', iconColor)} strokeWidth={1.8} />
      </div>
    </div>
  )
}
