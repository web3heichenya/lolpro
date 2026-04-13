import { EventEmitter } from 'node:events'
import WebSocket from 'ws'

export type LcuWsAuth = {
  port: number
  password: string
}

export type LcuEventPayload = {
  uri: string
  data: unknown
  eventType?: string
}

export class LcuWsClient extends EventEmitter {
  private ws: WebSocket | null = null
  private auth: LcuWsAuth

  constructor(auth: LcuWsAuth) {
    super()
    this.auth = auth
  }

  get isConnected() {
    return this.ws?.readyState === WebSocket.OPEN
  }

  async connect(subscriptions: string[]) {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return
    }

    const url = `wss://riot:${this.auth.password}@127.0.0.1:${this.auth.port}`
    const authHeader = `Basic ${Buffer.from(`riot:${this.auth.password}`, 'utf8').toString('base64')}`

    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(url, {
        rejectUnauthorized: false,
        headers: {
          Authorization: authHeader,
        },
      })
      this.ws = ws

      const cleanup = () => {
        ws.removeAllListeners('open')
        ws.removeAllListeners('error')
      }

      ws.on('open', () => {
        cleanup()
        // Subscribe to endpoints.
        for (const endpoint of subscriptions) {
          ws.send(JSON.stringify([5, endpoint]))
        }
        this.emit('connected')
        resolve()
      })

      ws.on('error', (err: unknown) => {
        cleanup()
        reject(err)
      })

      ws.on('close', () => {
        this.emit('disconnected')
      })

      ws.on('message', (buf: WebSocket.RawData) => {
        try {
          const msg = JSON.parse(buf.toString())
          // LCU websocket: [eventType, subscriptionId, payload]
          if (Array.isArray(msg) && msg.length >= 3 && msg[2]?.uri) {
            const payload = msg[2] as LcuEventPayload
            this.emit('event', payload)
            this.emit(payload.uri, payload)
          }
        } catch {
          // ignore parse errors
        }
      })
    })
  }

  disconnect() {
    if (!this.ws) return
    try {
      this.ws.close()
    } catch {
      // ignore
    }
    this.ws = null
  }
}
