import { request } from '@/utils/request';
import { getMenu } from './api';

vi.mock('@/utils/request', () => ({
  request: {
    get: vi.fn(),
  },
}));

describe('getMenu', () => {
  test('returns menu data on success', async () => {
    const menu = [{ name: 'Home', url: '/' }];
    (request.get as ReturnType<typeof vi.fn>).mockResolvedValue({ data: menu });

    const result = await getMenu();
    expect(result).toEqual(menu);
    expect(request.get).toHaveBeenCalledWith('/ui/menu');
  });

  test('returns empty array on error', async () => {
    (request.get as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('fail'));

    const result = await getMenu();
    expect(result).toEqual([]);
  });
});
