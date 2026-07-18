import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { cn } from '@/lib/cn'

type PillSelectProps = {
  options: string[]
  value: string
  onChange: (value: string) => void
}

export function PillSelect({ options, value, onChange }: PillSelectProps) {
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
        className="flex items-center gap-1 rounded-2xl border border-gray-200 bg-gray-50 py-1.5 pl-4 pr-2.5 text-sm font-medium text-slate-700 transition hover:bg-gray-100"
      >
        {value}
        <ChevronDown className={cn('size-4 text-gray-500 transition', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute left-0 z-30 mt-2 max-h-64 w-64 overflow-y-auto rounded-xl border border-gray-100 bg-white py-1 shadow-[0px_12px_24px_0px_rgba(91,104,113,0.24)]">
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => {
                onChange(opt)
                setOpen(false)
              }}
              className={cn(
                'flex w-full items-center justify-between gap-2 px-4 py-2 text-left text-sm font-medium transition hover:bg-gray-50',
                opt === value ? 'text-Smart-blue' : 'text-slate-700',
              )}
            >
              {opt}
              {opt === value && <Check className="size-4 text-Smart-blue" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
