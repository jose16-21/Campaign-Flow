import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx      = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status  = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const { code, message } = this.resolverMensaje(exception, status);

    response.status(status).json({ error: { code, message } });
  }

  private resolverMensaje(
    exception: unknown,
    status: number,
  ): { code: string; message: string } {
    if (exception instanceof HttpException) {
      const body = exception.getResponse();

      // El servicio ya lanzó { error: { code, message } } — lo re-usamos
      if (
        typeof body === 'object' &&
        body !== null &&
        'error' in body &&
        typeof (body as Record<string, unknown>).error === 'object'
      ) {
        const e = (body as { error: { code?: string; message?: string } }).error;
        return {
          code:    e.code    ?? this.codigoPorStatus(status),
          message: e.message ?? exception.message,
        };
      }

      // ValidationPipe lanza { message: string[], error: 'Bad Request' }
      if (typeof body === 'object' && body !== null && 'message' in body) {
        const msgs = (body as { message: string | string[] }).message;
        return {
          code:    this.codigoPorStatus(status),
          message: Array.isArray(msgs) ? msgs.join('; ') : String(msgs),
        };
      }

      return {
        code:    this.codigoPorStatus(status),
        message: typeof body === 'string' ? body : exception.message,
      };
    }

    return {
      code:    'ERROR_INTERNO',
      message: 'Error interno del servidor',
    };
  }

  private codigoPorStatus(status: number): string {
    const mapa: Record<number, string> = {
      400: 'VALIDACION_FALLIDA',
      401: 'NO_AUTORIZADO',
      403: 'PROHIBIDO',
      404: 'NO_ENCONTRADO',
      409: 'CONFLICTO',
      422: 'ENTIDAD_NO_PROCESABLE',
      500: 'ERROR_INTERNO',
    };
    return mapa[status] ?? `ERROR_${status}`;
  }
}
