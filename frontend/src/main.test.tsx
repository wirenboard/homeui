// @vitest-environment happy-dom
import type * as ReactRouterDom from 'react-router-dom';
import { HttpsSetupPhase } from '@/stores/ui';
import * as HttpsUtils from '@/utils/https-utils';

const { CertificateStatus, findHttpsRedirectTarget, switchToHttps } = HttpsUtils;

vi.mock('@/utils/https-utils', async (importOriginal) => ({
  ...await importOriginal<typeof HttpsUtils>(),
  findHttpsRedirectTarget: vi.fn(),
  switchToHttps: vi.fn(),
}));
vi.mock('@/common/constants', () => ({ APP_NAME: 'TestApp', APP_SHORT_NAME: 'Test', LOGO: '/logo.png' }));

// Only the boot order is under test here, so the heavy parts of the graph are cut away, and the app
// never finishes connecting — otherwise the boot loads dashboards behind the tests
vi.mock('@/router/routes', () => ({ routes: [] }));
vi.mock('@/services', async () => {
  const services = await import('@/test/mocks/services');
  return { ...services, mqttClient: { ...services.mqttClient, whenConnected: () => new Promise(() => {}) } };
});
// These stores only act after MQTT connects, which never happens here, but importing them pulls in
// json-schema-editor, the console panel and xterm — most of the boot cost each test pays
vi.mock('@/components/terminal', () => ({ registerTerminalTab: vi.fn() }));
vi.mock('@/stores/dali', () => ({ daliGlobalStore: { refresh: vi.fn(() => Promise.resolve()) } }));
vi.mock('@/stores/rules', () => ({
  registerRulesTab: vi.fn(),
  rulesStore: { subscribeRulesLogs: vi.fn(), subscribeRuleDebugging: vi.fn() },
}));

const renderMock = vi.fn();
vi.mock('react-dom/client', () => ({ createRoot: () => ({ render: renderMock }) }));

const createHashRouterMock = vi.fn(() => ({ id: 'router' }));
vi.mock('react-router-dom', async (importOriginal) => ({
  ...await importOriginal<typeof ReactRouterDom>(),
  createHashRouter: createHashRouterMock,
  RouterProvider: () => null,
}));

type PageShowListener = (event: Event) => void;

