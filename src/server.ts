import buildApp from './app'

async function start() {
  const app = buildApp()

  try {
    await app.ready()
    await app.listen({ port: Number(app.config.PORT), host: '0.0.0.0' })
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
