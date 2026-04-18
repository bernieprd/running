export interface Env {
  RUNNING_KV: KVNamespace
  NOTION_API_KEY: string
  NOTION_DB_ID: string
  STRAVA_CLIENT_ID: string
  STRAVA_CLIENT_SECRET: string
  ANTHROPIC_API_KEY: string
  CLERK_JWKS_URL: string
}

const CORS = {
  'Access-Control-Allow-Origin': 'https://bernieprd.github.io',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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
  effortRating?: string | null
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

interface StravaTokens {
  access_token: string
  refresh_token: string
  expires_at: number  // unix seconds
}

interface StravaActivity {
  id: number
  start_date: string      // ISO8601 UTC
  distance: number        // meters
  elapsed_time: number    // seconds
  average_speed: number   // m/s
  average_heartrate?: number
}

interface SyncedRun {
  notionPageId: string
  runName: string
  stravaActivityId: number
}

interface SyncResult {
  synced: SyncedRun[]
  skipped: number
  ambiguous: number
}

interface UnmatchedActivity {
  id: number
  date: string
  distanceKm: number
  avgPaceMinKm: number
  avgHr: number | null
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

function dateOnly(iso: string): string {
  return iso.slice(0, 10)
}

// ---- JWT Auth ----

interface JwkKey {
  kid?: string
  kty: string
  alg?: string
  use?: string
  n?: string
  e?: string
}

// Module-level cache — persists across requests within the same isolate instance
let jwksCache: { keys: JwkKey[]; fetchedAt: number } | null = null
const JWKS_TTL_MS = 5 * 60 * 1000

async function getJwks(jwksUrl: string): Promise<JwkKey[]> {
  const now = Date.now()
  if (jwksCache && now - jwksCache.fetchedAt < JWKS_TTL_MS) return jwksCache.keys
  const res = await fetch(jwksUrl)
  if (!res.ok) throw new Error(`Failed to fetch JWKS: ${res.status}`)
  const data = await res.json() as { keys: JwkKey[] }
  jwksCache = { keys: data.keys, fetchedAt: now }
  return data.keys
}

async function verifyClerkJwt(token: string, jwksUrl: string): Promise<string> {
  const parts = token.split('.')
  if (parts.length !== 3) throw new Error('Malformed JWT')

  const [headerB64, payloadB64, sigB64] = parts

  const header = JSON.parse(atob(headerB64.replace(/-/g, '+').replace(/_/g, '/'))) as { kid?: string }
  const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'))) as { sub: string; exp: number }

  if (payload.exp < Math.floor(Date.now() / 1000)) throw new Error('Token expired')

  const keys = await getJwks(jwksUrl)
  const jwk = header.kid ? keys.find(k => k.kid === header.kid) : keys[0]
  if (!jwk) throw new Error('No matching JWK found')

  const cryptoKey = await crypto.subtle.importKey(
    'jwk',
    jwk as JsonWebKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify'],
  )

  const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`)
  const sig = Uint8Array.from(atob(sigB64.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))

  const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', cryptoKey, sig, data)
  if (!valid) throw new Error('Invalid JWT signature')

  return payload.sub
}

async function requireAuth(request: Request, env: Env): Promise<{ userId: string; slug: string }> {
  const authHeader = request.headers.get('Authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!token) throw new Error('Missing authorization token')

  const userId = await verifyClerkJwt(token, env.CLERK_JWKS_URL)

  const slug = await env.RUNNING_KV.get(`users:${userId}:slug`)
  if (!slug) throw new Error('User not configured — contact admin')

  return { userId, slug }
}

// ---- Strava Tokens ----

async function getStravaTokens(env: Env, userId: string): Promise<StravaTokens> {
  const raw = await env.RUNNING_KV.get(`strava:tokens:${userId}`)
  if (!raw) throw new Error('Strava not connected — run OAuth first')
  const tokens: StravaTokens = JSON.parse(raw)

  if (tokens.expires_at - Math.floor(Date.now() / 1000) < 60) {
    const res = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: env.STRAVA_CLIENT_ID,
        client_secret: env.STRAVA_CLIENT_SECRET,
        grant_type: 'refresh_token',
        refresh_token: tokens.refresh_token,
      }),
    })
    if (!res.ok) throw new Error(`Strava token refresh failed: ${await res.text()}`)
    const refreshed = await res.json() as StravaTokens
    await env.RUNNING_KV.put(`strava:tokens:${userId}`, JSON.stringify(refreshed))
    return refreshed
  }
  return tokens
}

async function fetchStravaActivities(accessToken: string, afterUnix: number): Promise<StravaActivity[]> {
  const url = `https://www.strava.com/api/v3/athlete/activities?after=${afterUnix}&per_page=200`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error(`Strava activities fetch failed: ${await res.text()}`)
  return res.json() as Promise<StravaActivity[]>
}

// ---- Handlers ----

async function handleGetRuns(env: Env, slug: string): Promise<Response> {
  const result = await notionQueryDB(
    env.NOTION_DB_ID,
    {
      sorts: [{ property: 'Date', direction: 'ascending' }],
      filter: { property: 'User', select: { equals: slug } },
    },
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

  const VALID_EFFORT = new Set(['1 - Very Easy', '2 - Easy', '3 - Moderate', '4 - Hard', '5 - Very Hard'])
  if (body.effortRating !== undefined && body.effortRating !== null && !VALID_EFFORT.has(body.effortRating)) {
    return json({ error: 'Invalid effortRating value. Must be one of: 1 - Very Easy, 2 - Easy, 3 - Moderate, 4 - Hard, 5 - Very Hard' }, 400)
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
    properties['Effort Rating'] = body.effortRating === null
      ? { select: null }
      : { select: { name: body.effortRating } }
  }

  if (Object.keys(properties).length === 0) {
    return json({ error: 'No valid fields to update' }, 400)
  }

  const updated = await notionUpdatePage(pageId, { properties }, env.NOTION_API_KEY) as NotionPage
  return json(notionPageToRun(updated))
}

function handleStravaAuth(request: Request, env: Env): Response {
  const url = new URL(request.url)
  const userId = url.searchParams.get('userId') ?? ''
  const state = btoa(JSON.stringify({ userId }))
  const params = new URLSearchParams({
    client_id: env.STRAVA_CLIENT_ID,
    redirect_uri: `${url.origin}/strava/callback`,
    response_type: 'code',
    approval_prompt: 'auto',
    scope: 'activity:read_all',
    state,
  })
  return Response.redirect(`https://www.strava.com/oauth/authorize?${params.toString()}`, 302)
}

async function handleStravaCallback(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const error = url.searchParams.get('error')

  if (error || !code) {
    return new Response(`Strava auth denied: ${error ?? 'no code'}`, { status: 400 })
  }

  let userId = ''
  try {
    const stateRaw = url.searchParams.get('state') ?? ''
    userId = (JSON.parse(atob(stateRaw)) as { userId: string }).userId
  } catch { /* ignore — userId will be empty */ }

  const redirectUri = `${url.origin}/strava/callback`
  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: env.STRAVA_CLIENT_ID,
      client_secret: env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    }),
  })

  if (!res.ok) {
    return new Response(`Token exchange failed: ${await res.text()}`, { status: 502 })
  }

  const data = await res.json() as {
    access_token: string
    refresh_token: string
    expires_at: number
  }

  const tokens: StravaTokens = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: data.expires_at,
  }

  if (userId) {
    await env.RUNNING_KV.put(`strava:tokens:${userId}`, JSON.stringify(tokens))
  }

  return new Response(
    '<html><body><p>Strava connected. You can close this tab.</p></body></html>',
    { status: 200, headers: { 'Content-Type': 'text/html' } },
  )
}

