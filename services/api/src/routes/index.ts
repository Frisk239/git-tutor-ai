// 路由聚合
import type { FastifyInstance } from "fastify";
import { healthRoutes } from "./health.js";

export async function routes(
  fastify: FastifyInstance
) {
  // 注册现有的 API 路由
  await fastify.register(healthRoutes);

  // TODO: 添加更多路由 (auth, projects, git, github, ai, websocket)
  // 这些路由将在 Phase 1 实现
}
