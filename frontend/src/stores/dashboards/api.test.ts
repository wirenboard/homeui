import { request } from '@/utils/request';
import { dashboardsApi } from './api';

vi.mock('@/utils/request', () => ({
  request: {
    get: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const getMock = request.get as ReturnType<typeof vi.fn>;
const putMock = request.put as ReturnType<typeof vi.fn>;
const patchMock = request.patch as ReturnType<typeof vi.fn>;
const deleteMock = request.delete as ReturnType<typeof vi.fn>;

describe('dashboardsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('getDashboards returns the config object from the response body', async () => {
    const config = { dashboards: [], widgets: [], defaultDashboardId: 'd1' };
    getMock.mockResolvedValue({ data: config });

    const result = await dashboardsApi.getDashboards();

    expect(getMock).toHaveBeenCalledWith('/api/dashboards');
    expect(result).toBe(config);
  });

  test('getDashboardSvg requests text and encodes the id in the path', async () => {
    getMock.mockResolvedValue({ data: '<svg/>' });

    const result = await dashboardsApi.getDashboardSvg('a b/c');

    expect(getMock).toHaveBeenCalledWith('/api/dashboards/a%20b%2Fc/svg', { responseType: 'text' });
    expect(result).toBe('<svg/>');
  });

  test('saveDashboards PUTs the config and resolves to undefined', async () => {
    putMock.mockResolvedValue({});
    const config = { dashboards: [], widgets: [], defaultDashboardId: 'd1' };

    const result = await dashboardsApi.saveDashboards(config as any);

    expect(putMock).toHaveBeenCalledWith('/api/dashboards', config);
    expect(result).toBeUndefined();
  });

  test('putDashboard PUTs the whole dashboard body to the encoded id path', async () => {
    putMock.mockResolvedValue({});
    const dashboard = { id: 'a b/c', name: 'My SVG', isSvg: true, svg: { current: '<svg/>' } };

    const result = await dashboardsApi.putDashboard('a b/c', dashboard as any);

    expect(putMock).toHaveBeenCalledWith('/api/dashboards/a%20b%2Fc', dashboard);
    expect(result).toBeUndefined();
  });

  test('patchDashboard PATCHes the subset to the encoded id path', async () => {
    patchMock.mockResolvedValue({});
    const patch = { options: { isHidden: true } };

    const result = await dashboardsApi.patchDashboard('a b/c', patch as any);

    expect(patchMock).toHaveBeenCalledWith('/api/dashboards/a%20b%2Fc', patch);
    expect(result).toBeUndefined();
  });

  test('deleteDashboard DELETEs the encoded id path', async () => {
    deleteMock.mockResolvedValue({});

    const result = await dashboardsApi.deleteDashboard('a b/c');

    expect(deleteMock).toHaveBeenCalledWith('/api/dashboards/a%20b%2Fc');
    expect(result).toBeUndefined();
  });
});