async function handleStravaSync(env: Env, userId: string, slug: string): Promise<Response> {
  const tokens = await getStravaTokens(env, userId)

  const startDate = await env.RUNNING_KV.get(`users:${userId}:plan_start_date`)
  if (!startDate) throw new Error('Plan start date not configured — call POST /seed-plan first')

  const afterUnix = Math.floor(new Date(startDate + 'T00:00:00Z').getTime() / 1000)
  const activities = await fetchStravaActivities(tokens.access_token, afterUnix)

  const notionResult = await notionQueryDB(
    env.NOTION_DB_ID,
    {
      filter: {
        and: [
          { property: 'Strava Activity ID', rich_text: { is_empty: true } },
          { property: 'User', select: { equals: slug } },
        ],
      },
    },
    env.NOTION_API_KEY,
  ) as { results: NotionPage[] }
  const candidateRuns = notionResult.results.map(notionPageToRun)

  const result: SyncResult = { synced: [], skipped: 0, ambiguous: 0 }

  for (const activity of activities) {
    const activityDate = dateOnly(activity.start_date)
    const actDate = new Date(activityDate + 'T00:00:00Z')
    const dayBefore = dateOnly(new Date(actDate.getTime() - 86400_000).toISOString())
    const dayAfter  = dateOnly(new Date(actDate.getTime() + 86400_000).toISOString())

    const candidates = candidateRuns.filter(r => {
      if (!r.date) return false
      return r.date === activityDate || r.date === dayBefore || r.date === dayAfter
    })

    if (candidates.length === 0) {
      result.skipped++
      continue
    }

    let match: RunResponse | null = null

    if (candidates.length === 1) {
      match = candidates[0]
    } else {
      const exact = candidates.filter(r => r.date === activityDate)
      if (exact.length === 1) {
        match = exact[0]
      } else {
        result.ambiguous++
        continue
      }
    }

    const distanceKm = parseFloat((activity.distance / 1000).toFixed(2))
    const avgPaceMinKm = parseFloat((1 / (activity.average_speed * 60 / 1000)).toFixed(2))

    const properties: Record<string, unknown> = {
      'Strava Activity ID': { rich_text: [{ text: { content: String(activity.id) } }] },
      'Distance (km)':     { number: distanceKm },
      'Avg Pace (min/km)': { number: avgPaceMinKm },
    }
    if (activity.average_heartrate !== undefined) {
      properties['Avg HR'] = { number: Math.round(activity.average_heartrate) }
    }

    await notionUpdatePage(match.id, { properties }, env.NOTION_API_KEY)

    result.synced.push({
      notionPageId: match.id,
      runName: match.name,
      stravaActivityId: activity.id,
    })

    const idx = candidateRuns.findIndex(r => r.id === match!.id)
    if (idx !== -1) candidateRuns.splice(idx, 1)
  }

  return json(result)
}

