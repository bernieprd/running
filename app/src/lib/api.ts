import type { RunResponse, PatchRunBody } from './types'

const BASE = import.meta.env.VITE_API_BASE_URL ?? ''

const CF_HEADERS = {
  'CF-Access-Client-Id': 'f5b163f7c4835f982df06c168ea00ed2.access',
  'CF-Access-Client-Secret': 'f16d6d02c18f380dcdd757001035f4be3b90f39c0aed5291e615a685c3b0fbff',
}

export async function fetchRuns(): Promise<RunResponse[]> {
  const res = await fetch(`${BASE}/runs`, { headers: CF_HEADERS })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function patchRun(id: string, body: PatchRunBody): Promise<RunResponse> {
  const res = await fetch(`${BASE}/runs/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...CF_HEADERS },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}
