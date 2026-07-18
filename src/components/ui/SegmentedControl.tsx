import { cn } from '@/lib/cn'

type Option<T extends string> = {
  value: T
  label: string
}

type SegmentedControlProps<T extends string> = {
  options: Option<T>[]
  value: T
  onChange: (value: T) => void
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <div className="flex w-full items-center gap-2 rounded-lg bg-gray-50 p-1 outline outline-1 outline-offset-[-1px] outline-gray-200">
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 overflow-hidden rounded-md px-3 py-2 text-sm font-semibold leading-5 transition',
              active
                ? 'bg-white text-slate-700 shadow-[0px_1px_2px_0px_rgba(16,24,40,0.06)]'
                : 'text-gray-500 hover:text-slate-700',
            )}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
