import { useMemo } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  AlertTriangle,
  Ban,
  Building2,
  CalendarClock,
  ChevronRight,
  CreditCard,
  FileText,
  Gauge,
  Send,
  UserPlus,
  Wallet,
  XCircle,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageCard'
import { StatCard } from '@/components/ui/StatCard'
import {
  balances,
  companies,
  docsByTypeSeries,
  docsPerDaySeries,
  effectivePricePerDoc,
  newCompaniesSeries,
  payments,
  plans,
  revenueSplitSeries,
  subscriptions,
} from '@/data/mock'
import { cn } from '@/lib/cn'
import {
  daysUntil,
  formatDate,
  formatNumber,
  formatSum,
  percent,
} from '@/lib/format'

const BLUE = '#1b9cd8'
const GREEN = '#43b02a'
const DAY = 86_400_000

/* ------------------------------------------------------------ local helpers */

/** Chart section wrapper — design-system chart pattern. */
function ChartSection({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: ReactNode
}) {
  return (
    <section className="rounded-md bg-white p-4 shadow-[0px_4px_12px_0px_rgba(0,0,0,0.08)]">
      <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
      {subtitle && <p className="mb-2 mt-0.5 text-sm text-gray-500">{subtitle}</p>}
      <div className={cn(subtitle ? 'mt-2' : 'mt-4')}>{children}</div>
    </section>
  )
}

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

type AttentionRow = {
  id: string
  to: string
  title: string
  meta: string
  value: string
  tone?: 'danger' | 'warning' | 'neutral'
}

type AttentionGroup = {
  key: string
  title: string
  hint: string
  icon: LucideIcon
  pill: string
  to: string
  rows: AttentionRow[]
}

