export const config = {
  // 服务器配置
  port: parseInt(process.env.PORT || '3000'),
  host: process.env.HOST || '0.0.0.0',

  // 数据库
  databaseUrl: process.env.DATABASE_URL || 'postgresql://localhost:5432/git_tutor_ai',

  // CORS
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',

  // 环境
  env: process.env.NODE_ENV || 'development',

  // 日志级别
  logLevel: process.env.LOG_LEVEL || 'info',
} as const;
