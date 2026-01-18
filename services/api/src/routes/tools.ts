import type { FastifyInstance } from 'fastify'
import { toolService } from '../services/tool.service.js'
import { executeToolSchema } from '../schemas/tools.js'

export async function toolRoutes(fastify: FastifyInstance) {
  // 执行工具
  fastify.post('/execute', async (request, reply) => {
    const input = executeToolSchema.parse(request.body)
    const result = await toolService.executeTool(input)
    return reply.send(result)
  })

  // 获取工具列表
  fastify.get('/list', async () => {
    const tools = await toolService.listTools()
    return { tools }
  })

  // 获取工具详情
  fastify.get('/:toolName', async (request, reply) => {
    const { toolName } = request.params as { toolName: string }
    const tool = await toolService.getTool(toolName)

    if (!tool) {
      return reply.status(404).send({
        error: { message: 'Tool not found' }
      })
    }

    return tool
  })
}
