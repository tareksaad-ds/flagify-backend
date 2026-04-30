import Fastify from 'fastify'
import envPlugin from './plugins/env'
import corsPlugin from './plugins/cors'
import swaggerPlugin from './plugins/swagger'
import supabasePlugin from './plugins/supabase'
import dbPlugin from './plugins/db'
import authenticatePlugin from './plugins/authenticate'
import sdkAuthenticatePlugin from './plugins/sdk-authenticate'
import emitterPlugin from './plugins/emitter'
import healthRoutes from './routes/health'
import authRoutes from './routes/auth'
import projectRoutes from './routes/projects'
import flagRoutes from './routes/flags'
import sdkRoutes from './routes/sdk'

function buildApp() {
  const app = Fastify({ logger: true })

  app.register(envPlugin)
  app.register(corsPlugin)
  app.register(swaggerPlugin)
  app.register(supabasePlugin)
  app.register(dbPlugin)
  app.register(authenticatePlugin)
  app.register(sdkAuthenticatePlugin)
  app.register(emitterPlugin)

  app.register(healthRoutes)
  app.register(authRoutes)
  app.register(projectRoutes)
  app.register(flagRoutes)
  app.register(sdkRoutes)

  return app
}

export default buildApp
