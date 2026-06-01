export type RunType = 'Easy' | 'Tempo' | 'Long' | 'Race'

export type RunStatus = 'Upcoming' | 'Complete' | 'Skipped'

export type EffortRating =
  | '1 - Very Easy'
  | '2 - Easy'
  | '3 - Moderate'
  | '4 - Hard'
  | '5 - Very Hard'

export const EFFORT_LABELS: EffortRating[] = [
  '1 - Very Easy',
  '2 - Easy',
  '3 - Moderate',
  '4 - Hard',
  '5 - Very Hard',
]

export interface RunResponse {
  id: string
  name: string
  week: number | null
  date: string | null
  type: RunType | null
  distanceKm: number | null
  estimatedDuration: string
  guidance: string
  status: RunStatus
  updatedAt: string | null
  effortRating: EffortRating | null
  notes: string
  coachNotes: string
  stravaActivityId: string | null
  avgPaceMinKm: number | null
  avgHr: number | null
  elapsedTime: number | null
}

export interface PatchRunBody {
  status?: RunStatus
  updatedAt?: string | null
  notes?: string
  effortRating?: string | null
}

export interface SyncedRun {
  notionPageId: string
  runName: string
  stravaActivityId: number
}

export interface SyncResult {
  synced: SyncedRun[]
  skipped: number
  ambiguous: number
}

export interface UnmatchedActivity {
  id: number
  date: string
  distanceKm: number
  avgPaceMinKm: number
  avgHr: number | null
}
