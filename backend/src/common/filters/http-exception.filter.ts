import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { AppLogger } from '../logger/logger.service';
import type { MaybeRequestWithContext } from '../types/express-request.type';
import type { Response } from 'express';

type ErrorResponseBody = {
  success: false;
  error: {
    statusCode: number;
    code: string;
    message: string;
    details?: unknown;
  };
  meta: {
    requestId?: string;
    path: string;
    timestamp: string;
  };
};

type NormalizedError = {
  statusCode: number;
  code: string;
  message: string;
  details?: unknown;
  stack?: string;
};
/**
 * Global HTTP exception filter.
 * 책임 :
 * - 모든 예외를 잡아서 일관된 형식으로 응답을 반환
 * - 로깅
 * - 보안 처리 및 전송
 * - status code 및 error code 는 입력된 예외의 status code 및 error code 를 유지하되, message 는 raw string 으로 반환
 *
 * 예외의 종류 및 처리 방칙
 * new BadRequestException('Invalid input') -> status 유지, code = HTTP_${statusCode}, message = raw string
 * new BadRequestException({ code, message, details }) -> 메시지 유지
 * BadRequestException({ message: [...] }) -> message[]를 문자열로 합침, 원본 배열은 details로 보관
 * new Error('DB failed') -> status = 500, code = INTERNAL_SERVER_ERROR
 * 그 외 -> status = 500, code = INTERNAL_SERVER_ERROR
 */
@Injectable()
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: AppLogger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<MaybeRequestWithContext>();
    const response = http.getResponse<Response>();

    const normalizedError = this.normalizeException(exception);
    const responseBody = this.buildResponseBody(normalizedError, request);

    this.writeErrorLog(normalizedError, request);

    response.status(normalizedError.statusCode).json(responseBody);
  }

  private normalizeException(exception: unknown): NormalizedError {
    if (exception instanceof HttpException) {
      return this.normalizeHttpException(exception);
    }

    if (exception instanceof Error) {
      return this.normalizeRuntimeError(exception);
    }

    return this.normalizeUnknownException();
  }

  /*
   * 입력: Nest HttpException.
   * 그대로 쓰는 값: statusCode, stack, response.code, response.details.
   * 변경하는 값: message 배열은 문자열로 합치고, code가 없으면 HTTP_{statusCode}로 보정한다.
   */
  private normalizeHttpException(exception: HttpException): NormalizedError {
    const statusCode = exception.getStatus();
    const rawResponse = exception.getResponse();

    if (typeof rawResponse === 'string') {
      const stringError: NormalizedError = {
        statusCode,
        code: HttpStatus[statusCode] ? HttpStatus[statusCode] : 'HTTP_ERROR',
        message: rawResponse,
      };

      if (exception.stack !== undefined) {
        stringError.stack = exception.stack;
      }

      return stringError;
    }

    if (!this.isRecord(rawResponse)) {
      const recordError: NormalizedError = {
        statusCode,
        code: HttpStatus[statusCode] ? HttpStatus[statusCode] : 'HTTP_ERROR',
        message: exception.message,
      };

      if (exception.stack !== undefined) {
        recordError.stack = exception.stack;
      }

      return recordError;
    }

    const normalizedError: NormalizedError = {
      statusCode,
      code: this.extractCode(rawResponse, statusCode),
      message: this.extractMessage(rawResponse, exception.message),
    };

    const code = this.extractCode(rawResponse, statusCode);
    if (code !== undefined) {
      normalizedError.code = code;
    }

    if (exception.stack !== undefined) {
      normalizedError.stack = exception.stack;
    }

    const details = this.extractDetails(rawResponse);
    if (details !== undefined) {
      normalizedError.details = details;
    }

    return normalizedError;
  }
  /*
   * 입력: 일반 Error.
   * 그대로 쓰는 값: stack은 로그용으로 유지한다.
   * 변경하는 값: 원본 message는 클라이언트에 노출하지 않고 Internal server error로 치환한다.
   */
  private normalizeRuntimeError(exception: Error): NormalizedError {
    const normalizedError: NormalizedError = {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Internal server error',
    };
    if (exception.stack !== undefined) {
      normalizedError.stack = exception.stack;
    }
    return normalizedError;
  }

  /*
   * 입력: Error 객체가 아닌 unknown throw 값.
   * 그대로 쓰는 값: 없음.
   * 변경하는 값: 클라이언트 응답은 500 표준 메시지로 고정한다.
   */
  private normalizeUnknownException(): NormalizedError {
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Internal server error',
    };
  }
  private extractCode(rawResponse: Record<string, unknown>, statusCode: number): string {
    const rawCode = rawResponse['code'];

    if (typeof rawCode === 'string' && rawCode.length > 0) {
      return rawCode;
    }

    return HttpStatus[statusCode] ? HttpStatus[statusCode] : 'HTTP_ERROR';
  }

  private extractMessage(rawResponse: Record<string, unknown>, fallbackMessage: string): string {
    const rawMessage = rawResponse['message'];
    const rawError = rawResponse['error'];

    if (typeof rawMessage === 'string') {
      return rawMessage;
    }

    if (Array.isArray(rawMessage)) {
      return rawMessage.filter((item) => typeof item === 'string').join(', ');
    }

    if (typeof rawError === 'string') {
      return rawError;
    }

    return fallbackMessage;
  }
  private extractDetails(rawResponse: Record<string, unknown>): unknown {
    const rawDetails = rawResponse['details'];

    if (rawDetails !== undefined) {
      return rawDetails;
    }

    const rawMessage = rawResponse['message'];

    if (Array.isArray(rawMessage)) {
      return rawMessage;
    }

    return undefined;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private writeErrorLog(normalizedError: NormalizedError, request: MaybeRequestWithContext): void {
    const payload: Record<string, unknown> = {
      method: request.method,
      path: request.originalUrl,
      statusCode: normalizedError.statusCode,
      message: normalizedError.message,
    };

    if (normalizedError.code !== undefined) {
      payload['code'] = normalizedError.code;
    }

    if (request.context?.requestId) {
      payload['requestId'] = request.context.requestId;
    }

    if (request.context?.deviceId) {
      payload['deviceId'] = request.context.deviceId;
    }

    if (request.context?.sessionId) {
      payload['sessionId'] = request.context.sessionId;
    }

    if (request.context?.user?.id) {
      payload['userId'] = request.context.user.id;
    }

    if (request.context?.user?.roles) {
      payload['userRoles'] = request.context.user.roles;
    }

    if (normalizedError.stack) {
      payload['stack'] = normalizedError.stack;
    }

    if (normalizedError.statusCode >= 500) {
      this.logger.error('request failed', payload);
      return;
    }

    this.logger.warn('request rejected', payload);
  }
  private buildResponseBody(
    normalizedError: NormalizedError,
    request: MaybeRequestWithContext,
  ): ErrorResponseBody {
    const body: ErrorResponseBody = {
      success: false,
      error: {
        statusCode: normalizedError.statusCode,
        code: normalizedError.code,
        message: normalizedError.message,
      },
      meta: {
        path: request.originalUrl,
        timestamp: new Date().toISOString(),
      },
    };

    if (normalizedError.details !== undefined) {
      body.error.details = normalizedError.details;
    }

    if (request.context?.requestId) {
      body.meta.requestId = request.context.requestId;
    }

    return body;
  }
}
