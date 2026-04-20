import fp from 'fastify-plugin'
import postgres from 'postgres'
import { FastifyInstance } from 'fastify'

async function dbPlugin(fastify: FastifyInstance) {
  const sql = postgres(fastify.config.DATABASE_URL, {
    ssl: 'require',
    max: 10,
    idle_timeout: 30,
  })

  fastify.decorate('db', sql)

  fastify.addHook('onClose', async () => {
    await sql.end()
  })
}

export default fp(dbPlugin, { name: 'db', dependencies: ['env'] })
