import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildServer } from '../../server.js'
import { toolService } from '../../services/tool.service.js'

describe('Tools API Integration', () => {
  let server: any
  let baseUrl: string

  beforeAll(async () => {
    server = await buildServer()
    await server.listen({ port: 0 })
    baseUrl = `http://localhost:${server.server.address().port}`
  })

  afterAll(async () => {
    await server.close()
  })

  it('should list all available tools', async () => {
    const response = await fetch(`${baseUrl}/api/tools/list`)
    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data).toHaveProperty('tools')
    expect(Array.isArray(data.tools)).toBe(true)
    expect(data.tools.length).toBeGreaterThan(0)
  })

  it('should get tool details', async () => {
    const response = await fetch(`${baseUrl}/api/tools/read_file`)
    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data).toHaveProperty('name', 'read_file')
    expect(data).toHaveProperty('category')
    expect(data).toHaveProperty('description')
  })

  it('should execute read_file tool', async () => {
    const response = await fetch(`${baseUrl}/api/tools/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tool: 'read_file',
        args: { filePath: 'package.json' },
      }),
    })

    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.result).toBeDefined()
  })

  it('should handle tool execution errors', async () => {
    const response = await fetch(`${baseUrl}/api/tools/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tool: 'read_file',
        args: { filePath: '/nonexistent/file.txt' },
      }),
    })

    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data.success).toBe(false)
    expect(data).toHaveProperty('error')
  })

  it('should handle non-existent tool', async () => {
    const response = await fetch(`${baseUrl}/api/tools/nonexistent_tool`)
    expect(response.status).toBe(404)
  })
})

describe('Tool Service Direct Tests', () => {
  it('should list tools via service', async () => {
    const tools = await toolService.listTools()
    expect(Array.isArray(tools)).toBe(true)
    expect(tools.length).toBeGreaterThan(0)
  })

  it('should get tool details via service', async () => {
    const tool = await toolService.getTool('list_files')
    expect(tool).not.toBeNull()
    expect(tool?.name).toBe('list_files')
  })

  it('should return null for non-existent tool', async () => {
    const tool = await toolService.getTool('nonexistent_tool')
    expect(tool).toBeNull()
  })
})
