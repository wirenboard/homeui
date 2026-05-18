import { type CustomMenuItem } from '@/stores/ui/types';
import { request } from '@/utils/request';

export const getMenu = async () => request.get<CustomMenuItem[]>('/ui/menu')
  .then(({ data }) => data)
  .catch(() => []);
