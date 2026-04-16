import { cn } from '../lib/utils'

interface EffortBarProps {
  value: number | null
  interactive?: boolean
  onChange?: (v: number) => void
}

export function EffortBar({ value, interactive = false, onChange }: EffortBarProps) {
  return (
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map(pip => {
        const filled = value !== null && pip <= value
        if (interactive) {
          return (
            <button
              key={pip}
              type="button"
              onClick={() => onChange?.(pip)}
              className={cn(
                'w-6 h-6 rounded-full border-2 transition-colors',
                filled ? 'bg-primary border-primary' : 'bg-transparent border-border'
              )}
              aria-label={`Effort ${pip}`}
            />
          )
        }
        return (
          <div
            key={pip}
            className={cn(
              'w-5 h-5 rounded-full border-2',
              filled ? 'bg-primary border-primary' : 'bg-transparent border-border'
            )}
          />
        )
      })}
    </div>
  )
}
