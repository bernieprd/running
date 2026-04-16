export interface Env {
  RUNNING_KV: KVNamespace
  NOTION_API_KEY: string
  NOTION_DB_ID: string
  STRAVA_CLIENT_ID: string
  STRAVA_CLIENT_SECRET: string
  STRAVA_PLAN_START_DATE: string
  ANTHROPIC_API_KEY: string
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

// ---- Types ----

type RunType = 'Easy' | 'Tempo' | 'Long' | 'Race'

interface RunResponse {
  id: string
  name: string
  week: number | null
  date: string | null
  type: RunType | null
  distanceKm: number | null
  estimatedDuration: string
  guidance: string
  completed: boolean
  completedAt: string | null
  effortRating: string | null
  notes: string
  coachNotes: string
  stravaActivityId: string | null
  avgPaceMinKm: number | null
  avgHr: number | null
  elapsedTime: number | null
}

interface PatchRunBody {
  completed?: boolean
  completedAt?: string | null
  notes?: string
  effortRating?: string
}

interface NotionProperty {
  type: string
  title?: Array<{ plain_text: string }>
  rich_text?: Array<{ plain_text: string }>
  select?: { name: string } | null
  checkbox?: boolean
  date?: { start: string } | null
  number?: number | null
}

interface NotionPage {
  id: string
  properties: Record<string, NotionProperty>
}

// ---- Helpers ----

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  })
}

async function notionRequest(
  path: string,
  method: string,
  body: unknown,
  apiKey: string,
): Promise<unknown> {
  const res = await fetch(`https://api.notion.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28',
    },
    body: body != null ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Notion ${res.status}: ${text}`)
  }
  return res.json()
}

function notionQueryDB(dbId: string, body: unknown, apiKey: string): Promise<unknown> {
  return notionRequest(`/databases/${dbId}/query`, 'POST', body, apiKey)
}

function notionUpdatePage(pageId: string, body: unknown, apiKey: string): Promise<unknown> {
  return notionRequest(`/pages/${pageId}`, 'PATCH', body, apiKey)
}

function notionPageToRun(page: NotionPage): RunResponse {
  const p = page.properties
  const stravaRaw = p['Strava Activity ID']?.rich_text?.[0]?.plain_text ?? ''
  return {
    id: page.id,
    name: p['Run Name']?.title?.[0]?.plain_text ?? '',
    week: p['Week']?.number ?? null,
    date: p['Date']?.date?.start ?? null,
    type: (p['Run Type']?.select?.name as RunType) ?? null,
    distanceKm: p['Distance (km)']?.number ?? null,
    estimatedDuration: p['Estimated duration']?.rich_text?.[0]?.plain_text ?? '',
    guidance: p['Guidance']?.rich_text?.[0]?.plain_text ?? '',
    completed: p['Completed']?.checkbox ?? false,
    completedAt: p['Completed At']?.date?.start ?? null,
    effortRating: p['Effort Rating']?.select?.name ?? null,
    notes: p['Notes']?.rich_text?.[0]?.plain_text ?? '',
    coachNotes: p['Coach Notes']?.rich_text?.[0]?.plain_text ?? '',
    stravaActivityId: stravaRaw !== '' ? stravaRaw : null,
    avgPaceMinKm: p['Avg Pace (min/km)']?.number ?? null,
    avgHr: p['Avg HR']?.number ?? null,
    elapsedTime: p['Elapsed Time']?.number ?? null,
  }
}

// ---- Handlers ----

async function handleGetRuns(env: Env): Promise<Response> {
  const result = await notionQueryDB(
    env.NOTION_DB_ID,
    { sorts: [{ property: 'Date', direction: 'ascending' }] },
    env.NOTION_API_KEY,
  ) as { results: NotionPage[] }
  return json(result.results.map(notionPageToRun))
}

async function handlePatchRun(pageId: string, request: Request, env: Env): Promise<Response> {
  let body: PatchRunBody
  try {
    body = await request.json() as PatchRunBody
  } catch {
    return json({ error: 'Invalid request body' }, 400)
  }

  const VALID_EFFORT = new Set(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'])
  if (body.effortRating !== undefined && !VALID_EFFORT.has(body.effortRating)) {
    return json({ error: 'Invalid effortRating value' }, 400)
  }

  const properties: Record<string, unknown> = {}

  if (body.completed !== undefined) {
    properties['Completed'] = { checkbox: body.completed }
  }
  if (body.completedAt !== undefined) {
    properties['Completed At'] = { date: body.completedAt ? { start: body.completedAt } : null }
  }
  if (body.notes !== undefined) {
    properties['Notes'] = { rich_text: [{ text: { content: body.notes } }] }
  }
  if (body.effortRating !== undefined) {
    properties['Effort Rating'] = { select: { name: body.effortRating } }
  }

  if (Object.keys(properties).length === 0) {
    return json({ error: 'No valid fields to update' }, 400)
  }

  const updated = await notionUpdatePage(pageId, { properties }, env.NOTION_API_KEY) as NotionPage
  return json(notionPageToRun(updated))
}

// ---- Router ----

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS })
    }

    const url = new URL(request.url)
    const { pathname } = url
    const method = request.method

    try {
      if (method === 'GET' && pathname === '/runs') {
        return await handleGetRuns(env)
      }

      if (method === 'PATCH' && pathname.startsWith('/runs/')) {
        const pageId = pathname.split('/')[2]
        if (!pageId) {
          return json({ error: 'Missing run ID' }, 400)
        }
        return await handlePatchRun(pageId, request, env)
      }

      return json({ error: 'Not found' }, 404)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      return json({ error: message }, 502)
    }
  },
}
