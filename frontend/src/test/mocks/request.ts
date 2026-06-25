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
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
  interceptors: {
    response: { use: vi.fn() },
    request: { use: vi.fn() },
  },
};

export { requestMock as request };
