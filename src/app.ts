import Fastify from 'fastify'
import envPlugin from './plugins/env'
import corsPlugin from './plugins/cors'
import swaggerPlugin from './plugins/swagger'
import supabasePlugin from './plugins/supabase'
import dbPlugin from './plugins/db'
import authenticatePlugin from './plugins/authenticate'
import healthRoutes from './routes/health'
import authRoutes from './routes/auth'
import projectRoutes from './routes/projects'
import flagRoutes from './routes/flags'

function buildApp() {
  const app = Fastify({ logger: true })

  app.register(envPlugin)
  app.register(corsPlugin)
  app.register(swaggerPlugin)
  app.register(supabasePlugin)
  app.register(dbPlugin)
  app.register(authenticatePlugin)

  app.register(healthRoutes)
  app.register(authRoutes)
  app.register(projectRoutes)
  app.register(flagRoutes)

  return app
}

export default buildApp
