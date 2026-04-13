import https from 'node:https'

export async function requestLcuJson(params: {
  port: number
  password: string
  endpoint: string
}): Promise<unknown> {
  const basic = Buffer.from(`riot:${params.password}`).toString('base64')
  return await new Promise((resolve, reject) => {
    const req = https.request(
      {
        protocol: 'https:',
        hostname: '127.0.0.1',
        port: params.port,
        path: params.endpoint,
        method: 'GET',
        headers: {
          Authorization: `Basic ${basic}`,
          Accept: 'application/json',
        },
        rejectUnauthorized: false,
      },
      (res) => {
        const chunks: Buffer[] = []
        res.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)))
        res.on('end', () => {
          const statusCode = res.statusCode ?? 0
          if (statusCode < 200 || statusCode >= 300) {
            reject(new Error(`LCU HTTP ${statusCode} for ${params.endpoint}`))
            return
          }
          try {
            const raw = Buffer.concat(chunks).toString('utf8')
            resolve(JSON.parse(raw))
          } catch (error) {
            reject(error)
          }
        })
      },
    )

    req.setTimeout(1500, () => req.destroy(new Error('timeout')))
    req.on('error', reject)
    req.end()
  })
}
