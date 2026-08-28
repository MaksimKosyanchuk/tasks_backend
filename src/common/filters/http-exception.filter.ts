import {
    ArgumentsHost,
    Catch,
    ExceptionFilter,
    HttpException,
    HttpStatus,
} from '@nestjs/common';
import type { Response, Request } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
    catch(exception: unknown, host: ArgumentsHost) {
        const context = host.switchToHttp();
        const response = context.getResponse<Response>();
        const request = context.getRequest<Request>();

        if (exception instanceof HttpException) {
            const status = exception.getStatus();
            const payload = exception.getResponse();

            response
                .status(status)
                .json(this.formatPayload(payload, status, request.url));
            return;
        }

        response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            message: 'Internal server error',
            error: 'Internal Server Error',
            path: request.url,
            timestamp: new Date().toISOString(),
        });
    }

    private formatPayload(
        payload: string | object,
        status: number,
        path: string,
    ) {
        if (typeof payload === 'string') {
            return {
                statusCode: status,
                message: payload,
                path,
                timestamp: new Date().toISOString(),
            };
        }

        return {
            statusCode: status,
            ...payload,
            path,
            timestamp: new Date().toISOString(),
        };
    }
}
