import { SupabaseClient } from '@supabase/supabase-js'
import { Sql } from 'postgres'
import 'fastify'

declare module 'fastify' {
  interface FastifyInstance {
    supabase: SupabaseClient
    db: Sql
    config: {
      PORT: string
      NODE_ENV: string
      SUPABASE_URL: string
      SUPABASE_SERVICE_ROLE_KEY: string
      JWT_SECRET: string
      DATABASE_URL: string
      CLIENT_URL: string
    }
  }
}
