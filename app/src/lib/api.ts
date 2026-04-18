import type { RunResponse, PatchRunBody, SyncResult, UnmatchedActivity } from './types'

const BASE = import.meta.env.VITE_API_BASE_URL ?? ''

function authHeader(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` }
}

export async function fetchRuns(token: string): Promise<RunResponse[]> {
  const res = await fetch(`${BASE}/runs`, { headers: authHeader(token) })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function patchRun(id: string, body: PatchRunBody, token: string): Promise<RunResponse> {
  const res = await fetch(`${BASE}/runs/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeader(token) },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function fetchUnmatchedActivities(token: string): Promise<UnmatchedActivity[]> {
  const res = await fetch(`${BASE}/strava/activities/unmatched`, { headers: authHeader(token) })
  if (!res.ok) {
    let message = `HTTP ${res.status}`
    try {
      const b = await res.json() as { error?: string }
      if (b.error) message = b.error
    } catch { /* ignore */ }
    throw new Error(message)
  }
  return res.json()
}

export async function linkStravaActivity(runId: string, stravaActivityId: number, token: string): Promise<RunResponse> {
  const res = await fetch(`${BASE}/runs/${runId}/link-strava`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader(token) },
    body: JSON.stringify({ stravaActivityId }),
  })
  if (!res.ok) {
    let message = `HTTP ${res.status}`
    try {
      const b = await res.json() as { error?: string }
      if (b.error) message = b.error
    } catch { /* ignore */ }
    throw new Error(message)
  }
  return res.json()
}

export async function unlinkStravaActivity(runId: string, token: string): Promise<RunResponse> {
  const res = await fetch(`${BASE}/runs/${runId}/link-strava`, {
    method: 'DELETE',
    headers: authHeader(token),
  })
  if (!res.ok) {
    let message = `HTTP ${res.status}`
    try {
      const b = await res.json() as { error?: string }
      if (b.error) message = b.error
    } catch { /* ignore */ }
    throw new Error(message)
  }
  return res.json()
}

export async function syncStrava(token: string): Promise<SyncResult> {
  const res = await fetch(`${BASE}/strava/sync`, {
    method: 'POST',
    headers: authHeader(token),
  })
  if (!res.ok) {
    let message = `HTTP ${res.status}`
    try {
      const b = await res.json() as { error?: string }
      if (b.error) message = b.error
    } catch { /* ignore */ }
    throw new Error(message)
  }
  return res.json()
}
