import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap, catchError } from 'rxjs';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const now = Date.now();

    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<Request>();
    const response = httpContext.getResponse<Response>();

    const requestId = uuidv4();
    request['requestId'] = requestId;

    const { method, originalUrl } = request;
    const ip = request.ip;
    const userId = (request as any).user?.id ?? 'anonymous';

    console.log(
      `[${requestId}] ${method} ${originalUrl} - user:${userId} - ip:${ip}`,
    );

    return next.handle().pipe(
      tap(() => {
        const statusCode = response.statusCode;
        const time = Date.now() - now;

        console.log(
          `[${requestId}] ${method} ${originalUrl} ||| Status: ${statusCode} ||| Time: ${time}ms`,
        );

        if (time > 1000) {
          console.warn(
            `[${requestId}] Slow API detected: ${time}ms`,
          );
        }
      }),

      catchError((err) => {
        const time = Date.now() - now;

        console.error(
          `[${requestId}] ${method} ${originalUrl} - ${err.message} - ${time}ms`,
        );

        throw err;
      }),
    );
  }
}