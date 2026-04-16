import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useRuns } from '../context/RunsContext'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { CardOrange } from './ui/card'
import { Textarea } from './ui/textarea'
import { EffortBar } from './EffortBar'
import { cn, formatDate, formatPace } from '../lib/utils'
import { EFFORT_LABELS } from '../lib/types'
import type { RunType } from '../lib/types'

function runTypeBadgeVariant(type: RunType | null) {
  switch (type) {
    case 'Easy': return 'easy' as const
    case 'Tempo': return 'tempo' as const
    case 'Long': return 'long' as const
    case 'Race': return 'race' as const
    default: return 'secondary' as const
  }
}

export function DetailOverlay() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { state: { runs }, updateRun } = useRuns()
  const run = runs.find(r => r.id === id)

  const [visible, setVisible] = useState(false)
  const [notes, setNotes] = useState(run?.notes ?? '')
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync notes when run changes (e.g. after optimistic update)
  useEffect(() => {
    if (run) setNotes(run.notes)
  }, [run?.notes])

  // Animate in on mount
  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  function handleClose() {
    setVisible(false)
    closeTimer.current = setTimeout(() => navigate(-1), 260)
  }

  useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current)
    }
  }, [])

  if (!run) {
    return (
      <div className="absolute inset-0 bottom-0 z-50 bg-background flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Run not found</p>
      </div>
    )
  }

  const effortNum = run.effortRating ? parseInt(run.effortRating) : null
  const stravaSynced = run.stravaActivityId !== null

  function handleEffortChange(v: number) {
    updateRun(run!.id, { effortRating: EFFORT_LABELS[v - 1] })
  }

  function handleNotesBlur() {
    if (notes !== run!.notes) {
      updateRun(run!.id, { notes })
    }
  }

  function handleMarkComplete() {
    if (!run!.completed) {
      updateRun(run!.id, { completed: true, completedAt: new Date().toISOString() })
    }
  }

  return (
    <div
      style={{ willChange: 'transform' }}
      className={cn(
        'absolute inset-x-0 top-0 bottom-0 z-50 bg-background flex flex-col',
        'transition-[transform,opacity] duration-[260ms] ease-[cubic-bezier(0.4,0,0.2,1)]',
        visible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-5 pb-3 flex-shrink-0">
        <button
          type="button"
          onClick={handleClose}
          className="flex items-center justify-center w-8 h-8 rounded-full bg-surface-high text-foreground"
          aria-label="Go back"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span className="font-mono-dm text-xs text-muted-foreground truncate">{run.name}</span>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-5">
        {/* Badges */}
        <div className="flex flex-wrap gap-2">
          <Badge variant={runTypeBadgeVariant(run.type)}>{run.type}</Badge>
          {run.date && <Badge variant="secondary">{formatDate(run.date)}</Badge>}
          {run.estimatedDuration && (
            <Badge variant="outline">{run.estimatedDuration}</Badge>
          )}
        </div>

        {/* Title */}
        <h1 className="font-syne text-3xl font-extrabold leading-tight">{run.name}</h1>

        {/* Guidance */}
        {run.guidance && (
          <CardOrange>
            <p className="font-mono-dm text-[10px] text-primary/60 uppercase tracking-wider mb-2">Coach guidance</p>
            <p className="text-sm text-foreground">{run.guidance}</p>
          </CardOrange>
        )}

        {stravaSynced ? (
          /* Strava stats */
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Distance', value: run.distanceKm !== null ? `${run.distanceKm.toFixed(1)} km` : '—' },
              { label: 'Avg Pace', value: run.avgPaceMinKm !== null ? formatPace(run.avgPaceMinKm) : '—' },
              { label: 'Avg HR', value: run.avgHr !== null ? `${run.avgHr} bpm` : '—' },
            ].map(stat => (
              <div key={stat.label} className="bg-surface rounded-xl border border-border p-3 text-center">
                <p className="font-syne text-xl font-extrabold">{stat.value}</p>
                <p className="font-mono-dm text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        ) : (
          /* Effort + notes + complete */
          <div className="space-y-4">
            <div>
              <p className="font-mono-dm text-xs text-muted-foreground uppercase tracking-wider mb-2">Effort</p>
              <EffortBar value={effortNum} interactive onChange={handleEffortChange} />
            </div>

            <div>
              <p className="font-mono-dm text-xs text-muted-foreground uppercase tracking-wider mb-2">Notes</p>
              <Textarea
                placeholder="How did it feel?"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                onBlur={handleNotesBlur}
              />
            </div>

            <Button
              size="lg"
              variant={run.completed ? 'success' : 'default'}
              className="w-full"
              onClick={handleMarkComplete}
              disabled={run.completed}
            >
              {run.completed ? 'Completed ✓' : 'Mark Complete'}
            </Button>
          </div>
        )}

        {/* Coach notes */}
        {run.coachNotes && (
          <div className="bg-surface rounded-xl border border-border p-4">
            <p className="font-mono-dm text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Coach notes</p>
            <p className="text-sm text-foreground">{run.coachNotes}</p>
          </div>
        )}

        {/* Link Strava */}
        {!stravaSynced && (
          <button
            type="button"
            className="w-full rounded-xl border border-dashed border-border py-3 font-mono-dm text-xs text-muted-foreground"
          >
            Link Strava activity
          </button>
        )}
      </div>
    </div>
  )
}
