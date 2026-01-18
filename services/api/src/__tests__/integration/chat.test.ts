import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildServer } from '../../server';
import { prisma } from '@git-tutor/db';

describe('Chat API Integration', () => {
  let server: any;
  let baseUrl: string;

  beforeAll(async () => {
    server = await buildServer();
    await server.listen({ port: 0 }); // 随机端口
    baseUrl = 'http://localhost:' + server.server.address().port;
  });

  afterAll(async () => {
    await server.close();
  });

  it('should create a session', async () => {
    const response = await fetch(baseUrl + '/api/chat/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Test Session' }),
    });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data).toHaveProperty('id');
    expect(data.title).toBe('Test Session');
  });

  it('should list sessions', async () => {
    const response = await fetch(baseUrl + '/api/chat/sessions');
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('sessions');
    expect(Array.isArray(data.sessions)).toBe(true);
  });

  it('should get session details', async () => {
    // 创建会话
    const createResponse = await fetch(baseUrl + '/api/chat/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Test Session' }),
    });
    const session = await createResponse.json();

    // 获取会话详情
    const response = await fetch(baseUrl + '/api/chat/sessions/' + session.id);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.id).toBe(session.id);
  });

  it('should delete a session', async () => {
    // 创建会话
    const createResponse = await fetch(baseUrl + '/api/chat/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'To Delete' }),
    });
    const session = await createResponse.json();

    // 删除会话
    const deleteResponse = await fetch(baseUrl + '/api/chat/sessions/' + session.id, {
      method: 'DELETE',
    });
    expect(deleteResponse.status).toBe(204);

    // 验证已删除
    const getResponse = await fetch(baseUrl + '/api/chat/sessions/' + session.id);
    expect(getResponse.status).toBe(404);
  });
});
