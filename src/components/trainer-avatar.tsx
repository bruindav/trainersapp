import type { Trainer } from '@/data/fixtures'
import { cn } from '@/lib/utils'

const SIZES = {
  xs: 'size-5 text-[9px]',
  sm: 'size-8 text-xs',
  md: 'size-10 text-sm',
  lg: 'size-14 text-base',
} as const

export function TrainerAvatar({
  trainer,
  size = 'md',
  className,
}: {
  trainer: Trainer
  size?: keyof typeof SIZES
  className?: string
}) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white ring-2 ring-white',
        SIZES[size],
        className,
      )}
      style={{ backgroundColor: trainer.kleur }}
    >
      {trainer.initialen}
    </span>
  )
}

export function TrainerChip({ trainer, className }: { trainer: Trainer; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2 text-sm font-semibold', className)}>
      <TrainerAvatar trainer={trainer} size="xs" />
      {trainer.naam}
    </span>
  )
}
