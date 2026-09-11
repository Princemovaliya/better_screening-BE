import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { logger } from '@core/logger';

interface ErrorResponseBody {
  isError: true;
  message: string;
  data: null;
}

/**
 * Global exception filter: normalizes every thrown error (HttpException subclasses,
 * validation errors, and unexpected runtime errors) into a single response shape,
 * `{ isError: true, message, data: null }`, and logs it.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status: number = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Something went wrong. Please try again.';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else if (typeof body === 'object' && body !== null && 'message' in body) {
        const m = body.message;
        message = Array.isArray(m) ? m.join(', ') : String(m);
      }
    } else if (exception instanceof Error) {
      message = exception.message || message;
    }

    if (status >= 500) {
      logger.error(
        `${status} — ${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      logger.warn(`${status} — ${message}`);
    }

    const body: ErrorResponseBody = { isError: true, message, data: null };
    response.status(status).json(body);
  }
}
