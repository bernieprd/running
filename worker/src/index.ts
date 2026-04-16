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

export default {
  async fetch(request: Request, _env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS })
    }

    const url = new URL(request.url)

    return new Response(
      JSON.stringify({ ok: true, path: url.pathname }),
      { headers: { 'Content-Type': 'application/json', ...CORS } },
    )
  },
}
