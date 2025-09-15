import { request } from '@/utils/request';
import { HttpsStatus } from './types';

export const isHttpsEnabled = async () => request<HttpsStatus>(
  '/api/https'
);

export const disableHttps = async () => {
  try {
    await request<null>('/api/https', { method: 'PATCH', body: { enabled: false } });
  } catch (SyntaxError) {
    // empty response is expected
  }
  return;
};

export const enableHttps = async () => {
  try {
    await request<null>('/api/https', { method: 'PATCH', body: { enabled: true } });
  } catch (SyntaxError) {
    // empty response is expected
  }
  return;
};
