import { FastifyInstance } from 'fastify'

async function healthRoutes(fastify: FastifyInstance) {
  fastify.get('/health', async () => {
    const [{ now }] = await fastify.db`SELECT NOW() as now`
    return { status: 'ok', timestamp: new Date().toISOString(), db: now }
  })
}

export default healthRoutes