async function handleGetUnmatchedActivities(env: Env, userId: string, slug: string): Promise<Response> {
  const tokens = await getStravaTokens(env, userId)

  const url = `https://www.strava.com/api/v3/athlete/activities?per_page=30`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  })
  if (!res.ok) throw new Error(`Strava activities fetch failed: ${await res.text()}`)
  const activities = await res.json() as StravaActivity[]

  const notionResult = await notionQueryDB(
    env.NOTION_DB_ID,
    {
      filter: {
        and: [
          { property: 'Strava Activity ID', rich_text: { is_not_empty: true } },
          { property: 'User', select: { equals: slug } },
        ],
      },
    },
    env.NOTION_API_KEY,
  ) as { results: NotionPage[] }

  const linkedIds = new Set(
    notionResult.results.map(p => p.properties['Strava Activity ID']?.rich_text?.[0]?.plain_text ?? '')
  )

  const unmatched: UnmatchedActivity[] = activities
    .filter(a => !linkedIds.has(String(a.id)))
    .slice(0, 10)
    .map(a => ({
      id: a.id,
      date: dateOnly(a.start_date),
      distanceKm: parseFloat((a.distance / 1000).toFixed(2)),
      avgPaceMinKm: parseFloat((1 / (a.average_speed * 60 / 1000)).toFixed(2)),
      avgHr: a.average_heartrate !== undefined ? Math.round(a.average_heartrate) : null,
    }))

  return json(unmatched)
}

async function handleLinkStrava(pageId: string, request: Request, env: Env, userId: string): Promise<Response> {
  let body: { stravaActivityId?: number }
  try {
    body = await request.json() as { stravaActivityId?: number }
  } catch {
    return json({ error: 'Invalid request body' }, 400)
  }

  if (!body.stravaActivityId) {
    return json({ error: 'Missing stravaActivityId' }, 400)
  }

  const tokens = await getStravaTokens(env, userId)

  const actRes = await fetch(`https://www.strava.com/api/v3/activities/${body.stravaActivityId}`, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  })
  if (!actRes.ok) throw new Error(`Strava activity fetch failed: ${await actRes.text()}`)
  const activity = await actRes.json() as StravaActivity

  const distanceKm = parseFloat((activity.distance / 1000).toFixed(2))
  const avgPaceMinKm = parseFloat((1 / (activity.average_speed * 60 / 1000)).toFixed(2))

  const properties: Record<string, unknown> = {
    'Strava Activity ID': { rich_text: [{ text: { content: String(activity.id) } }] },
    'Distance (km)':     { number: distanceKm },
    'Avg Pace (min/km)': { number: avgPaceMinKm },
  }
  if (activity.average_heartrate !== undefined) {
    properties['Avg HR'] = { number: Math.round(activity.average_heartrate) }
  }

  const updated = await notionUpdatePage(pageId, { properties }, env.NOTION_API_KEY) as NotionPage
  return json(notionPageToRun(updated))
}

