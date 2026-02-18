import type { ComponentProps } from 'react'

import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export function GlassCard({ className, ...props }: ComponentProps<typeof Card>) {
  return (
    <Card
      className={cn('glass-panel rounded-3xl shadow-[0_18px_60px_-28px_rgba(0,0,0,0.55)]', className)}
      {...props}
    />
  )
}

export function GlassCardStrong({ className, ...props }: ComponentProps<typeof Card>) {
  return (
    <Card
      className={cn('glass-panel-strong rounded-3xl shadow-[0_22px_70px_-30px_rgba(0,0,0,0.65)]', className)}
      {...props}
    />
  )
}
