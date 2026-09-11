import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

interface SuccessResponseBody<T> {
  isError: false;
  message: string;
  data: T;
}

interface MessageAndData<T> {
  message: string;
  data: T;
}

function isMessageAndData<T>(result: unknown): result is MessageAndData<T> {
  return (
    typeof result === 'object' &&
    result !== null &&
    'message' in result &&
    'data' in result &&
    Object.keys(result).length === 2
  );
}

/**
 * Wraps every controller return value into the app-wide response envelope:
 * `{ isError: false, message, data }`. Services return either a plain payload
 * (becomes `data`, with a generic default message) or `{ message, data }` to
 * customize the message. Apply per-controller with `@UseInterceptors(TransformInterceptor)`.
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, SuccessResponseBody<T>> {
  intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<SuccessResponseBody<T>> {
    return next.handle().pipe(
      map((result: T) => {
        if (isMessageAndData<T>(result)) {
          return { isError: false as const, message: result.message, data: result.data };
        }
        return { isError: false as const, message: 'Success', data: result };
      }),
    );
  }
}
