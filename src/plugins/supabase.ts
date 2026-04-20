import fp from 'fastify-plugin'
import { createClient } from '@supabase/supabase-js'
import { FastifyInstance } from 'fastify'

async function supabasePlugin(fastify: FastifyInstance) {
  const client = createClient(
    fastify.config.SUPABASE_URL,
    fastify.config.SUPABASE_SERVICE_ROLE_KEY
  )

  fastify.decorate('supabase', client)
}

export default fp(supabasePlugin, { name: 'supabase', dependencies: ['env'] })
