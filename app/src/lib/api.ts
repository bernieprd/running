import type { RunResponse, PatchRunBody } from './types'

const BASE = import.meta.env.VITE_API_BASE_URL ?? ''

export async function fetchRuns(): Promise<RunResponse[]> {
  const res = await fetch(`${BASE}/runs`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function patchRun(id: string, body: PatchRunBody): Promise<RunResponse> {
  const res = await fetch(`${BASE}/runs/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}
