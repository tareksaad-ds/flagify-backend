import { IncomingMessage, ServerResponse } from 'http'
import buildApp from '../src/app'

const app = buildApp()
const readyPromise = app.ready()

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  await readyPromise
  app.server.emit('request', req, res)
}
