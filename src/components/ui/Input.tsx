import type { InputHTMLAttributes, ReactNode } from 'react'
import { useId } from 'react'
import { cn } from '@/lib/cn'

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  hint?: string
  destructive?: boolean
  leadingIcon?: ReactNode
  trailingIcon?: ReactNode
}

export function Input({
  label,
  hint,
  destructive,
  leadingIcon,
  trailingIcon,
  className,
  id,
  ...props
}: InputProps) {
  const autoId = useId()
  const inputId = id ?? autoId

  return (
    <div className="flex w-full flex-col items-start gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="text-sm font-medium leading-5 text-slate-700"
        >
          {label}
        </label>
      )}
      <div
        className={cn(
          'flex w-full items-center gap-2 overflow-hidden rounded-lg bg-white px-3.5 py-2.5 outline outline-1 outline-offset-[-1px] transition',
          destructive
            ? 'outline-red-300 focus-within:outline-red-400'
            : 'outline-gray-200 focus-within:outline-Smart-blue',
        )}
      >
        {leadingIcon}
        <input
          id={inputId}
          className={cn(
            'flex-1 bg-transparent text-base font-normal leading-6 text-neutral-900 outline-none placeholder:text-gray-500',
            className,
          )}
          {...props}
        />
        {trailingIcon}
      </div>
      {hint && (
        <p
          className={cn(
            'text-sm leading-5',
            destructive ? 'text-red-600' : 'text-gray-500',
          )}
        >
          {hint}
        </p>
      )}
    </div>
  )
}
