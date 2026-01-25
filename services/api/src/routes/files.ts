import type { FastifyInstance } from 'fastify'
import { fileService } from '../services/file.service'

export async function fileRoutes(fastify: FastifyInstance) {
  // GET /api/files/read?path=xxx - Read file content
  fastify.get('/read', async (request, reply) => {
    const { path } = request.query as { path?: string }

    if (!path) {
      return reply.status(400).send({
        error: { message: 'Path parameter is required' }
      })
    }

    const result = await fileService.readFile(path)

    if (!result.success) {
      return reply.status(404).send({
        error: { message: result.error }
      })
    }

    return reply.send(result)
  })

  // GET /api/files/list?path=xxx - List directory
  fastify.get('/list', async (request, reply) => {
    const { path } = request.query as { path?: string }

    const result = await fileService.listFiles(path || '.')

    if (!result.success) {
      return reply.status(500).send({
        error: { message: result.error }
      })
    }

    return reply.send(result)
  })

  // GET /api/files/diff?path=xxx - Generate diff
  fastify.get('/diff', async (request, reply) => {
    const { path } = request.query as { path?: string }

    if (!path) {
      return reply.status(400).send({
        error: { message: 'Path parameter is required' }
      })
    }

    const result = await fileService.generateDiff(path)

    if (!result.success) {
      return reply.status(500).send({
        error: { message: result.error }
      })
    }

    return reply.send(result)
  })
}