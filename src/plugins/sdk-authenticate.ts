import fp from 'fastify-plugin'
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { createSdkService } from '../services/sdk.service'

async function sdkAuthenticatePlugin(fastify: FastifyInstance) {
  const sdk = createSdkService(fastify.db)

  fastify.decorate(
    'sdkAuthenticate',
    async function (request: FastifyRequest, reply: FastifyReply) {
      const key = request.headers['x-sdk-key']

      if (!key || typeof key !== 'string') {
        return reply.status(401).send({ error: 'Missing x-sdk-key header' })
      }

      const sdkEnv = await sdk.resolveKey(key)
      if (!sdkEnv) {
        return reply.status(401).send({ error: 'Invalid or revoked SDK key' })
      }

      request.sdkEnv = sdkEnv as { environment_id: string; project_id: string }
    }
  )
}

export default fp(sdkAuthenticatePlugin, { name: 'sdk-authenticate', dependencies: ['db'] })
