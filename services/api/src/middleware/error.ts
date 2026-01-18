import type { FastifyError, FastifyRequest, FastifyReply } from 'fastify';

export enum ErrorCode {
  UNKNOWN_ERROR = 1000,
  VALIDATION_ERROR = 1001,
  NOT_FOUND = 1002,
  AI_ERROR = 2000,
  DATABASE_ERROR = 3000,
}

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export async function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
) {
  request.log.error(error);

  // 处理验证错误
  if (error.validation) {
    return reply.status(400).send({
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        message: '请求参数验证失败',
        details: error.validation,
      },
    });
  }

  // 处理自定义错误
  if (error instanceof AppError) {
    return reply.status(error.code >= 5000 ? 500 : 400).send({
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    });
  }

  // 处理其他错误
  reply.status(500).send({
    error: {
      code: ErrorCode.UNKNOWN_ERROR,
      message: '服务器内部错误',
    },
  });
}
