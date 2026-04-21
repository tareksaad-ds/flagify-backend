import { FastifyInstance } from 'fastify'
import { createAuthService } from '../services/auth.service'

const credentialsSchema = {
  type: 'object',
  required: ['email', 'password'],
  properties: {
    email: { type: 'string', format: 'email' },
    password: { type: 'string', minLength: 8 },
  },
  additionalProperties: false,
}

export default async function authRoutes(fastify: FastifyInstance) {
  const authService = createAuthService(fastify.supabase)

  fastify.post('/auth/register', {
    schema: {
      tags: ['Auth'],
      summary: 'Register a new user',
      body: credentialsSchema,
    },
  }, async (request, reply) => {
    const { email, password } = request.body as { email: string; password: string }

    try {
      const data = await authService.register(email, password)
      return reply.status(201).send(data)
    } catch (err: any) {
      return reply.status(400).send({ error: err.message })
    }
  })

  fastify.post('/auth/login', {
    schema: {
      tags: ['Auth'],
      summary: 'Login with email and password',
      body: credentialsSchema,
    },
  }, async (request, reply) => {
    const { email, password } = request.body as { email: string; password: string }

    try {
      const data = await authService.login(email, password)
      return reply.status(200).send(data)
    } catch (err: any) {
      return reply.status(401).send({ error: err.message })
    }
  })

  fastify.post('/auth/logout', {
    schema: {
      tags: ['Auth'],
      summary: 'Logout the current user',
      security: [{ Bearer: [] }],
    },
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const token = request.headers.authorization!.slice(7)

    try {
      await authService.logout(token)
      return reply.status(204).send()
    } catch (err: any) {
      return reply.status(400).send({ error: err.message })
    }
  })

  fastify.get('/auth/me', {
    schema: {
      tags: ['Auth'],
      summary: 'Get the current authenticated user',
      security: [{ Bearer: [] }],
    },
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    return reply.status(200).send(request.user)
  })
}
