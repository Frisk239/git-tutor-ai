// ============= 应用常量 =============
export const APP_NAME = 'Git Tutor AI';
export const APP_VERSION = '0.1.0';
export const APP_DESCRIPTION = 'AI-driven development assistant platform';

// ============= API 常量 =============
export const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
export const WS_BASE_URL = process.env.WS_BASE_URL || 'ws://localhost:3001';

// ============= 文件常量 =============
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_IMAGE_DIMENSION = 7500;
export const MAX_UPLOAD_FILES = 5;

// ============= AI 常量 =============
export const DEFAULT_TEMPERATURE = 0;
export const DEFAULT_MAX_TOKENS = 4096;
export const STREAM_CHUNK_SIZE = 64;

// ============= Git 常量 =============
export const DEFAULT_BRANCH = 'main';
export const COMMIT_MESSAGE_MAX_LENGTH = 72;

// ============= 时间常量 =============
export const TIMEOUT = {
  SHORT: 5000,
  MEDIUM: 30000,
  LONG: 120000,
};

// ============= 路径常量 =============
export const PATHS = {
  TASKS: '.tasks',
  CACHE: '.cache',
  TEMP: '.temp',
};
