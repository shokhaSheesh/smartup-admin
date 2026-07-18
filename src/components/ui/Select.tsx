import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { cn } from '@/lib/cn'

export type SelectOption = {
  value: string
  label: string
}

type SelectProps = {
  label?: string
  placeholder?: string
  options: SelectOption[]
  value?: string
  onChange?: (value: string) => void
}

export function Select({
  label,
  placeholder = 'Выберите',
  options,
  value,
  onChange,
}: SelectProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = options.find((o) => o.value === value)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  return (
    <div className="flex w-full flex-col items-start gap-1.5" ref={ref}>
      {label && (
        <span className="text-sm font-medium leading-5 text-slate-700">{label}</span>
      )}
      <div className="relative w-full">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={cn(
            'flex w-full items-center gap-2 overflow-hidden rounded-lg bg-white px-3.5 py-2.5 outline outline-1 outline-offset-[-1px] transition',
            open ? 'outline-Smart-blue' : 'outline-gray-200',
          )}
        >
          <span
            className={cn(
              'flex-1 text-left text-base font-normal leading-6',
              selected ? 'text-neutral-900' : 'text-gray-500',
            )}
          >
            {selected ? selected.label : placeholder}
          </span>
          <ChevronDown
            className={cn(
              'size-5 shrink-0 text-gray-500 transition',
              open && 'rotate-180',
            )}
          />
        </button>

        {open && (
          <div className="absolute z-10 mt-1.5 max-h-60 w-full overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
            {options.length === 0 && (
              <div className="px-3.5 py-2 text-sm text-gray-500">Нет доступных ключей</div>
            )}
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange?.(opt.value)
                  setOpen(false)
                }}
                className="flex w-full items-center justify-between gap-2 px-3.5 py-2 text-left text-base text-neutral-900 hover:bg-gray-50"
              >
                <span>{opt.label}</span>
                {opt.value === value && <Check className="size-4 text-Smart-blue" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
