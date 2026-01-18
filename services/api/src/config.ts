// 应用配置
export const config = {
  port: parseInt(process.env.PORT || '3001'),
  host: process.env.HOST || '0.0.0.0',

  // 数据库配置
  database: {
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/git_tutor',
  },

  // JWT 配置
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  },

  // AI 配置
  ai: {
    openaiApiKey: process.env.OPENAI_API_KEY,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    geminiApiKey: process.env.GEMINI_API_KEY,
  },

  // GitHub 配置
  github: {
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
  },

  // 文件存储
  storage: {
    uploadDir: process.env.UPLOAD_DIR || './uploads',
    maxFileSize: 10 * 1024 * 1024, // 10MB
  },
};
