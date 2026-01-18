// Fastify 服务器入口
import Fastify from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";

// 创建 Fastify 实例
const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || "info",
  },
});

// 注册 CORS
await app.register(cors, {
  origin: true,
  credentials: true,
});

// 注册 WebSocket
await app.register(websocket);

// 健康检查
app.get("/health", async () => {
  return {
    status: "ok",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "0.1.0",
  };
});

// 注册路由
import { routes } from "./routes/index.js";
await app.register(routes);

// 启动服务器
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || "3001");
    await app.listen({ port, host: "0.0.0.0" });
    console.log(`🚀 Server running at http://localhost:${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
