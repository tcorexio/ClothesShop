import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap, catchError } from 'rxjs';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const startTime = Date.now();

    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<Request>();
    const response = httpContext.getResponse<Response>();

    const requestId = uuidv4();
    request['requestId'] = requestId;

    const { method, originalUrl } = request;
    const ip = request.ip;
    const userId = (request as any).user?.id ?? 'anonymous';

    this.logger.log(
      `[${requestId}] ${method} ${originalUrl} - User: ${userId} - IP: ${ip}`,
    );

    return next.handle().pipe(
      tap(() => {
        const statusCode = response.statusCode;
        const duration = Date.now() - startTime;

        this.logger.log(
          `[${requestId}] ${method} ${originalUrl} ${statusCode} - ${duration}ms`,
        );

        if (duration > 1000) {
          this.logger.warn(
            `[${requestId}] Slow API detected: ${originalUrl} took ${duration}ms`,
          );
        }
      }),

      catchError((err) => {
        const duration = Date.now() - startTime;

        this.logger.error(
          `[${requestId}] ${method} ${originalUrl} failed after ${duration}ms - ${err.message}`,
          err.stack,
        );

        throw err;
      }),
    );
  }
}