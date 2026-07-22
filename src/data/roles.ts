/**
 * Roles and their per-page permissions.
 *
 * A role grants CRUD on each page of the panel. Roles are created by admins, so
 * they live in a store rather than a fixed union — the team page reads the same
 * list when assigning someone a role.
 */
import { useSyncExternalStore } from 'react'

export type CrudAction = 'read' | 'create' | 'update' | 'delete'

export const CRUD_ACTIONS: Array<{ key: CrudAction; label: string }> = [
  { key: 'read', label: 'Просмотр' },
  { key: 'create', label: 'Создание' },
  { key: 'update', label: 'Изменение' },
  { key: 'delete', label: 'Удаление' },
]

export type CrudPermissions = Record<CrudAction, boolean>

/** Permissions per page key. A missing page means no access at all. */
export type RolePermissions = Record<string, CrudPermissions>

export type Role = {
  id: string
  name: string
  permissions: RolePermissions
  /** Seeded roles cannot be deleted — the panel would be unusable without them. */
  system?: boolean
}

/** Every page of the panel, grouped the way the sidebar groups them. */
export const ADMIN_PAGES: Array<{ key: string; label: string; group: string }> = [
  { key: 'dashboard', label: 'Дашборд', group: 'Основное' },
  { key: 'tenants', label: 'Компании', group: 'Основное' },
  { key: 'users', label: 'Пользователи', group: 'Основное' },
  { key: 'documents', label: 'Документы', group: 'Основное' },

  { key: 'plans', label: 'Тарифные планы', group: 'Биллинг' },
  { key: 'pricing', label: 'Ценовые уровни', group: 'Биллинг' },
  { key: 'subscriptions', label: 'Подписки', group: 'Биллинг' },
  { key: 'transactions', label: 'Транзакции', group: 'Биллинг' },
  { key: 'adjustments', label: 'Ручные корректировки', group: 'Биллинг' },

  { key: 'team', label: 'Команда администраторов', group: 'Администрирование' },
  { key: 'roles', label: 'Роли и права', group: 'Администрирование' },
  { key: 'audit', label: 'Журнал аудита', group: 'Администрирование' },
]

export const PAGE_GROUPS = Array.from(new Set(ADMIN_PAGES.map((p) => p.group)))

export const NO_ACCESS: CrudPermissions = {
  read: false,
  create: false,
  update: false,
  delete: false,
}

export const FULL_ACCESS: CrudPermissions = {
  read: true,
  create: true,
  update: true,
  delete: true,
}

export const READ_ONLY: CrudPermissions = {
  read: true,
  create: false,
  update: false,
  delete: false,
}

/** Same permissions on every page — the starting point for a new role. */
export function everyPage(perms: CrudPermissions): RolePermissions {
  return Object.fromEntries(ADMIN_PAGES.map((p) => [p.key, { ...perms }]))
}

function withOverrides(
  base: CrudPermissions,
  overrides: Record<string, CrudPermissions>,
): RolePermissions {
  return { ...everyPage(base), ...overrides }
}

const seedRoles: Role[] = [
  {
    id: 'super_admin',
    name: 'Супер-админ',
    system: true,
    permissions: everyPage(FULL_ACCESS),
  },
  {
    id: 'support',
    name: 'Поддержка',
    system: true,
    permissions: withOverrides(READ_ONLY, {
      tenants: { read: true, create: false, update: true, delete: false },
      users: { read: true, create: false, update: true, delete: false },
      documents: READ_ONLY,
      team: NO_ACCESS,
      roles: NO_ACCESS,
      adjustments: NO_ACCESS,
    }),
  },
  {
    id: 'finance',
    name: 'Финансы',
    system: true,
    permissions: withOverrides(READ_ONLY, {
      plans: FULL_ACCESS,
      pricing: FULL_ACCESS,
      subscriptions: { read: true, create: true, update: true, delete: false },
      adjustments: { read: true, create: true, update: false, delete: false },
      team: NO_ACCESS,
      roles: NO_ACCESS,
    }),
  },
  {
    id: 'analyst',
    name: 'Аналитик',
    system: true,
    permissions: withOverrides(READ_ONLY, {
      team: NO_ACCESS,
      roles: NO_ACCESS,
      audit: NO_ACCESS,
      adjustments: NO_ACCESS,
    }),
  },
]

let roles: Role[] = seedRoles
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useRoles(): Role[] {
  return useSyncExternalStore(subscribe, () => roles)
}

export function createRole(name: string, permissions: RolePermissions) {
  roles = [
    ...roles,
    { id: `role-${Date.now()}`, name: name.trim(), permissions },
  ]
  emit()
}

export function updateRole(id: string, name: string, permissions: RolePermissions) {
  roles = roles.map((r) => (r.id === id ? { ...r, name: name.trim(), permissions } : r))
  emit()
}

export function deleteRole(id: string) {
  roles = roles.filter((r) => r.id !== id || r.system)
  emit()
}

/** Role name for a stored role id, falling back to the raw id. */
export function roleName(id: string): string {
  return roles.find((r) => r.id === id)?.name ?? id
}

/** How many pages the role can reach at all, for the summary column. */
export function accessiblePageCount(role: Role): number {
  return ADMIN_PAGES.filter((p) => role.permissions[p.key]?.read).length
}
