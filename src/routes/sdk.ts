import { FastifyInstance } from 'fastify'
import { AppError } from '../services/projects.service'
import { createSdkService } from '../services/sdk.service'
import { evaluateFlag, EvaluationContext, FlagState, Rule } from '../services/evaluation.service'

function handleError(err: unknown, reply: any) {
  if (err instanceof AppError) {
    return reply.status(err.statusCode).send({ error: err.message })
  }
  reply.log.error(err)
  return reply.status(500).send({ error: 'Internal server error' })
}

function buildContext(userId: string, flagKey: string, query: Record<string, unknown>): EvaluationContext {
  const ctx: EvaluationContext = { userId, flagKey }
  for (const [k, v] of Object.entries(query)) {
    if (k === 'userId') continue
    if (typeof v === 'string' || typeof v === 'number') ctx[k] = v
  }
  return ctx
}

export default async function sdkRoutes(fastify: FastifyInstance) {
  const sdk = createSdkService(fastify.db)

  // --- Key management (JWT protected) ---

  fastify.post('/sdk/keys', {
    schema: {
      tags: ['SDK'],
      summary: 'Generate an SDK key for an environment',
      security: [{ Bearer: [] }],
      body: {
        type: 'object',
        required: ['projectId', 'environmentId', 'name'],
        properties: {
          projectId: { type: 'string', format: 'uuid' },
          environmentId: { type: 'string', format: 'uuid' },
          name: { type: 'string', minLength: 1, maxLength: 100 },
        },
        additionalProperties: false,
      },
    },
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { projectId, environmentId, name } = request.body as { projectId: string; environmentId: string; name: string }
    try {
      const sdkKey = await sdk.generateKey(projectId, environmentId, request.user.id, name)
      return reply.status(201).send(sdkKey)
    } catch (err) {
      return handleError(err, reply)
    }
  })

  fastify.get('/sdk/keys/:projectId', {
    schema: {
      tags: ['SDK'],
      summary: 'List SDK keys for a project',
      security: [{ Bearer: [] }],
      params: {
        type: 'object',
        required: ['projectId'],
        properties: { projectId: { type: 'string', format: 'uuid' } },
      },
    },
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { projectId } = request.params as { projectId: string }
    try {
      const keys = await sdk.listKeys(projectId, request.user.id)
      return reply.status(200).send(keys)
    } catch (err) {
      return handleError(err, reply)
    }
  })

  fastify.delete('/sdk/keys/:projectId/:keyId', {
    schema: {
      tags: ['SDK'],
      summary: 'Revoke an SDK key',
      security: [{ Bearer: [] }],
      params: {
        type: 'object',
        required: ['projectId', 'keyId'],
        properties: {
          projectId: { type: 'string', format: 'uuid' },
          keyId: { type: 'string', format: 'uuid' },
        },
      },
    },
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { projectId, keyId } = request.params as { projectId: string; keyId: string }
    try {
      await sdk.revokeKey(keyId, projectId, request.user.id)
      return reply.status(204).send()
    } catch (err) {
      return handleError(err, reply)
    }
  })

  // --- Flag evaluation (SDK key protected) ---

  fastify.get('/sdk/flags', {
    schema: {
      tags: ['SDK'],
      summary: 'Evaluate all flags for a context',
      headers: {
        type: 'object',
        required: ['x-sdk-key'],
        properties: { 'x-sdk-key': { type: 'string' } },
      },
      querystring: {
        type: 'object',
        required: ['userId'],
        properties: { userId: { type: 'string' } },
      },
    },
    preHandler: [fastify.sdkAuthenticate],
  }, async (request, reply) => {
    const query = request.query as Record<string, string>
    const { userId } = query

    try {
      const flagStates = await sdk.getFlagStatesForEnv(request.sdkEnv.environment_id)
      const result: Record<string, boolean> = {}

      for (const state of flagStates) {
        const ctx = buildContext(userId, state.flag_key, query)
        result[state.flag_key] = evaluateFlag(
          { enabled: state.enabled, rollout_percentage: state.rollout_percentage, rules: (state.rules ?? []) as Rule[] } as FlagState,
          ctx
        )
      }

      return reply.status(200).send(result)
    } catch (err) {
      return handleError(err, reply)
    }
  })

  fastify.get('/sdk/flags/:flagKey', {
    schema: {
      tags: ['SDK'],
      summary: 'Evaluate a single flag for a context',
      headers: {
        type: 'object',
        required: ['x-sdk-key'],
        properties: { 'x-sdk-key': { type: 'string' } },
      },
      params: {
        type: 'object',
        required: ['flagKey'],
        properties: { flagKey: { type: 'string' } },
      },
      querystring: {
        type: 'object',
        required: ['userId'],
        properties: { userId: { type: 'string' } },
      },
    },
    preHandler: [fastify.sdkAuthenticate],
  }, async (request, reply) => {
    const { flagKey } = request.params as { flagKey: string }
    const query = request.query as Record<string, string>
    const { userId } = query

    try {
      const state = await sdk.getFlagStateByKey(flagKey, request.sdkEnv.environment_id)
      if (!state) return reply.status(404).send({ error: 'Flag not found' })

      const ctx = buildContext(userId, flagKey, query)
      const enabled = evaluateFlag(
        { enabled: state.enabled, rollout_percentage: state.rollout_percentage, rules: (state.rules ?? []) as Rule[] } as FlagState,
        ctx
      )

      return reply.status(200).send({ [flagKey]: enabled })
    } catch (err) {
      return handleError(err, reply)
    }
  })
}
