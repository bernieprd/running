import { useState, useCallback } from 'react'
import { useRuns } from '../context/RunsContext'
import { Button } from '../components/ui/button'
import { Card, CardGreen } from '../components/ui/card'
import { syncStrava } from '../lib/api'
import type { SyncResult } from '../lib/types'

export function CoachView() {
  const { state: { runs }, refetch } = useRuns()

  const completed = runs.filter(r => r.completed).length
  const remaining = runs.filter(r => !r.completed).length

  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)

  const handleSync = useCallback(async () => {
    setSyncing(true)
    setSyncResult(null)
    setSyncError(null)
    try {
      const result = await syncStrava()
      setSyncResult(result)
      if (result.synced.length > 0) refetch()
    } catch (e) {
      setSyncError((e as Error).message)
    } finally {
      setSyncing(false)
    }
  }, [refetch])

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

      <Button
        size="lg"
        variant="secondary"
        className="w-full"
        onClick={handleSync}
        disabled={syncing}
      >
        {syncing ? 'Syncing…' : 'Sync Strava'}
      </Button>

      {syncError && (
        <p className="font-mono-dm text-xs text-red-500 text-center">{syncError}</p>
      )}

      {syncResult && (
        <CardGreen>
          <p className="font-syne text-base font-extrabold mb-1">Sync complete</p>
          <p className="text-sm text-foreground">
            {syncResult.synced.length} run{syncResult.synced.length !== 1 ? 's' : ''} synced
            {syncResult.skipped > 0 ? `, ${syncResult.skipped} skipped` : ''}
            {syncResult.ambiguous > 0 ? `, ${syncResult.ambiguous} ambiguous` : ''}.
          </p>
          {syncResult.synced.length > 0 && (
            <ul className="mt-2 space-y-0.5">
              {syncResult.synced.map(s => (
                <li key={s.stravaActivityId} className="font-mono-dm text-xs text-muted-foreground">{s.runName}</li>
              ))}
            </ul>
          )}
        </CardGreen>
      )}
    </div>
  )
}
