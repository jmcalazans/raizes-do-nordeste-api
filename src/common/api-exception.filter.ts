import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const request = host.switchToHttp().getRequest<Request>();
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const raw = exception instanceof HttpException ? exception.getResponse() : null;
    const object = typeof raw === 'object' && raw !== null ? raw as Record<string, unknown> : {};
    const rawMessage = object.message ?? (exception instanceof Error ? exception.message : 'Erro interno.');
    const messages = Array.isArray(rawMessage) ? rawMessage.map(String) : [String(rawMessage)];

    response.status(status).json({
      error: String(object.error ?? HttpStatus[status] ?? 'ERRO').toUpperCase().replaceAll(' ', '_'),
      message: messages[0],
      details: messages.slice(1).map((issue) => ({ issue })),
      timestamp: new Date().toISOString(),
      path: request.originalUrl,
      requestId: request.header('x-request-id') ?? randomUUID(),
    });
  }
}
