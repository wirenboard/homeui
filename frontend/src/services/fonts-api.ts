import type { Font } from '@/stores/fonts/types';
import { request } from '@/utils/request';

export const fontsApi = {
  getFonts: () => request.get<Font[]>('/api/fonts').then(({ data }) => data),
  deleteFont: (name: string) => request.delete(`/api/fonts/${encodeURIComponent(name)}`),
};
