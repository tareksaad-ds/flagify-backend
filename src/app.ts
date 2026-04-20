import Fastify from 'fastify'
import envPlugin from './plugins/env'
import corsPlugin from './plugins/cors'
import supabasePlugin from './plugins/supabase'
import dbPlugin from './plugins/db'
import healthRoutes from './routes/health'

function buildApp() {
  const app = Fastify({ logger: true })

  app.register(envPlugin)
  app.register(corsPlugin)
  app.register(supabasePlugin)
  app.register(dbPlugin)
  app.register(healthRoutes)

  return app
}

export default buildApp
