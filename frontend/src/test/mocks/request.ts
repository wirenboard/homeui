import type { Mock } from 'vitest';

export enum ErrorCode {
  HTMLResponse = 'ERR_HTML_RESPONSE',
}

export class ApiError extends Error {
  name = 'ApiError';
  status?: number;
  code?: ErrorCode;
  data?: any;
  url?: string;

  constructor({ message, status, code, data, url }: {
    message?: string;
    status?: number;
    code?: ErrorCode;
    data?: any;
    url?: string;
  }) {
    super(message);
    this.status = status;
    this.code = code;
    this.data = data;
    this.url = url;
  }
}

export const requestMock = {
  get: vi.fn() as Mock,
  post: vi.fn() as Mock,
  patch: vi.fn() as Mock,
  delete: vi.fn() as Mock,
  interceptors: {
    response: { use: vi.fn() as Mock },
    request: { use: vi.fn() as Mock },
  },
};

export { requestMock as request };
