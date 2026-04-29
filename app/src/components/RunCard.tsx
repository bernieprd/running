import { useNavigate, useLocation } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { Badge } from './ui/badge'
import { EffortBar } from './EffortBar'
import { cn, formatDate, formatPace, formatElapsedTime } from '../lib/utils'
import type { RunResponse, RunType } from '../lib/types'

type Variant = 'home' | 'schedule-upcoming' | 'schedule-past'

interface RunCardProps {
  run: RunResponse
  variant?: Variant
}

function runTypeBadgeVariant(type: RunType | null) {
  switch (type) {
    case 'Easy': return 'easy'
    case 'Tempo': return 'tempo'
    case 'Long': return 'long'
    case 'Race': return 'race'
    default: return 'secondary'
  }
}

export function RunCard({ run, variant = 'home' }: RunCardProps) {
  const navigate = useNavigate()
  const location = useLocation()

  function handleTap() {
    navigate(`/runs/${run.id}`, { state: { backgroundLocation: location } })
  }

  const effortNum = run.effortRating ? parseInt(run.effortRating) : null
  const isDone = run.completed || run.stravaActivityId !== null

  if (variant === 'schedule-upcoming') {
    return (
      <button
        type="button"
        onClick={handleTap}
        className="w-full flex items-center gap-3 px-4 py-3 bg-surface rounded-xl border border-border active:scale-[0.98] transition-transform text-left"
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{run.name}</p>
        </div>
        <Badge variant={runTypeBadgeVariant(run.type)}>{run.type}</Badge>
        {run.date && (
          <span className="font-mono-dm text-xs text-muted-foreground whitespace-nowrap">
            {formatDate(run.date)}
          </span>
        )}
        <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      </button>
    )
  }

  if (variant === 'schedule-past') {
    return (
      <button
        type="button"
        onClick={handleTap}
        className={cn(
          'w-full bg-surface rounded-xl border border-border p-4 active:scale-[0.98] transition-transform text-left',
          isDone && 'border-l-4 border-l-success'
        )}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">{run.name}</p>
            {run.date && (
              <p className="font-mono-dm text-xs text-muted-foreground mt-0.5">{formatDate(run.date)}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            <Badge variant={runTypeBadgeVariant(run.type)}>{run.type}</Badge>
            {effortNum !== null && <EffortBar value={effortNum} />}
          </div>
        </div>
        <div className="flex gap-4 mt-2">
          {run.distanceKm !== null && (
            <span className="font-mono-dm text-xs text-success">{run.distanceKm.toFixed(1)} km</span>
          )}
          {run.avgPaceMinKm !== null && (
            <span className="font-mono-dm text-xs text-muted-foreground">{formatPace(run.avgPaceMinKm)}</span>
          )}
          {run.elapsedTime !== null && (
            <span className="font-mono-dm text-xs text-muted-foreground">{formatElapsedTime(run.elapsedTime)}</span>
          )}
        </div>
      </button>
    )
  }

  // home variant
  return (
    <button
      type="button"
      onClick={handleTap}
      className={cn(
        'w-full bg-surface rounded-xl border border-border p-4 active:scale-[0.98] transition-transform text-left',
        isDone && 'border-l-4 border-l-success'
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">
            {run.name}
          </p>
          {run.date && (
            <p className="font-mono-dm text-xs text-muted-foreground mt-0.5">{formatDate(run.date)}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <Badge variant={runTypeBadgeVariant(run.type)}>{run.type}</Badge>
          {effortNum !== null && <EffortBar value={effortNum} />}
        </div>
      </div>
      {!isDone && run.guidance && (
        <p className="text-xs text-muted-foreground line-clamp-2">{run.guidance}</p>
      )}
      {isDone && (
        <div className="flex gap-4 mt-1">
          {run.distanceKm !== null && (
            <span className="font-mono-dm text-xs text-success">{run.distanceKm.toFixed(1)} km</span>
          )}
          {run.avgPaceMinKm !== null && (
            <span className="font-mono-dm text-xs text-muted-foreground">{formatPace(run.avgPaceMinKm)}</span>
          )}
          {run.elapsedTime !== null && (
            <span className="font-mono-dm text-xs text-muted-foreground">{formatElapsedTime(run.elapsedTime)}</span>
          )}
        </div>
      )}
    </button>
  )
}
