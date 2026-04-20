import fp from 'fastify-plugin'
import fastifyEnv from '@fastify/env'
import { FastifyInstance } from 'fastify'
import schema from '../config/env'

async function envPlugin(fastify: FastifyInstance) {
  await fastify.register(fastifyEnv, {
    schema,
    dotenv: true,
  })
}

export default fp(envPlugin, { name: 'env' })
