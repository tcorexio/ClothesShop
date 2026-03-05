import { CallHandler, ExecutionContext, NestInterceptor } from "@nestjs/common";
import { map, Observable } from "rxjs";

export class TransformInterceptor<T> implements NestInterceptor<T, any> {
    intercept(context: ExecutionContext, next: CallHandler<T>): Observable<any> | Promise<Observable<any>> {
        return next.handle().pipe(map((response: any) => {
            if (response?.message && response?.data !== undefined) {
                return {
                    success: true,
                    message: response.message,
                    data: response.data,
                };
            }

            return {
                success: true,
                message: 'Request successful',
                data: response,
            };
        }));
    }
}