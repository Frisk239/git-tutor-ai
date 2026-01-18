// 健康检查路由
import type { FastifyInstance } from "fastify";

export async function healthRoutes(
  fastify: FastifyInstance
) {
  fastify.get("/health", async () => {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      env: process.env.NODE_ENV || "development",
    };
  });

  fastify.get("/ready", async () => {
    // 可以添加数据库连接检查等
    return {
      status: "ready",
    };
  });
}
