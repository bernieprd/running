import { useRuns } from '../context/RunsContext'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'

export function CoachView() {
  const { state: { runs } } = useRuns()

  const completed = runs.filter(r => r.completed).length
  const remaining = runs.filter(r => !r.completed).length

  return (
    <div className="px-4 pt-6 pb-4 space-y-4">
      <h1 className="font-syne text-xl font-extrabold">Coach</h1>

      <Card>
        <p className="font-syne text-base font-extrabold mb-1">Your AI Coach</p>
        <p className="text-sm text-muted-foreground">
          After completing your week's runs, ask Claude to review your performance and adapt your upcoming sessions.
        </p>
      </Card>

      <div className="flex gap-2">
        <div className="flex items-center gap-1.5 rounded-full bg-success/15 border border-success/20 px-3 py-1.5">
          <span className="font-mono-dm text-xs text-success">{completed} completed</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-surface-high border border-border px-3 py-1.5">
          <span className="font-mono-dm text-xs text-muted-foreground">{remaining} remaining</span>
        </div>
      </div>

      <Button
        size="lg"
        className="w-full"
        onClick={() => window.open('https://claude.ai', '_blank', 'noopener,noreferrer')}
      >
        Review my week
      </Button>
    </div>
  )
}
