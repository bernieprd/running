import { useRuns } from '../context/RunsContext'
import { RunCard } from '../components/RunCard'
import { Progress } from '../components/ui/progress'

const TOTAL_WEEKS = 9

export function HomeView() {
  const { state: { runs, loading, error }, refetch } = useRuns()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 px-6">
        <p className="text-sm text-muted-foreground text-center">Could not load runs</p>
        <button type="button" onClick={refetch} className="font-mono-dm text-xs text-primary underline">
          Retry
        </button>
      </div>
    )
  }

  const sorted = [...runs].sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))
  const firstIncomplete = sorted.find(r => !r.completed)
  const currentWeek = firstIncomplete?.week ?? (sorted[sorted.length - 1]?.week ?? 1)
  const weekRuns = sorted.filter(r => r.week === currentWeek)
  const completedCount = weekRuns.filter(r => r.completed).length
  const pct = weekRuns.length > 0 ? Math.round((completedCount / weekRuns.length) * 100) : 0

  return (
    <div className="px-4 pt-6 pb-4 space-y-5">
      <div>
        <div className="flex items-baseline justify-between mb-2">
          <h1 className="font-syne text-xl font-extrabold">Week {currentWeek} of {TOTAL_WEEKS}</h1>
          <span className="font-mono-dm text-xs text-muted-foreground">{completedCount} of {weekRuns.length} · {pct}%</span>
        </div>
        <Progress value={pct} />
      </div>

      <div className="space-y-3">
        {weekRuns.map(run => (
          <RunCard key={run.id} run={run} variant="home" />
        ))}
        {weekRuns.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No runs this week</p>
        )}
      </div>
    </div>
  )
}
