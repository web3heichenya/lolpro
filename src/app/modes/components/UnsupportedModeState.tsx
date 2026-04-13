import { AlertTriangle } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'

type Props = {
  modeId: string
  message: string
}

export function UnsupportedModeState({ modeId, message }: Props) {
  return (
    <Card className="detail-surface overflow-hidden rounded-3xl">
      <CardContent className="p-4 pt-4">
        <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
          <div className="grid size-14 place-items-center rounded-3xl border border-border/50 bg-background/40">
            <AlertTriangle className="size-5 text-muted-foreground" />
          </div>
          <div className="max-w-md space-y-1 text-sm text-muted-foreground">
            <div>{message}</div>
            <div className="font-mono text-xs">mode: {modeId}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
