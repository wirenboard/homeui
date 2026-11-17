// @vitest-environment happy-dom
import { ApiError, ErrorCode, request } from './request';

describe('ApiError', () => {
  test('creates error with all fields', () => {
    const err = new ApiError({
      message: 'bad response',
      status: 502,
      code: ErrorCode.HTMLResponse,
      data: 'payload',
      url: '/api/test',
    });
    expect(err.message).toBe('bad response');
    expect(err.status).toBe(502);
    expect(err.code).toBe(ErrorCode.HTMLResponse);
    expect(err.data).toBe('payload');
    expect(err.url).toBe('/api/test');
    expect(err.name).toBe('ApiError');
    expect(err).toBeInstanceOf(Error);
  });

  test('creates error with partial fields', () => {
    const err = new ApiError({ message: 'oops' });
    expect(err.message).toBe('oops');
    expect(err.status).toBeUndefined();
  });
});

describe('ErrorCode', () => {
  test('has HTMLResponse value', () => {
    expect(ErrorCode.HTMLResponse).toBe('ERR_HTML_RESPONSE');
  });
});

describe('response interceptor', () => {
  test('passes through JSON responses', async () => {
    const handler = (request.interceptors.response as any).handlers[0];
    const response = {
      headers: { 'content-type': 'application/json' },
      config: { url: '/api/test' },
      data: { ok: true },
    };
    const result = handler.fulfilled(response);
    expect(result).toBe(response);
  });

  test('throws ApiError for HTML responses', () => {
    const handler = (request.interceptors.response as any).handlers[0];
    const response = {
      headers: { 'content-type': 'text/html; charset=utf-8' },
      config: { url: '/api/broken' },
      data: '<html></html>',
    };
    expect(() => handler.fulfilled(response)).toThrow(ApiError);
    try {
      handler.fulfilled(response);
    } catch (err) {
      expect(err.status).toBe(502);
      expect(err.code).toBe(ErrorCode.HTMLResponse);
      expect(err.url).toBe('/api/broken');
    }
  });

  test('passes through response without content-type', () => {
    const handler = (request.interceptors.response as any).handlers[0];
    const response = {
      headers: {},
      config: { url: '/api/test' },
      data: 'ok',
    };
    expect(handler.fulfilled(response)).toBe(response);
  });
});
