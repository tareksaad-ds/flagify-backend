import fp from 'fastify-plugin'
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'

async function authenticatePlugin(fastify: FastifyInstance) {
  fastify.decorate(
    'authenticate',
    async function (request: FastifyRequest, reply: FastifyReply) {
      const authHeader = request.headers.authorization

      if (!authHeader?.startsWith('Bearer ')) {
        return reply.status(401).send({ error: 'Missing or malformed Authorization header' })
      }

      const token = authHeader.slice(7)
      const { data, error } = await fastify.supabase.auth.getUser(token)

      if (error || !data.user) {
        return reply.status(401).send({ error: 'Invalid or expired token' })
      }

      request.user = data.user
    }
  )
}

export default fp(authenticatePlugin, { name: 'authenticate', dependencies: ['supabase'] })
