import fp from 'fastify-plugin'
import fastifyCors from '@fastify/cors'
import { FastifyInstance } from 'fastify'

async function corsPlugin(fastify: FastifyInstance) {
  await fastify.register(fastifyCors, {
    origin: fastify.config.CLIENT_URL,
    credentials: true,
  })
}

export default fp(corsPlugin, { name: 'cors', dependencies: ['env'] })
