import { useRuns } from '../context/RunsContext'
import { RunCard } from '../components/RunCard'
import { Progress } from '../components/ui/progress'

const TOTAL_WEEKS = 9

// Returns the Sunday that starts the calendar week containing `date`
function getWeekSunday(date: Date): Date {
  const d = new Date(date)
  d.setDate(d.getDate() - d.getDay())
  d.setHours(0, 0, 0, 0)
  return d
}

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

  // Determine current week from today's date. Weeks run Sunday–Saturday, so
  // a new week begins each Sunday regardless of whether prior runs were completed.
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Find the earliest scheduled date per training week
  const weekFirstDates = new Map<number, Date>()
  for (const run of sorted) {
    if (run.week != null && run.date) {
      const d = new Date(run.date + 'T00:00:00')
      const existing = weekFirstDates.get(run.week)
      if (!existing || d < existing) weekFirstDates.set(run.week, d)
    }
  }

  const weekNumbers = [...weekFirstDates.keys()].sort((a, b) => a - b)
  let currentWeek = weekNumbers[weekNumbers.length - 1] ?? 1

  if (weekNumbers.length > 0) {
    const firstWeekSunday = getWeekSunday(weekFirstDates.get(weekNumbers[0])!)
    if (today < firstWeekSunday) {
      // Plan hasn't started yet
      currentWeek = weekNumbers[0]
    } else {
      for (let i = 0; i < weekNumbers.length; i++) {
        const weekNum = weekNumbers[i]
        const weekStart = getWeekSunday(weekFirstDates.get(weekNum)!)
        const nextWeekNum = weekNumbers[i + 1]
        const nextWeekStart = nextWeekNum !== undefined
          ? getWeekSunday(weekFirstDates.get(nextWeekNum)!)
          : null

        if (today >= weekStart && (nextWeekStart === null || today < nextWeekStart)) {
          currentWeek = weekNum
          break
        }
      }
    }
  }

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
