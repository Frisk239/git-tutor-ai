import { z } from 'zod';

export function validateBody<T extends z.ZodType>(schema: T) {
  return async function (request: any, reply: any) {
    try {
      request.body = schema.parse(request.body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: '请求参数验证失败',
            details: error.errors,
          },
        });
        throw error; // 阻止继续执行
      }
      throw error;
    }
  };
}