function AttentionCard({ group }: { group: AttentionGroup }) {
  const Icon = group.icon
  const shown = group.rows.slice(0, 4)

  return (
    <div className="flex flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-[0px_1px_2px_0px_rgba(16,24,40,0.06)]">
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gray-50">
          <Icon className="size-5 text-slate-600" strokeWidth={1.8} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-slate-800">
              {group.title}
            </h3>
            <span
              className={cn(
                'flex min-w-6 items-center justify-center rounded-2xl px-2 py-0.5 text-xs font-medium text-white',
                group.pill,
              )}
            >
              {group.rows.length}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-gray-500">{group.hint}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-col">
        {shown.length === 0 && (
          <span className="py-4 text-center text-sm text-gray-400">Нет записей</span>
        )}
        {shown.map((row) => (
          <Link
            key={row.id}
            to={row.to}
            className="flex items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-gray-50"
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-slate-700">
                {row.title}
              </span>
              <span className="block truncate text-xs text-gray-500">{row.meta}</span>
            </span>
            <span
              className={cn(
                'shrink-0 text-sm font-semibold',
                row.tone === 'danger'
                  ? 'text-red-600'
                  : row.tone === 'warning'
                    ? 'text-amber-600'
                    : 'text-slate-700',
              )}
            >
              {row.value}
            </span>
            <ChevronRight className="size-4 shrink-0 text-gray-400" />
          </Link>
        ))}
      </div>

      {group.rows.length > shown.length && (
        <Link
          to={group.to}
          className="mt-2 text-sm font-semibold text-Smart-blue hover:underline"
        >
          Показать все ({group.rows.length})
        </Link>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------- page */

export default function DashboardPage() {
  const docsSeries = useMemo(() => docsPerDaySeries(30), [])
  const byType = useMemo(() => docsByTypeSeries(), [])
  const revenue = useMemo(() => revenueSplitSeries(), [])
  const newCompanies = useMemo(() => newCompaniesSeries(), [])

  const kpi = useMemo(() => {
    const docs30d = docsSeries.reduce((s, d) => s + d.sent, 0)
    const half = Math.floor(docsSeries.length / 2)
    const prev = docsSeries.slice(0, half).reduce((s, d) => s + d.sent, 0)
    const curr = docsSeries.slice(half).reduce((s, d) => s + d.sent, 0)
    const trend = prev > 0 ? Math.round(((curr - prev) / prev) * 100) : 0

    const activeCompanies = companies.filter((c) => c.status === 'active').length
    const since30d = Date.now() - 30 * DAY
    const newCompanies30d = companies.filter(
      (c) => new Date(c.createdAt).getTime() >= since30d,
    ).length

    const revenue30d = payments
      .filter(
        (p) => p.status === 'success' && new Date(p.createdAt).getTime() >= since30d,
      )
      .reduce((s, p) => s + p.amount, 0)

    const mrr = subscriptions
      .filter((s) => s.status === 'active' || s.status === 'expiring')
      .reduce((sum, s) => {
        const plan = plans.find((p) => p.id === s.planId)
        const months = plan?.period === 'year' ? 12 : plan?.period === 'quarter' ? 3 : 1
        return sum + s.amountPaid / months
      }, 0)

    const heldBalance = balances.reduce((s, b) => s + b.balance, 0)

    return {
      docs30d,
      trend,
      activeCompanies,
      newCompanies30d,
      revenue30d,
      mrr,
      heldBalance,
    }
  }, [docsSeries])

  const groups = useMemo<AttentionGroup[]>(() => {
    const byId = new Map(companies.map((c) => [c.id, c]))
    const balanceOf = (companyId: string) => byId.get(companyId)?.balance ?? 0

    const quotaExhausted = subscriptions
      .filter((s) => s.status === 'quota_exhausted' && s.overageMode === null)
      .map<AttentionRow>((s) => ({
        id: s.id,
        to: `/tenants/${s.companyId}`,
        title: s.companyName,
        meta: `${s.planName} · квота ${formatNumber(s.quotaUsed)}/${formatNumber(s.quotaTotal)}`,
        value: 'Отправка остановлена',
        tone: 'danger',
      }))

    const overageLowBalance = subscriptions
      .filter((s) => s.overageMode === 'payg' && balanceOf(s.companyId) < 100_000)
      .sort((a, b) => balanceOf(a.companyId) - balanceOf(b.companyId))
      .map<AttentionRow>((s) => ({
        id: `ov-${s.id}`,
        to: `/tenants/${s.companyId}`,
        title: s.companyName,
        meta: `Доплата: ${formatNumber(s.overageDocs)} док. · ${s.planName}`,
        value: formatSum(balanceOf(s.companyId)),
        tone: 'danger',
      }))

    const nearQuota = subscriptions
      .filter(
        (s) => s.status === 'active' && percent(s.quotaUsed, s.quotaTotal) > 80,
      )
      .sort(
        (a, b) =>
          percent(b.quotaUsed, b.quotaTotal) - percent(a.quotaUsed, a.quotaTotal),
      )
      .map<AttentionRow>((s) => ({
        id: `nq-${s.id}`,
        to: `/tenants/${s.companyId}`,
        title: s.companyName,
        meta: `${formatNumber(s.quotaUsed)} из ${formatNumber(s.quotaTotal)} документов`,
        value: `${percent(s.quotaUsed, s.quotaTotal)}%`,
        tone: 'warning',
      }))

    const lowBalance = companies
      .filter((c) => {
        if (c.status === 'blocked') return false
        const price = effectivePricePerDoc(c)
        return c.balance < price * 10
      })
      .sort((a, b) => a.balance - b.balance)
      .map<AttentionRow>((c) => {
        const price = effectivePricePerDoc(c)
        const docsLeft = price > 0 ? Math.floor(c.balance / price) : 0
        return {
          id: `lb-${c.id}`,
          to: `/tenants/${c.id}`,
          title: c.name,
          meta: `Хватит на ${formatNumber(docsLeft)} док. · ${formatSum(price)}/док`,
          value: formatSum(c.balance),
          tone: 'warning',
        }
      })

    const expiringSoon = subscriptions
      .filter((s) => {
        if (s.status === 'expired' || s.status === 'cancelled') return false
        const d = daysUntil(s.periodEnd)
        return d >= 0 && d <= 7
      })
      .sort((a, b) => daysUntil(a.periodEnd) - daysUntil(b.periodEnd))
      .map<AttentionRow>((s) => ({
        id: `ex-${s.id}`,
        to: `/tenants/${s.companyId}`,
        title: s.companyName,
        meta: `${s.planName} · до ${formatDate(s.periodEnd)}${s.autoRenew ? ' · автопродление' : ''}`,
        value: `${daysUntil(s.periodEnd)} дн.`,
        tone: 'warning',
      }))

    const failedPayments = payments
      .filter((p) => p.status === 'failed')
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
      .map<AttentionRow>((p) => ({
        id: `fp-${p.id}`,
        to: '/billing/topups',
        title: p.companyName,
        meta: `${formatDate(p.createdAt)} · ${p.providerRef}`,
        value: formatSum(p.amount),
        tone: 'danger',
      }))

    const blocked = companies
      .filter((c) => c.status === 'blocked')
      .map<AttentionRow>((c) => ({
        id: `bl-${c.id}`,
        to: `/tenants/${c.id}`,
        title: c.name,
        meta: c.statusReason ?? 'Причина не указана',
        value: formatSum(c.balance),
        tone: 'neutral',
      }))

    return [
      {
        key: 'quota',
        title: 'Квота исчерпана, ожидают решения',
        hint: 'Отправка документов приостановлена — требуется выбор тарифа',
        icon: AlertTriangle,
        pill: 'bg-red-500',
        to: '/billing/subscriptions',
        rows: quotaExhausted,
      },
      {
        key: 'overage',
        title: 'На доплате с низким балансом',
        hint: 'Заблокируются на следующей отправке',
        icon: Wallet,
        pill: 'bg-red-500',
        to: '/billing/topups',
        rows: overageLowBalance,
      },
      {
        key: 'nearquota',
        title: 'Приближаются к квоте',
        hint: 'Использовано более 80% квоты периода',
        icon: Gauge,
        pill: 'bg-amber-300',
        to: '/billing/subscriptions',
        rows: nearQuota,
      },
      {
        key: 'lowbalance',
        title: 'Низкий баланс',
        hint: 'Остатка хватит менее чем на 10 документов',
        icon: CreditCard,
        pill: 'bg-amber-300',
        to: '/billing/topups',
        rows: lowBalance,
      },
      {
        key: 'expiring',
        title: 'Подписки истекают за 7 дней',
        hint: 'Требуется продление или подтверждение автопродления',
        icon: CalendarClock,
        pill: 'bg-amber-300',
        to: '/billing/subscriptions',
        rows: expiringSoon,
      },
      {
        key: 'failed',
        title: 'Неуспешные пополнения',
        hint: 'Платежи, отклонённые провайдером',
        icon: XCircle,
        pill: 'bg-red-500',
        to: '/billing/topups',
        rows: failedPayments,
      },
      {
        key: 'blocked',
        title: 'Заблокированные компании',
        hint: 'Доступ к платформе ограничен',
        icon: Ban,
        pill: 'bg-gray-300',
        to: '/tenants',
        rows: blocked,
      },
    ]
  }, [])

  const totalAttention = groups.reduce((s, g) => s + g.rows.length, 0)

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Дашборд" />

      {/* KPI */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <StatCard
          value={formatNumber(kpi.docs30d)}
          label="Документы отправлены (30д)"
          icon={Send}
          iconBg="bg-blue-50"
          iconColor="text-Smart-blue"
          trend={kpi.trend}
        />
        <StatCard
          value={formatNumber(kpi.activeCompanies)}
          label="Активные компании"
          icon={Building2}
          iconBg="bg-green-100"
          iconColor="text-emerald-600"
        />
        <StatCard
          value={formatNumber(kpi.newCompanies30d)}
          label="Новые компании (30д)"
          icon={UserPlus}
          iconBg="bg-blue-50"
          iconColor="text-Smart-blue"
        />
        <StatCard
          value={formatSum(kpi.revenue30d)}
          label="Выручка (30д)"
          icon={CreditCard}
          iconBg="bg-green-100"
          iconColor="text-emerald-600"
        />
        <StatCard
          value={formatSum(kpi.mrr)}
          label="MRR из подписок"
          icon={FileText}
          iconBg="bg-blue-50"
          iconColor="text-Smart-blue"
        />
        <StatCard
          value={formatSum(kpi.heldBalance)}
          label="Общий баланс клиентов (обязательство)"
          icon={Wallet}
          iconBg="bg-amber-50"
          iconColor="text-yellow-500"
        />
      </div>

      {/* Charts */}
      <ChartSection
        title="Отправленные документы по дням"
        subtitle="Последние 30 дней"
      >
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={docsSeries} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="date" {...axisProps} minTickGap={24} />
            <YAxis {...axisProps} width={56} />
            <Tooltip {...tooltipStyle} formatter={(v) => formatNumber(Number(v))} />
            <Line
              type="monotone"
              dataKey="sent"
              name="Отправлено"
              stroke={BLUE}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartSection>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartSection title="Документы по типам" subtitle="Все 16 типов документов">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={byType}
              layout="vertical"
              margin={{ top: 8, right: 16, bottom: 0, left: 8 }}
            >
              <CartesianGrid stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" {...axisProps} />
              <YAxis
                type="category"
                dataKey="type"
                {...axisProps}
                width={180}
                interval={0}
              />
              <Tooltip {...tooltipStyle} formatter={(v) => formatNumber(Number(v))} />
              <Bar dataKey="count" name="Документов" fill={BLUE} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartSection>

        <ChartSection
          title="Структура выручки"
          subtitle="Подписки и оплата за документ, по месяцам"
        >
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={revenue} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="month" {...axisProps} />
              <YAxis
                {...axisProps}
                width={64}
                tickFormatter={(v: number) => `${Math.round(v / 1_000_000)} млн`}
              />
              <Tooltip {...tooltipStyle} formatter={(v) => formatSum(Number(v))} />
              <Legend wrapperStyle={{ fontSize: 13 }} />
              <Bar
                dataKey="subscriptions"
                stackId="rev"
                name="Подписки"
                fill={BLUE}
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="payg"
                stackId="rev"
                name="Оплата за документ"
                fill={GREEN}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartSection>
      </div>

      <ChartSection title="Новые компании" subtitle="По неделям, последние 12 недель">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={newCompanies} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="week" {...axisProps} />
            <YAxis {...axisProps} width={48} allowDecimals={false} />
            <Tooltip {...tooltipStyle} formatter={(v) => formatNumber(Number(v))} />
            <Bar dataKey="count" name="Регистраций" fill={GREEN} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartSection>

      {/* Needs attention */}
      <section className="rounded-md bg-white p-6 shadow-[0px_4px_12px_0px_rgba(0,0,0,0.08)]">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-slate-800">Требует внимания</h2>
          <span className="flex min-w-6 items-center justify-center rounded-2xl bg-red-500 px-2 py-0.5 text-xs font-medium text-white">
            {totalAttention}
          </span>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Ситуации, которые блокируют отправку документов или требуют решения оператора
        </p>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {groups.map((g) => (
            <AttentionCard key={g.key} group={g} />
          ))}
        </div>
      </section>
    </div>
  )
}
