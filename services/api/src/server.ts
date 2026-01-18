import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import websocket from '@fastify/websocket';
import { config } from './config.js';
import { errorHandler } from './middleware/error.js';

export async function buildServer() {
  const server = Fastify({
    logger: {
      level: config.logLevel,
    },
  });

  // 注册插件
  await server.register(cors, {
    origin: config.corsOrigin,
    credentials: true,
  });

  await server.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
      },
    },
  });

  await server.register(websocket);

  // 注册错误处理
  server.setErrorHandler(errorHandler);

  // 健康检查
  server.get('/health', async () => {
    return { status: 'ok', timestamp: Date.now() };
  });

  // 注册路由（后续任务添加）
  // await server.register(chatRoutes, { prefix: '/api/chat' })

  return server;
}

// 启动服务器（仅用于开发）
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = await buildServer();

  try {
    await server.listen({ port: config.port, host: config.host });
    console.log(`🚀 Server ready at http://${config.host}:${config.port}`);
  } catch (error) {
    server.log.error(error);
    process.exit(1);
  }
}
