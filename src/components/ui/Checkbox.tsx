import type { ReactNode } from 'react'
import { useId } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/cn'

type CheckboxProps = {
  checked: boolean
  onChange: (checked: boolean) => void
  children?: ReactNode
  id?: string
}

export function Checkbox({ checked, onChange, children, id }: CheckboxProps) {
  const autoId = useId()
  const cbId = id ?? autoId

  return (
    <div className="flex items-start gap-2">
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        id={cbId}
        onClick={() => onChange(!checked)}
        className={cn(
          'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-sm border transition',
          checked
            ? 'border-Smart-blue bg-Smart-blue text-white'
            : 'border-gray-200 bg-white hover:border-Smart-blue',
        )}
      >
        {checked && <Check className="size-3" strokeWidth={3} />}
      </button>
      {children && (
        <label htmlFor={cbId} className="flex-1 cursor-pointer select-none">
          {children}
        </label>
      )}
    </div>
  )
}
