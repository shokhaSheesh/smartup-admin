import { useState, useRef, useEffect } from 'react'
import { MoreVertical } from 'lucide-react'
import type { ReactNode } from 'react'

export type RowMenuItem = {
  label: string
  icon?: ReactNode
  onClick: () => void
  disabled?: boolean
  danger?: boolean
}

export function RowMenu({ items }: { items: RowMenuItem[] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex size-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
        aria-label="Действия"
      >
        <MoreVertical className="size-5" />
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-1 w-48 overflow-hidden rounded-lg border border-gray-100 bg-white py-1 shadow-[0px_12px_24px_0px_rgba(91,104,113,0.24)]">
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              disabled={item.disabled}
              onClick={() => {
                item.onClick()
                setOpen(false)
              }}
              className={[
                'flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium transition',
                item.disabled
                  ? 'cursor-not-allowed text-gray-300'
                  : item.danger
                    ? 'text-red-500 hover:bg-red-50'
                    : 'text-slate-700 hover:bg-gray-50',
              ].join(' ')}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
