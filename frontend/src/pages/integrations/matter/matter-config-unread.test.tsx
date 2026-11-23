// @vitest-environment happy-dom
import { runInAction } from 'mobx';
import en from '@/i18n/locales/en.json';
import ru from '@/i18n/locales/ru.json';
import { authStore } from '@/stores/auth';
import { matterStore } from '@/stores/matter';
import { getMatterStatus } from '@/stores/matter/api';
import { render, screen } from '@/test/render';
import MatterPage from './matter';

const { uiMock } = vi.hoisted(() => ({
  uiMock: { modules: ['matter'], menuItems: [{ id: 'integrations' }] },
}));

vi.mock('@/stores/ui', () => ({ uiStore: uiMock }));
vi.mock('@/stores/auth', () => import('@/test/mocks/auth-store'));
vi.mock('@/layouts/page', () => import('@/test/mocks/page-layout'));
vi.mock('@/stores/matter/api', async (importOriginal) => ({
  ...await importOriginal() as Record<string, unknown>,
  getMatterStatus: vi.fn(),
}));

const CONFIG_ERROR = 'cannot parse /var/lib/wb-converter-ext/devices.yaml: bad indentation';

const WAITING = {
  version: '1.0.1',
  paired: true,
  fabrics: [{ index: 1, adminFabricLabel: 'Aqara', vendor_id: 4447 }],
  pairing: null,
  network_error: {
    code: 'config_unread',
    reason: 'the bridge stays off the network until the device config can be read',
    detail: CONFIG_ERROR,
  },
  broker_error: null,
  devices: { configured: 0, exposed: 0, skipped: 0, config_error: CONFIG_ERROR, list: [] },
};

const problems = () => screen.queryAllByTestId('page-error').map((element) => element.textContent);

/**
 * A bridge that starts with a device config it cannot read stays off the network: online
 * with no devices it would tell every app that they are gone. The page is the only place
 * a person learns why the apps say "offline", so it says it in its own words and not in
 * the English sentence of the service.
 */
describe('MatterPage, a bridge that waits for a device config it can read', () => {
  beforeEach(() => {
    vi.mocked(authStore.hasRights).mockReturnValue(true);
    vi.mocked(getMatterStatus).mockReset();
    runInAction(() => {
      matterStore.status = null;
      matterStore.isLoading = true;
      matterStore.isUnreachable = false;
    });
  });

  afterEach(() => {
    matterStore.stopWatching();
  });

  it('says it is off the network in its own words, and what is wrong with the config beside it', async () => {
    vi.mocked(getMatterStatus).mockResolvedValue(WAITING as any);
    render(<MatterPage />);

    await screen.findByText('Aqara');
    expect(problems()).toEqual(['matter.labels.network-config_unread', 'matter.labels.config-error']);
  });

  it('has the words in both languages, and they say what to do', () => {
    expect(ru.matter.labels['network-config_unread']).toMatch(/конфиг/);
    expect(ru.matter.labels['network-config_unread']).toMatch(/сам/);
    expect(en.matter.labels['network-config_unread']).toMatch(/config/);
    expect(en.matter.labels['network-config_unread']).toMatch(/by itself/);
  });
});
