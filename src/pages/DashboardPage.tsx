import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Building2, CreditCard, Users } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageCard'
import { StatCard } from '@/components/ui/StatCard'
import { PeriodPicker, type Period } from '@/components/dashboard/PeriodPicker'
import {
  DASHBOARD_NOW,
  companyGrowth,
  docTypeSplit,
  providerSplit,
  revenueSeries,
  totalCompanies,
  totalRevenue,
  totalUsers,
  userGrowth,
} from '@/data/dashboard'
import { formatCompactSum, formatNumber } from '@/lib/format'
import { cn } from '@/lib/cn'

const BLUE = '#1b9cd8'
const GREEN = '#43b02a'
/** Categorical palette for the provider pie — distinct, brand-anchored. */
const PIE_COLORS = ['#1b9cd8', '#43b02a', '#f59e0b', '#8b5cf6', '#ef4444', '#0ea5e9']

const axisProps = {
  tick: { fill: '#64748b', fontSize: 12 },
  tickLine: false,
  axisLine: { stroke: '#e5e7eb' },
} as const

const tooltipStyle = {
  contentStyle: {
    borderRadius: 8,
    border: '1px solid #e5e7eb',
    fontSize: 13,
    boxShadow: '0px 4px 12px 0px rgba(0,0,0,0.08)',
  },
} as const

function ChartCard({
  title,
  subtitle,
  children,
  className,
}: {
  title: string
  subtitle?: string
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={cn(
        'flex flex-col rounded-md bg-white p-4 shadow-[0px_4px_12px_0px_rgba(0,0,0,0.08)]',
        className,
      )}
    >
      <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
      {subtitle && <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>}
      <div className="mt-4 flex-1">{children}</div>
    </section>
  )
}

/** A count line chart — companies or users over the period. */
function GrowthChart({
  data,
  color,
  gradientId,
}: {
  data: Array<{ label: string; value: number }>
  color: string
  gradientId: string
}) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -12 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.24} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="label" {...axisProps} />
        <YAxis {...axisProps} width={48} allowDecimals={false} />
        <Tooltip
          {...tooltipStyle}
          formatter={(v) => [formatNumber(Number(v)), 'Всего']}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export default function DashboardPage() {
  const [period, setPeriod] = useState<Period>({
    granularity: 'month',
    year: DASHBOARD_NOW.getFullYear(),
    month: DASHBOARD_NOW.getMonth(),
  })

  const { granularity: g, year, month } = period

  const companies = useMemo(() => companyGrowth(g, year, month), [g, year, month])
  const users = useMemo(() => userGrowth(g, year, month), [g, year, month])
  const revenue = useMemo(() => revenueSeries(g, year, month), [g, year, month])
  const providers = useMemo(() => providerSplit(g, year, month), [g, year, month])
  const docTypes = useMemo(() => docTypeSplit(g, year, month), [g, year, month])

  const providerTotal = useMemo(
    () => providers.reduce((sum, s) => sum + s.value, 0),
    [providers],
  )
  const pct = (v: number) => (providerTotal === 0 ? 0 : Math.round((v / providerTotal) * 100))

  const userTotals = useMemo(() => totalUsers(), [])

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Дашборд"
        subtitle="Рост платформы, выручка и активность за выбранный период"
        actions={<PeriodPicker value={period} onChange={setPeriod} />}
      />

      {/* --------------------------------------------------------------- KPIs */}
      <div className="flex flex-col gap-4 lg:flex-row">
        <StatCard
          value={formatNumber(totalCompanies())}
          label="Всего компаний"
          icon={Building2}
          iconBg="bg-blue-50"
          iconColor="text-Smart-blue"
        />
        <StatCard
          value={formatNumber(userTotals.total)}
          label="Всего пользователей"
          icon={Users}
          iconBg="bg-purple-50"
          iconColor="text-purple-600"
        />
        <StatCard
          value={formatCompactSum(totalRevenue())}
          label="Общая выручка"
          icon={CreditCard}
          iconBg="bg-green-100"
          iconColor="text-emerald-600"
        />
      </div>

      {/* ------------------------------------------------------ growth curves */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard title="Рост числа компаний" subtitle="Накопительно на конец периода">
          <GrowthChart data={companies} color={BLUE} gradientId="companiesGrad" />
        </ChartCard>

        <ChartCard title="Рост числа пользователей" subtitle="Накопительно на конец периода">
          <GrowthChart data={users} color="#8b5cf6" gradientId="usersGrad" />
        </ChartCard>

        <ChartCard title="Выручка" subtitle="Сумма успешных платежей за период">
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={revenue} margin={{ top: 4, right: 8, bottom: 0, left: 4 }}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={GREEN} stopOpacity={0.24} />
                  <stop offset="100%" stopColor={GREEN} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="label" {...axisProps} />
              <YAxis
                {...axisProps}
                width={64}
                tickFormatter={(v: number) =>
                  v >= 1_000_000
                    ? `${Math.round(v / 1_000_000)} млн`
                    : v >= 1_000
                      ? `${Math.round(v / 1_000)} тыс`
                      : String(v)
                }
              />
              <Tooltip
                {...tooltipStyle}
                formatter={(v) => [formatCompactSum(Number(v)), 'Выручка']}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={GREEN}
                strokeWidth={2}
                fill="url(#revenueGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Платёжные провайдеры" subtitle="Доля успешных платежей за период, %">
          {providers.length === 0 ? (
            <div className="flex h-[240px] items-center justify-center text-sm text-gray-400">
              Нет платежей за период
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={providers}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={54}
                  outerRadius={88}
                  paddingAngle={2}
                >
                  {providers.map((slice, i) => (
                    <Cell key={slice.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  {...tooltipStyle}
                  formatter={(v, name) => [
                    `${pct(Number(v))}% · ${formatNumber(Number(v))} платежей`,
                    name,
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
          {providers.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
              {providers.map((slice, i) => (
                <span key={slice.name} className="flex items-center gap-1.5 text-sm">
                  <span
                    className="size-2.5 rounded-full"
                    style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                  />
                  <span className="text-slate-700">{slice.name}</span>
                  <span className="font-medium text-slate-500">{pct(slice.value)}%</span>
                </span>
              ))}
            </div>
          )}
        </ChartCard>
      </div>

      {/* -------------------------------------------------------- doc types */}
      <ChartCard title="Типы отправленных документов" subtitle="Количество за период">
        {docTypes.length === 0 ? (
          <div className="flex h-[320px] items-center justify-center text-sm text-gray-400">
            Нет документов за период
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(320, docTypes.length * 34)}>
            <BarChart
              data={docTypes}
              layout="vertical"
              margin={{ top: 0, right: 16, bottom: 0, left: 8 }}
            >
              <XAxis type="number" {...axisProps} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="type"
                {...axisProps}
                width={260}
                tick={{ fill: '#334155', fontSize: 12 }}
              />
              <Tooltip
                {...tooltipStyle}
                cursor={{ fill: '#f1f5f9' }}
                formatter={(v) => [formatNumber(Number(v)), 'Документов']}
              />
              <Bar dataKey="count" fill={BLUE} radius={[0, 4, 4, 0]} barSize={18} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    </div>
  )
}
