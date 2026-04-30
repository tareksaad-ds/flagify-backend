import { FastifyInstance } from 'fastify'
import { AppError } from '../services/projects.service'
import { createFlagsService } from '../services/flags.service'
import { createAuditService } from '../services/audit.service'
import { FlagChangedEvent } from '../plugins/emitter'

const flagParams = {
  type: 'object',
  required: ['id', 'flagId'],
  properties: {
    id: { type: 'string', format: 'uuid' },
    flagId: { type: 'string', format: 'uuid' },
  },
}

const flagEnvParams = {
  type: 'object',
  required: ['id', 'flagId', 'envId'],
  properties: {
    id: { type: 'string', format: 'uuid' },
    flagId: { type: 'string', format: 'uuid' },
    envId: { type: 'string', format: 'uuid' },
  },
}

const createFlagBody = {
  type: 'object',
  required: ['key', 'name'],
  properties: {
    key: { type: 'string', minLength: 1, maxLength: 100, pattern: '^[a-zA-Z0-9_-]+$' },
    name: { type: 'string', minLength: 1, maxLength: 100 },
    description: { type: 'string', maxLength: 500 },
  },
  additionalProperties: false,
}

const updateFlagBody = {
  type: 'object',
  minProperties: 1,
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 100 },
    description: { type: 'string', maxLength: 500 },
  },
  additionalProperties: false,
}

const flagStateBody = {
  type: 'object',
  required: ['enabled'],
  properties: {
    enabled: { type: 'boolean' },
    rollout_percentage: { type: 'integer', minimum: 0, maximum: 100 },
    rules: { type: 'array' },
  },
  additionalProperties: false,
}

const paginationQuery = {
  type: 'object',
  properties: {
    limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
    offset: { type: 'integer', minimum: 0, default: 0 },
  },
  additionalProperties: false,
}

function handleError(err: unknown, reply: any) {
  if (err instanceof AppError) {
    return reply.status(err.statusCode).send({ error: err.message })
  }
  reply.log.error(err)
  return reply.status(500).send({ error: 'Internal server error' })
}

export default async function flagRoutes(fastify: FastifyInstance) {
  const flags = createFlagsService(fastify.db)
  const audit = createAuditService(fastify.db)

  fastify.post('/projects/:id/flags', {
    schema: {
      tags: ['Flags'],
      summary: 'Create a flag in a project',
      security: [{ Bearer: [] }],
      params: { type: 'object', properties: { id: { type: 'string', format: 'uuid' } } },
      body: createFlagBody,
    },
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { key, name, description } = request.body as { key: string; name: string; description?: string }
    try {
      const flag = await flags.createFlag(id, request.user.id, key, name, description)
      return reply.status(201).send(flag)
    } catch (err) {
      return handleError(err, reply)
    }
  })

  fastify.get('/projects/:id/flags', {
    schema: {
      tags: ['Flags'],
      summary: 'List all flags in a project',
      security: [{ Bearer: [] }],
      params: { type: 'object', properties: { id: { type: 'string', format: 'uuid' } } },
    },
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      const list = await flags.listFlags(id, request.user.id)
      return reply.status(200).send(list)
    } catch (err) {
      return handleError(err, reply)
    }
  })

  fastify.get('/projects/:id/flags/:flagId', {
    schema: {
      tags: ['Flags'],
      summary: 'Get a flag with its state per environment',
      security: [{ Bearer: [] }],
      params: flagParams,
    },
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { id, flagId } = request.params as { id: string; flagId: string }
    try {
      const flag = await flags.getFlag(flagId, id, request.user.id)
      return reply.status(200).send(flag)
    } catch (err) {
      return handleError(err, reply)
    }
  })

  fastify.patch('/projects/:id/flags/:flagId', {
    schema: {
      tags: ['Flags'],
      summary: 'Update flag metadata',
      security: [{ Bearer: [] }],
      params: flagParams,
      body: updateFlagBody,
    },
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { id, flagId } = request.params as { id: string; flagId: string }
    const data = request.body as { name?: string; description?: string }
    try {
      const flag = await flags.updateFlag(flagId, id, request.user.id, data)
      return reply.status(200).send(flag)
    } catch (err) {
      return handleError(err, reply)
    }
  })

  fastify.delete('/projects/:id/flags/:flagId', {
    schema: {
      tags: ['Flags'],
      summary: 'Delete a flag',
      security: [{ Bearer: [] }],
      params: flagParams,
    },
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { id, flagId } = request.params as { id: string; flagId: string }
    try {
      await flags.deleteFlag(flagId, id, request.user.id)
      return reply.status(204).send()
    } catch (err) {
      return handleError(err, reply)
    }
  })

  fastify.put('/projects/:id/flags/:flagId/environments/:envId', {
    schema: {
      tags: ['Flags'],
      summary: 'Update flag state for an environment',
      security: [{ Bearer: [] }],
      params: flagEnvParams,
      body: flagStateBody,
    },
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { id, flagId, envId } = request.params as { id: string; flagId: string; envId: string }
    const { enabled, rollout_percentage = 100, rules = [] } = request.body as {
      enabled: boolean
      rollout_percentage?: number
      rules?: unknown[]
    }
    try {
      const state = await flags.updateFlagState(flagId, envId, id, request.user.id, enabled, rollout_percentage, rules)

      const [flag] = await fastify.db`SELECT key FROM flags WHERE id = ${flagId}`
      fastify.emitter.emit('flag_changed', {
        environmentId: envId,
        flagKey: flag.key,
        enabled: state.enabled,
        rollout_percentage: state.rollout_percentage,
        rules: state.rules,
      } satisfies FlagChangedEvent)

      return reply.status(200).send(state)
    } catch (err) {
      return handleError(err, reply)
    }
  })

  fastify.get('/projects/:id/flags/:flagId/audit', {
    schema: {
      tags: ['Audit'],
      summary: 'List audit history for a flag',
      security: [{ Bearer: [] }],
      params: flagParams,
      querystring: paginationQuery,
    },
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { id, flagId } = request.params as { id: string; flagId: string }
    const { limit = 50, offset = 0 } = request.query as { limit?: number; offset?: number }
    try {
      const logs = await audit.listFlagAudit(flagId, id, request.user.id, limit, offset)
      return reply.status(200).send(logs)
    } catch (err) {
      return handleError(err, reply)
    }
  })

  fastify.get('/projects/:id/audit', {
    schema: {
      tags: ['Audit'],
      summary: 'List all audit events for a project',
      security: [{ Bearer: [] }],
      params: { type: 'object', properties: { id: { type: 'string', format: 'uuid' } } },
      querystring: paginationQuery,
    },
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { limit = 50, offset = 0 } = request.query as { limit?: number; offset?: number }
    try {
      const logs = await audit.listProjectAudit(id, request.user.id, limit, offset)
      return reply.status(200).send(logs)
    } catch (err) {
      return handleError(err, reply)
    }
  })
}
