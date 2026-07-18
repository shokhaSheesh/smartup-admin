import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

type Hierarchy = 'primary' | 'secondary-gray'
type Size = 'sm' | 'md' | 'lg'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  hierarchy?: Hierarchy
  size?: Size
  fullWidth?: boolean
  leadingIcon?: ReactNode
  trailingIcon?: ReactNode
}

const sizeClasses: Record<Size, string> = {
  sm: 'px-3 py-2 text-sm',
  md: 'px-3.5 py-2.5 text-sm',
  lg: 'px-4 py-2.5 text-base',
}

const hierarchyClasses: Record<Hierarchy, string> = {
  primary:
    'bg-Smart-blue text-white outline outline-1 outline-offset-[-1px] outline-Smart-blue shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] hover:brightness-105 active:brightness-95',
  'secondary-gray':
    'bg-white text-slate-700 outline outline-1 outline-offset-[-1px] outline-gray-200 shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] hover:bg-gray-50 active:bg-gray-100',
}

export function Button({
  hierarchy = 'primary',
  size = 'lg',
  fullWidth = false,
  leadingIcon,
  trailingIcon,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 overflow-hidden rounded-lg font-semibold leading-6 transition disabled:cursor-not-allowed disabled:opacity-50',
        sizeClasses[size],
        hierarchyClasses[hierarchy],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {leadingIcon}
      {children}
      {trailingIcon}
    </button>
  )
}
