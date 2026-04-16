import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium font-mono-dm transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground',
        secondary: 'bg-surface-high text-foreground',
        outline: 'border border-border text-foreground',
        easy: 'bg-success/15 text-success border border-success/20',
        tempo: 'bg-info/15 text-info border border-info/20',
        long: 'bg-primary/15 text-primary border border-primary/20',
        race: 'bg-destructive/15 text-destructive border border-destructive/20',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}
