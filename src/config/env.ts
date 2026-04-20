const schema = {
  type: 'object',
  required: ['PORT', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'JWT_SECRET', 'DATABASE_URL'],
  properties: {
    PORT: { type: 'string', default: '6006' },
    NODE_ENV: { type: 'string', default: 'development' },
    SUPABASE_URL: { type: 'string' },
    SUPABASE_SERVICE_ROLE_KEY: { type: 'string' },
    JWT_SECRET: { type: 'string' },
    DATABASE_URL: { type: 'string' },
    CLIENT_URL: { type: 'string', default: 'http://localhost:6009' },
  },
} as const

export default schema