async function handleUnlinkStrava(pageId: string, env: Env): Promise<Response> {
  const properties: Record<string, unknown> = {
    'Strava Activity ID': { rich_text: [] },
    'Distance (km)':      { number: null },
    'Avg Pace (min/km)':  { number: null },
    'Avg HR':             { number: null },
  }
  const updated = await notionUpdatePage(pageId, { properties }, env.NOTION_API_KEY) as NotionPage
  return json(notionPageToRun(updated))
}

async function handleReviewWeek(env: Env, slug: string): Promise<Response> {
  const today = new Date()
  const weekStart = new Date(today)
  weekStart.setUTCDate(today.getUTCDate() - today.getUTCDay())
  const weekStartStr = dateOnly(weekStart.toISOString())

  const result = await notionQueryDB(
    env.NOTION_DB_ID,
    {
      filter: {
        and: [
          { property: 'User', select: { equals: slug } },
          { property: 'Completed', checkbox: { equals: true } },
          { property: 'Date', date: { on_or_after: weekStartStr } },
        ],
      },
      sorts: [{ property: 'Date', direction: 'ascending' }],
    },
    env.NOTION_API_KEY,
  ) as { results: NotionPage[] }

  return json(result.results.map(notionPageToRun))
}

async function handleSeedPlan(request: Request, env: Env, userId: string): Promise<Response> {
  let body: { startDate?: string }
  try {
    body = await request.json() as { startDate?: string }
  } catch {
    return json({ error: 'Invalid request body' }, 400)
  }

  if (!body.startDate) return json({ error: 'startDate required' }, 400)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(body.startDate)) {
    return json({ error: 'startDate must be YYYY-MM-DD' }, 400)
  }

  await env.RUNNING_KV.put(`users:${userId}:plan_start_date`, body.startDate)
  return json({ ok: true, startDate: body.startDate })
}

// ---- Router ----

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS })
    }

    const url = new URL(request.url)
    const { pathname } = url
    const method = request.method

    // Auth-exempt routes (browser redirect flows)
    if (method === 'GET' && pathname === '/strava/auth') {
      return handleStravaAuth(request, env)
    }
    if (method === 'GET' && pathname === '/strava/callback') {
      try {
        return await handleStravaCallback(request, env)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        return new Response(`Error: ${message}`, { status: 502 })
      }
    }

    let auth: { userId: string; slug: string }
    try {
      auth = await requireAuth(request, env)
    } catch (err) {
      return json({ error: err instanceof Error ? err.message : 'Unauthorized' }, 401)
    }

    try {
      if (method === 'GET' && pathname === '/runs') {
        return await handleGetRuns(env, auth.slug)
      }

      if (method === 'PATCH' && pathname.startsWith('/runs/')) {
        const pageId = pathname.split('/')[2]
        if (!pageId) return json({ error: 'Missing run ID' }, 400)
        return await handlePatchRun(pageId, request, env)
      }

      if (method === 'POST' && pathname === '/strava/sync') {
        return await handleStravaSync(env, auth.userId, auth.slug)
      }

      if (method === 'GET' && pathname === '/strava/activities/unmatched') {
        return await handleGetUnmatchedActivities(env, auth.userId, auth.slug)
      }

      if (method === 'POST' && pathname.startsWith('/runs/') && pathname.endsWith('/link-strava')) {
        const pageId = pathname.split('/')[2]
        if (!pageId) return json({ error: 'Missing run ID' }, 400)
        return await handleLinkStrava(pageId, request, env, auth.userId)
      }

      if (method === 'DELETE' && pathname.startsWith('/runs/') && pathname.endsWith('/link-strava')) {
        const pageId = pathname.split('/')[2]
        if (!pageId) return json({ error: 'Missing run ID' }, 400)
        return await handleUnlinkStrava(pageId, env)
      }

      if (method === 'GET' && pathname === '/review-week') {
        return await handleReviewWeek(env, auth.slug)
      }

      if (method === 'POST' && pathname === '/seed-plan') {
        return await handleSeedPlan(request, env, auth.userId)
      }

      return json({ error: 'Not found' }, 404)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      return json({ error: message }, 502)
    }
  },
}