// The router must not exist while the HTTPS switch is deciding: createHashRouter() initialises the
// router immediately, which runs authGuard and checks the session cookie of the host we may leave.
describe('bootstrap: router creation is gated by the HTTPS switch', () => {
  const findTargetMock = vi.mocked(findHttpsRedirectTarget);
  const switchToHttpsMock = vi.mocked(switchToHttps);
  const device = { sn: 'AQC4C7XN', https_cert: CertificateStatus.VALID } as HttpsUtils.DeviceInfo;

  // Every boot re-imports the app, so the ui store comes from that same fresh module graph
  const boot = async () => {
    await import('@/main');
    const { uiStore } = await import('@/stores/ui');
    return uiStore;
  };

  const lastRenderedRouter = () => renderMock.mock.lastCall?.[0]?.props?.router;

  const stubReload = () => {
    const reload = vi.fn();
    vi.spyOn(window, 'location', 'get').mockReturnValue({ ...window.location, reload } as Location);
    return reload;
  };

  // Every boot leaves its pageshow listener on the window shared by the whole file — drop the stale
  // ones, or they answer events meant for this test
  const pageShowListeners: PageShowListener[] = [];
  const addEventListener = window.addEventListener.bind(window);

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    switchToHttpsMock.mockResolvedValue(true);
    pageShowListeners.splice(0).forEach((listener) => window.removeEventListener('pageshow', listener));
    vi.spyOn(window, 'addEventListener').mockImplementation((type, listener, options) => {
      if (type === 'pageshow') {
        pageShowListeners.push(listener as PageShowListener);
      }
      addEventListener(type, listener as PageShowListener, options);
    });
  });

  it('renders the loader without a router while the device is being looked up', async () => {
    findTargetMock.mockReturnValue(new Promise(() => {}));

    const uiStore = await boot();

    expect(createHashRouterMock).not.toHaveBeenCalled();
    expect(renderMock).toHaveBeenCalledTimes(1);
    expect(lastRenderedRouter()).toBeUndefined();
    expect(uiStore.httpsSetupPhase).toBe(HttpsSetupPhase.Checking);
  });

  it('creates the router when there is no device to switch to', async () => {
    findTargetMock.mockResolvedValue(null);

    const uiStore = await boot();

    await vi.waitFor(() => expect(createHashRouterMock).toHaveBeenCalledTimes(1));
    expect(switchToHttpsMock).not.toHaveBeenCalled();
    expect(lastRenderedRouter()).toEqual({ id: 'router' });
    expect(uiStore.httpsSetupPhase).toBe(HttpsSetupPhase.Done);
  });

  it('never creates the router when a redirect to another host has started', async () => {
    findTargetMock.mockResolvedValue(device);

    const uiStore = await boot();

    await vi.waitFor(() => expect(switchToHttpsMock).toHaveBeenCalledWith(device));
    expect(createHashRouterMock).not.toHaveBeenCalled();
    expect(renderMock).toHaveBeenCalledTimes(1);
    expect(uiStore.httpsSetupPhase).toBe(HttpsSetupPhase.Checking);
  });

  it('names the HTTPS setup in the loader while a certificate is being issued', async () => {
    findTargetMock.mockResolvedValue({ ...device, https_cert: CertificateStatus.REQUESTING });
    switchToHttpsMock.mockReturnValue(new Promise(() => {}));

    const uiStore = await boot();

    await vi.waitFor(() => expect(uiStore.httpsSetupPhase).toBe(HttpsSetupPhase.IssuingCertificate));
    expect(createHashRouterMock).not.toHaveBeenCalled();
  });

  it('creates the router when the switch gives up, e.g. no certificate was issued', async () => {
    findTargetMock.mockResolvedValue({ ...device, https_cert: CertificateStatus.UNAVAILABLE });
    switchToHttpsMock.mockResolvedValue(false);

    const uiStore = await boot();

    await vi.waitFor(() => expect(createHashRouterMock).toHaveBeenCalledTimes(1));
    expect(lastRenderedRouter()).toEqual({ id: 'router' });
    expect(uiStore.httpsSetupPhase).toBe(HttpsSetupPhase.Done);
  });

  it('starts the switch over when the page comes back from the bfcache mid-redirect', async () => {
    const reload = stubReload();
    findTargetMock.mockResolvedValue(device);

    await boot();
    await vi.waitFor(() => expect(switchToHttpsMock).toHaveBeenCalled());
    // Say the browser refused the certificate and the user pressed Back
    window.dispatchEvent(Object.assign(new Event('pageshow'), { persisted: true }));

    expect(reload).toHaveBeenCalled();
    expect(createHashRouterMock).not.toHaveBeenCalled();
  });

  it('leaves a page that stayed here for good alone when it comes back from the bfcache', async () => {
    const reload = stubReload();
    findTargetMock.mockResolvedValue(null);

    await boot();
    await vi.waitFor(() => expect(createHashRouterMock).toHaveBeenCalledTimes(1));
    window.dispatchEvent(Object.assign(new Event('pageshow'), { persisted: true }));

    expect(reload).not.toHaveBeenCalled();
  });

  it('ignores an ordinary page load, which fires pageshow without persisted', async () => {
    const reload = stubReload();
    findTargetMock.mockReturnValue(new Promise(() => {}));

    await boot();
    window.dispatchEvent(new Event('pageshow'));

    expect(reload).not.toHaveBeenCalled();
  });

  it('creates the router when looking the device up fails', async () => {
    findTargetMock.mockRejectedValue(new Error('device info is unreachable'));

    const uiStore = await boot();

    await vi.waitFor(() => expect(createHashRouterMock).toHaveBeenCalledTimes(1));
    expect(uiStore.httpsSetupPhase).toBe(HttpsSetupPhase.Done);
  });
});
