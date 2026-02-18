import { DEFAULT_BROWSER_USER_AGENT } from '../../net/constants'
import { resolveFetch } from '../../net/fetch'
import { toNum } from '../../opgg/helpers'

export const BLITZ_DATALAKE_URL = 'https://datalake.v2.iesdev.com/graphql'
export const ARAM_MAYHEM_QUEUE = 'HOWLING_ABYSS_ARAM'

export const ARAM_MAYHEM_CHAMPION_QUERY = `
  query aramMayhemChampionStats($champion_id: String!) {
    executeDatabricksQuery(
      game: LEAGUE
      queryName: "prod_aram_mayhem_champion"
      params: [{ name: "champion_id", value: $champion_id }]
    ) {
      payload
    }
  }
`

export const CHAMPION_BUILDS_QUERY = `
  query ChampionBuildsTagged(
    $championId: String!
    $matchupChampionId: String
    $queue: String!
    $role: String
    $tier: String
  ) {
    executeDatabricksQuery(
      game: LEAGUE
      queryName: "prod_champion_builds_tags"
      params: [
        { name: "individual_position", value: $role }
        { name: "queue_id", value: $queue }
        { name: "champion_id", value: $championId }
        { name: "build_tier", value: $tier }
        { name: "match_up_champion_id", value: $matchupChampionId }
      ]
    ) {
      payload
    }
  }
`

type DatabricksColumn = {
  name?: string
  position?: number
  typeName?: string
}

type DatabricksPayload = {
  manifest?: {
    schema?: {
      columns?: DatabricksColumn[]
    }
  }
  result?: {
    dataArray?: unknown[][]
  }
}

type DatabricksResponse = {
  data?: {
    executeDatabricksQuery?: {
      payload?: DatabricksPayload
    }
  }
}

function recursiveJsonParse(value: unknown): unknown {
  if (value == null) return value

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (parsed && typeof parsed === 'object') return recursiveJsonParse(parsed)
      return parsed
    } catch {
      return value
    }
  }

  if (Array.isArray(value)) return value.map((item) => recursiveJsonParse(item))

  if (typeof value === 'object') {
    const next: Record<string, unknown> = {}
    for (const [key, item] of Object.entries(value)) next[key] = recursiveJsonParse(item)
    return next
  }

  return value
}

function castDatabricksValue(typeName: string | undefined, value: unknown): unknown {
  if (value == null) return value
  switch (typeName) {
    case 'BOOLEAN':
      return value === true || value === 'true'
    case 'DOUBLE':
    case 'BIGINT':
    case 'LONG':
    case 'INT':
      return toNum(value) ?? 0
    case 'MAP':
    case 'ARRAY':
    case 'STRUCT':
      return recursiveJsonParse(value)
    case 'STRING':
    default:
      return typeof value === 'string' ? value : String(value)
  }
}

function decodeDatabricksRows(payload: DatabricksPayload | undefined): Record<string, unknown>[] {
  const columns = payload?.manifest?.schema?.columns ?? []
  const rows = payload?.result?.dataArray ?? []

  return rows.map((row) => {
    const out: Record<string, unknown> = {}
    for (const column of columns) {
      const name = column.name
      const position = column.position
      if (typeof name !== 'string' || typeof position !== 'number') continue
      out[name] = castDatabricksValue(column.typeName, row[position])
    }
    return out
  })
}

export async function fetchDatabricksRows(params: {
  query: string
  variables: Record<string, unknown>
  timeoutMs?: number
}): Promise<Record<string, unknown>[]> {
  const timeoutMs = params.timeoutMs ?? 20_000
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const fetchImpl = await resolveFetch()
    const response = await fetchImpl(BLITZ_DATALAKE_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
        'user-agent': DEFAULT_BROWSER_USER_AGENT,
      },
      body: JSON.stringify({
        query: params.query,
        variables: params.variables,
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      throw new Error(`Blitz datalake HTTP ${response.status}${text ? `: ${text.slice(0, 180)}` : ''}`)
    }

    const body = (await response.json()) as DatabricksResponse
    const payload = body?.data?.executeDatabricksQuery?.payload
    if (!payload) throw new Error('Blitz datalake returned empty executeDatabricksQuery payload.')

    return decodeDatabricksRows(payload)
  } finally {
    clearTimeout(timeout)
  }
}
