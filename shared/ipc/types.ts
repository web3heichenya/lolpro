import type { z } from 'zod'

import type { eventPayloadSchemas, invokeChannelSchemas } from './schemas'

export type InvokeSchemaMap = typeof invokeChannelSchemas
export type InvokeChannel = keyof InvokeSchemaMap

export type InvokeInput<TChannel extends InvokeChannel> = z.input<InvokeSchemaMap[TChannel]['input']>
export type InvokeOutput<TChannel extends InvokeChannel> = z.output<InvokeSchemaMap[TChannel]['output']>

export type EventSchemaMap = typeof eventPayloadSchemas
export type EventChannel = keyof EventSchemaMap

export type EventPayload<TChannel extends EventChannel> = z.output<EventSchemaMap[TChannel]>
