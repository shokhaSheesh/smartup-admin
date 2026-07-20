import type { LucideIcon } from 'lucide-react'
import {
  BarChart3,
  Building2,
  Users,
  FileText,
  Wallet,
  ShieldCheck,
  Settings,
  LogOut,
} from 'lucide-react'

export type NavChild = { label: string; to: string }
export type NavItem = {
  label: string
  icon: LucideIcon
  to?: string
  children?: NavChild[]
}

export const mainNav: NavItem[] = [
  { label: 'Дашборд', icon: BarChart3, to: '/dashboard' },
  { label: 'Компании', icon: Building2, to: '/tenants' },
  { label: 'Пользователи', icon: Users, to: '/users' },
  { label: 'Документы', icon: FileText, to: '/documents' },
  {
    label: 'Биллинг',
    icon: Wallet,
    children: [
      { label: 'Тарифные планы', to: '/billing/plans' },
      { label: 'Ценовые уровни', to: '/billing/pricing' },
      { label: 'Подписки', to: '/billing/subscriptions' },
      { label: 'Транзакции', to: '/billing/transactions' },
      { label: 'Ручные корректировки', to: '/billing/adjustments' },
    ],
  },
  {
    label: 'Администрирование',
    icon: ShieldCheck,
    children: [
      { label: 'Команда', to: '/admin/team' },
      { label: 'Роли и права', to: '/admin/roles' },
      { label: 'Журнал аудита', to: '/audit' },
    ],
  },
]

export const bottomNav: NavItem[] = [
  { label: 'Настройки', icon: Settings, to: '/settings' },
  { label: 'Выйти', icon: LogOut, to: '/login' },
]
