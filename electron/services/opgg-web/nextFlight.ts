type ExtractedChunk = {
  raw: string
}

// OP.GG uses Next.js app-router streaming payloads in HTML:
//   self.__next_f.push([1,"..."])
// We extract the string argument and decode JS string escapes.
export function extractNextFlightChunksFromHtml(html: string): ExtractedChunk[] {
  const chunks: ExtractedChunk[] = []
  const needle = 'self.__next_f.push(['
  let p = 0

  while (true) {
    const start = html.indexOf(needle, p)
    if (start < 0) break
    const quoteStart = findFlightQuoteStart(html, start + needle.length)
    if (quoteStart < 0) {
      p = start + needle.length
      continue
    }
    const { value, end } = decodeJsStringAt(html, quoteStart)
    chunks.push({ raw: value })
    p = end
  }

  return chunks
}

function findFlightQuoteStart(source: string, from: number): number {
  // Expect pattern: [<number>,"..."].
  // Keep parser resilient to slot id variations (0/1/2/...) between deployments.
  let i = from
  while (i < source.length && source[i] >= '0' && source[i] <= '9') i++
  if (source[i] !== ',') return -1
  i++
  if (source[i] !== '"') return -1
  return i + 1
}

function decodeJsStringAt(source: string, pos: number): { value: string; end: number } {
  // `pos` points to the first character after the opening quote.
  let i = pos
  let out = ''
  while (i < source.length) {
    const ch = source[i++]
    if (ch === '"') return { value: out, end: i }
    if (ch !== '\\') {
      out += ch
      continue
    }

    const esc = source[i++]
    if (esc === 'n') out += '\n'
    else if (esc === 'r') out += '\r'
    else if (esc === 't') out += '\t'
    else if (esc === 'b') out += '\b'
    else if (esc === 'f') out += '\f'
    else if (esc === '"') out += '"'
    else if (esc === '\\') out += '\\'
    else if (esc === 'u') {
      const hex = source.slice(i, i + 4)
      i += 4
      const code = Number.parseInt(hex, 16)
      out += Number.isFinite(code) ? String.fromCharCode(code) : ''
    } else {
      // Unknown escape: keep the escaped char (best-effort).
      out += esc
    }
  }
  throw new Error('Unterminated JS string literal in next_f payload')
}

export function extractFirstJsonObjectFromChunk(chunk: string, marker: string): unknown | null {
  const at = chunk.indexOf(marker)
  if (at < 0) return null

  // In OP.GG flight chunks the marker typically begins at `{`.
  const start = chunk.lastIndexOf('{', at)
  if (start < 0) return null

  const json = sliceBalancedJsonObject(chunk, start)
  if (!json) return null
  return JSON.parse(json)
}

export function extractAllJsonObjectsFromChunk(chunk: string, marker: string): unknown[] {
  const out: unknown[] = []
  let p = 0
  while (true) {
    const at = chunk.indexOf(marker, p)
    if (at < 0) break
    const start = chunk.lastIndexOf('{', at)
    if (start < 0) break

    const json = sliceBalancedJsonObject(chunk, start)
    if (!json) break
    out.push(JSON.parse(json))
    p = start + json.length
  }
  return out
}

function sliceBalancedJsonObject(s: string, start: number): string | null {
  if (s[start] !== '{') return null
  let depth = 0
  for (let i = start; i < s.length; i++) {
    const ch = s[i]
    if (ch === '"') {
      // Skip string literal.
      i++
      for (; i < s.length; i++) {
        const c = s[i]
        if (c === '\\') {
          i++ // skip escaped char
          continue
        }
        if (c === '"') break
      }
      continue
    }
    if (ch === '{') depth++
    if (ch === '}') {
      depth--
      if (depth === 0) return s.slice(start, i + 1)
    }
  }
  return null
}
