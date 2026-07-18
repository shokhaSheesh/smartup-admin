import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { ChevronUp } from 'lucide-react'
import { LogoMark } from '@/components/brand/Logo'
import { mainNav, bottomNav } from './nav'
import type { NavItem } from './nav'
import { cn } from '@/lib/cn'

type AppSidebarProps = {
  collapsed: boolean
}

function itemIsActive(item: NavItem, pathname: string): boolean {
  if (item.to) return pathname === item.to
  return Boolean(item.children?.some((c) => pathname.startsWith(c.to)))
}

function NavRow({
  item,
  collapsed,
}: {
  item: NavItem
  collapsed: boolean
}) {
  const { pathname } = useLocation()
  const active = itemIsActive(item, pathname)
  const hasChildren = Boolean(item.children?.length)
  const [open, setOpen] = useState(active)
  const Icon = item.icon
  const isLogout = item.label === 'Выйти'

  const rowClass = cn(
    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-base font-medium transition',
    collapsed && 'justify-center px-0',
    isLogout
      ? 'text-red-500 hover:bg-white/5'
      : active
        ? 'bg-white/10 text-white'
        : 'text-slate-300 hover:bg-white/5 hover:text-white',
  )

  if (hasChildren) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={cn(rowClass, 'w-full')}
          title={collapsed ? item.label : undefined}
        >
          <Icon className="size-6 shrink-0" strokeWidth={1.6} />
          {!collapsed && (
            <>
              <span className="flex-1 text-left">{item.label}</span>
              <ChevronUp
                className={cn('size-4 transition', !open && 'rotate-180')}
              />
            </>
          )}
        </button>
        {!collapsed && open && (
          <div className="mt-1 flex flex-col gap-1 pl-3">
            {item.children!.map((child) => (
              <NavLink
                key={child.to}
                to={child.to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-base font-medium transition',
                    isActive
                      ? 'bg-white/10 text-white'
                      : 'text-slate-300 hover:bg-white/5 hover:text-white',
                  )
                }
              >
                {child.label}
              </NavLink>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <NavLink
      to={item.to!}
      className={({ isActive }) =>
        cn(rowClass, isActive && !isLogout && 'bg-white/10 text-white')
      }
      title={collapsed ? item.label : undefined}
    >
      <Icon className="size-6 shrink-0" strokeWidth={1.6} />
      {!collapsed && <span>{item.label}</span>}
    </NavLink>
  )
}

export function AppSidebar({ collapsed }: AppSidebarProps) {
  return (
    <aside
      className={cn(
        'flex h-screen shrink-0 flex-col bg-[#28374A] transition-all duration-200',
        collapsed ? 'w-20 px-3' : 'w-72 px-4',
      )}
    >
      {/* Logo */}
      <div className={cn('flex items-center gap-2 py-6', collapsed && 'justify-center')}>
        <LogoMark size={collapsed ? 34 : 38} className="rounded-xl" />
        {!collapsed && (
          <span className="text-2xl font-semibold tracking-tight text-white">
            smartup
          </span>
        )}
      </div>

      {/* Main nav */}
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
        {mainNav.map((item) => (
          <NavRow key={item.label} item={item} collapsed={collapsed} />
        ))}
      </nav>

      {/* Bottom nav */}
      <div className="flex flex-col gap-1 border-t border-white/10 py-4">
        {bottomNav.map((item) => (
          <NavRow key={item.label} item={item} collapsed={collapsed} />
        ))}
      </div>
    </aside>
  )
}
