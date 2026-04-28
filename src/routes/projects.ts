import { FastifyInstance } from 'fastify'
import { AppError, createProjectsService } from '../services/projects.service'

const projectIdParams = {
  type: 'object',
  required: ['id'],
  properties: {
    id: { type: 'string', format: 'uuid' },
  },
}

const envParams = {
  type: 'object',
  required: ['id', 'envId'],
  properties: {
    id: { type: 'string', format: 'uuid' },
    envId: { type: 'string', format: 'uuid' },
  },
}

const projectBody = {
  type: 'object',
  required: ['name'],
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 100 },
  },
  additionalProperties: false,
}

const envBody = {
  type: 'object',
  required: ['name'],
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 50 },
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

export default async function projectRoutes(fastify: FastifyInstance) {
  const projects = createProjectsService(fastify.db)

  fastify.post('/projects', {
    schema: {
      tags: ['Projects'],
      summary: 'Create a new project',
      security: [{ Bearer: [] }],
      body: projectBody,
    },
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { name } = request.body as { name: string }
    try {
      const project = await projects.createProject(name, request.user.id)
      return reply.status(201).send(project)
    } catch (err) {
      return handleError(err, reply)
    }
  })

  fastify.get('/projects', {
    schema: {
      tags: ['Projects'],
      summary: "List the current user's projects",
      security: [{ Bearer: [] }],
    },
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const list = await projects.listProjects(request.user.id)
      return reply.status(200).send(list)
    } catch (err) {
      return handleError(err, reply)
    }
  })

  fastify.get('/projects/:id', {
    schema: {
      tags: ['Projects'],
      summary: 'Get a single project',
      security: [{ Bearer: [] }],
      params: projectIdParams,
    },
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      const project = await projects.getProject(id, request.user.id)
      return reply.status(200).send(project)
    } catch (err) {
      return handleError(err, reply)
    }
  })

  fastify.patch('/projects/:id', {
    schema: {
      tags: ['Projects'],
      summary: 'Update a project name',
      security: [{ Bearer: [] }],
      params: projectIdParams,
      body: projectBody,
    },
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { name } = request.body as { name: string }
    try {
      const project = await projects.updateProject(id, request.user.id, name)
      return reply.status(200).send(project)
    } catch (err) {
      return handleError(err, reply)
    }
  })

  fastify.delete('/projects/:id', {
    schema: {
      tags: ['Projects'],
      summary: 'Delete a project and everything under it',
      security: [{ Bearer: [] }],
      params: projectIdParams,
    },
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      await projects.deleteProject(id, request.user.id)
      return reply.status(204).send()
    } catch (err) {
      return handleError(err, reply)
    }
  })

  fastify.post('/projects/:id/environments', {
    schema: {
      tags: ['Environments'],
      summary: 'Create an environment in a project',
      security: [{ Bearer: [] }],
      params: projectIdParams,
      body: envBody,
    },
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { name } = request.body as { name: string }
    try {
      const env = await projects.createEnvironment(id, request.user.id, name)
      return reply.status(201).send(env)
    } catch (err) {
      return handleError(err, reply)
    }
  })

  fastify.get('/projects/:id/environments', {
    schema: {
      tags: ['Environments'],
      summary: 'List environments in a project',
      security: [{ Bearer: [] }],
      params: projectIdParams,
    },
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      const list = await projects.listEnvironments(id, request.user.id)
      return reply.status(200).send(list)
    } catch (err) {
      return handleError(err, reply)
    }
  })

  fastify.delete('/projects/:id/environments/:envId', {
    schema: {
      tags: ['Environments'],
      summary: 'Delete an environment',
      security: [{ Bearer: [] }],
      params: envParams,
    },
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { id, envId } = request.params as { id: string; envId: string }
    try {
      await projects.deleteEnvironment(id, envId, request.user.id)
      return reply.status(204).send()
    } catch (err) {
      return handleError(err, reply)
    }
  })
}
