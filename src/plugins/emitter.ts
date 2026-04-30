import fp from 'fastify-plugin'
import { EventEmitter } from 'events'
import { FastifyInstance } from 'fastify'

export interface FlagChangedEvent {
  environmentId: string
  flagKey: string
  enabled: boolean
  rollout_percentage: number
  rules: unknown[]
}

async function emitterPlugin(fastify: FastifyInstance) {
  fastify.decorate('emitter', new EventEmitter())
}

export default fp(emitterPlugin, { name: 'emitter' })
