import axios from 'axios';

export const request = axios.create({
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Accept-Language': localStorage.getItem('language') || 'ru',
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

export enum ErrorCode {
  HTMLResponse = 'ERR_HTML_RESPONSE',
}

export class ApiError extends Error {
  public name = 'ApiError';
  public status: number;
  public code: ErrorCode;
  public data?: any;
  public url: string;

  constructor({ message, status, code, data, url }: Partial<ApiError>) {
    super(message);
    this.status = status;
    this.code = code;
    this.data = data;
    this.url = url;
  }
}

request.interceptors.response.use(
  (response) => {
    const contentType = response.headers['content-type'];
    if (contentType && contentType.includes('text/html')) {
      throw new ApiError({
        message: `"${response.config.url}" wrong response type`,
        status: 502,
        code: ErrorCode.HTMLResponse,
        url: response.config.url,
        data: '',
      });
    }

    return response;
  }
);
