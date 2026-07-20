import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  LogOut,
  User,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { currentAdmin } from '@/data/mock'
import { roleName } from '@/data/roles'

type AppTopbarProps = {
  collapsed: boolean
  onToggleCollapse: () => void
}

/** Non-production indicator — admins must always know which environment they are in. */
const ENVIRONMENT: 'production' | 'staging' = 'staging'

function EnvironmentBadge() {
  if (ENVIRONMENT === 'production') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-gray-100 px-3 py-1 text-xs font-semibold text-slate-600">
        <span className="size-1.5 rounded-full bg-emerald-500" />
        PRODUCTION
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-600 ring-1 ring-amber-200">
      <span className="size-1.5 rounded-full bg-amber-500" />
      STAGING
    </span>
  )
}

export function AppTopbar({ collapsed, onToggleCollapse }: AppTopbarProps) {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function onDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [menuOpen])

  const initials = currentAdmin.fullName
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')

  return (
    <header className="flex h-14 items-center justify-between border-b border-slate-100 bg-white px-6">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="flex size-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-50"
          aria-label="Свернуть меню"
        >
          {collapsed ? (
            <ChevronsRight className="size-5" />
          ) : (
            <ChevronsLeft className="size-5" />
          )}
        </button>

        <EnvironmentBadge />

        <span className="text-xs">
          <span className="font-semibold text-slate-800">Панель оператора </span>
          <span className="font-medium text-slate-600">Smartup24 Doc</span>
        </span>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          aria-label="Уведомления"
          className="relative flex size-10 items-center justify-center rounded-full bg-slate-50"
        >
          <Bell className="size-5 text-slate-600" />
          <span className="absolute right-2.5 top-2 size-1.5 rounded-full bg-red-500 ring-1 ring-white" />
        </button>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className={cn(
              'flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-1 transition hover:bg-gray-50',
            )}
          >
            <span className="flex size-8 items-center justify-center rounded-full bg-Smart-blue text-xs font-semibold text-white">
              {initials}
            </span>
            <span className="flex flex-col items-start">
              <span className="text-sm font-medium text-slate-800">
                {currentAdmin.fullName}
              </span>
              <span className="text-xs font-medium text-Smart-blue">
                {roleName(currentAdmin.role)}
              </span>
            </span>
            <ChevronDown
              className={cn('size-5 text-gray-500 transition', menuOpen && 'rotate-180')}
            />
          </button>

          {menuOpen && (
            <div className="absolute right-0 z-30 mt-1 w-48 overflow-hidden rounded-lg border border-gray-100 bg-white py-1 shadow-[0px_12px_24px_0px_rgba(91,104,113,0.24)]">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false)
                  navigate('/admin/team')
                }}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-gray-50"
              >
                <User className="size-4" />
                Мой профиль
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false)
                  navigate('/login')
                }}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium text-red-500 transition hover:bg-red-50"
              >
                <LogOut className="size-4" />
                Выйти
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
