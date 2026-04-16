import { useState } from 'react'
import { useRuns } from '../context/RunsContext'
import { RunCard } from '../components/RunCard'
import { Card } from '../components/ui/card'
import { cn, formatPace } from '../lib/utils'

type Segment = 'upcoming' | 'past'

export function ScheduleView() {
  const [segment, setSegment] = useState<Segment>('upcoming')
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
  const upcoming = sorted.filter(r => !r.completed)
  const past = sorted.filter(r => r.completed)

  const groupedUpcoming = upcoming.reduce((acc, run) => {
    const week = run.week ?? 0
    if (!acc.has(week)) acc.set(week, [])
    acc.get(week)!.push(run)
    return acc
  }, new Map<number, typeof runs>())

  const totalKm = past.reduce((sum, r) => sum + (r.distanceKm ?? 0), 0)
  const paces = past.map(r => r.avgPaceMinKm).filter((p): p is number => p !== null)
  const bestPace = paces.length > 0 ? Math.min(...paces) : null

  return (
    <div className="px-4 pt-6 pb-4 space-y-4">
      <h1 className="font-syne text-xl font-extrabold">Schedule</h1>

      {/* Segmented control */}
      <div className="flex bg-surface-high rounded-full p-1 gap-1">
        {(['upcoming', 'past'] as Segment[]).map(s => (
          <button
            key={s}
            type="button"
            onClick={() => setSegment(s)}
            className={cn(
              'flex-1 rounded-full py-1.5 font-mono-dm text-sm transition-colors capitalize',
              segment === s
                ? 'bg-surface text-foreground shadow-sm'
                : 'text-muted-foreground'
            )}
          >
            {s}
          </button>
        ))}
      </div>

      {segment === 'upcoming' && (
        <div className="space-y-5">
          {Array.from(groupedUpcoming.entries())
            .sort(([a], [b]) => a - b)
            .map(([week, weekRuns]) => (
              <div key={week} className="space-y-2">
                <p className="font-mono-dm text-xs text-muted-foreground uppercase tracking-wider">
                  Week {week}
                </p>
                {weekRuns.map(run => (
                  <RunCard key={run.id} run={run} variant="schedule-upcoming" />
                ))}
              </div>
            ))}
          {upcoming.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">All runs completed 🎉</p>
          )}
        </div>
      )}

      {segment === 'past' && (
        <div className="space-y-4">
          {past.length > 0 && (
            <Card>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="font-syne text-xl font-extrabold">{totalKm.toFixed(1)}</p>
                  <p className="font-mono-dm text-[10px] text-muted-foreground uppercase tracking-wider">Total km</p>
                </div>
                <div>
                  <p className="font-syne text-xl font-extrabold">
                    {bestPace !== null ? formatPace(bestPace) : '—'}
                  </p>
                  <p className="font-mono-dm text-[10px] text-muted-foreground uppercase tracking-wider">Best pace</p>
                </div>
                <div>
                  <p className="font-syne text-xl font-extrabold">{past.length}</p>
                  <p className="font-mono-dm text-[10px] text-muted-foreground uppercase tracking-wider">Runs done</p>
                </div>
              </div>
            </Card>
          )}
          <div className="space-y-3">
            {past.map(run => (
              <RunCard key={run.id} run={run} variant="schedule-past" />
            ))}
          </div>
          {past.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No completed runs yet</p>
          )}
        </div>
      )}
    </div>
  )
}
