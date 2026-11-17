// @vitest-environment happy-dom
import { requestMock } from '@/test/mocks/request';
import { CertificateStatus, type DeviceInfo, findHttpsRedirectTarget, switchToHttps } from './https-utils';

vi.mock('@/utils/request', () => import('@/test/mocks/request'));

const device: DeviceInfo = {
  sn: 'AQC4C7XN',
  ip: '192.168.1.10',
  https_cert: CertificateStatus.VALID,
  release_suite: 'stable',
  release_name: 'wb-2404',
  rootfs_expanded: true,
} as DeviceInfo;

// The dashed-IP domain the wildcard certificate is issued for
const certificateOrigin = 'https://192-168-1-10.aqc4c7xn.ip.wirenboard.com';

const setLocation = (href: string) => {
  const { protocol, hostname, pathname, hash } = new URL(href);
  vi.spyOn(window, 'location', 'get').mockReturnValue({
    protocol, hostname, pathname, hash, href,
  } as Location);
};

const answerWith = (responses: { https?: unknown; deviceInfo?: unknown }) => {
  requestMock.get.mockImplementation((url: string) => {
    if (url === '/api/https') {
      return responses.https instanceof Error
        ? Promise.reject(responses.https)
        : Promise.resolve({ data: responses.https });
    }
    return responses.deviceInfo instanceof Error
      ? Promise.reject(responses.deviceInfo)
      : Promise.resolve({ data: responses.deviceInfo });
  });
};

describe('findHttpsRedirectTarget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    answerWith({ https: { enabled: true }, deviceInfo: device });
  });

  it('finds the device when an IP address is opened over http and HTTPS is enabled', async () => {
    setLocation('http://192.168.1.10/');

    await expect(findHttpsRedirectTarget()).resolves.toEqual(device);
  });

  it('finds the device when a .local domain is opened', async () => {
    setLocation('http://wirenboard-aqc4c7xn.local/');

    await expect(findHttpsRedirectTarget()).resolves.toEqual(device);
  });

  it('has nothing to switch to when the page already speaks HTTPS', async () => {
    setLocation('https://192.168.1.10/');

    await expect(findHttpsRedirectTarget()).resolves.toBeNull();
    expect(requestMock.get).not.toHaveBeenCalled();
  });

  it.each(['http://localhost:8080/', 'http://127.0.0.1:8080/'])('stays on the dev host %s', async (href) => {
    setLocation(href);

    await expect(findHttpsRedirectTarget()).resolves.toBeNull();
    expect(requestMock.get).not.toHaveBeenCalled();
  });

  it('asks the device nothing when the hostname is neither an IP address nor a local domain', async () => {
    setLocation('http://controller.example.com/');

    await expect(findHttpsRedirectTarget()).resolves.toBeNull();
    expect(requestMock.get).not.toHaveBeenCalled();
  });

  it('has nothing to switch to when HTTPS is disabled on the device', async () => {
    setLocation('http://192.168.1.10/');
    answerWith({ https: { enabled: false }, deviceInfo: device });

    await expect(findHttpsRedirectTarget()).resolves.toBeNull();
  });

  it('has nothing to switch to when the device does not answer /device/info', async () => {
    setLocation('http://192.168.1.10/');
    answerWith({ https: { enabled: true }, deviceInfo: new Error('unreachable') });

    await expect(findHttpsRedirectTarget()).resolves.toBeNull();
  });

  it('has nothing to switch to when the answer carries no sane serial number', async () => {
    setLocation('http://192.168.1.10/');
    answerWith({ https: { enabled: true }, deviceInfo: { ...device, sn: 'not a serial!' } });

    await expect(findHttpsRedirectTarget()).resolves.toBeNull();
  });

  it('rejects when the HTTPS status request itself fails, leaving the decision to the caller', async () => {
    setLocation('http://192.168.1.10/');
    answerWith({ https: new Error('gateway is down'), deviceInfo: device });

    await expect(findHttpsRedirectTarget()).rejects.toThrow('gateway is down');
  });
});

describe('switchToHttps', () => {
  const setHref = vi.fn();
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(window, 'location', 'get').mockReturnValue({
      protocol: 'http:',
      hostname: '192.168.1.10',
      pathname: '/',
      hash: '#/dashboards',
      set href(value: string) {
        setHref(value);
      },
    } as unknown as Location);
  });

  it('redirects to the certificate domain when the device answers there as itself', async () => {
    fetchMock.mockResolvedValue({ status: 200, json: async () => ({ sn: device.sn }) });

    await expect(switchToHttps(device)).resolves.toBe(true);
    expect(setHref).toHaveBeenCalledWith(`${certificateOrigin}/#/dashboards`);
  });

  it('falls back to the current hostname when the certificate domain is unreachable', async () => {
    fetchMock.mockRejectedValue(new Error('no dns'));

    await expect(switchToHttps(device)).resolves.toBe(true);
    expect(setHref).toHaveBeenCalledWith('https://192.168.1.10/#/dashboards');
  });

  it('stays on http when the certificate domain leads to another device, as the routing is broken', async () => {
    fetchMock.mockResolvedValue({ status: 200, json: async () => ({ sn: 'SOMEONEELSE' }) });

    await expect(switchToHttps(device)).resolves.toBe(false);
    expect(setHref).not.toHaveBeenCalled();
  });

  it('stays on http only when no certificate can be issued for the device', async () => {
    requestMock.post.mockRejectedValue(new Error('no internet'));

    await expect(switchToHttps({ ...device, https_cert: CertificateStatus.UNAVAILABLE })).resolves.toBe(false);
    expect(requestMock.post).toHaveBeenCalledWith('/api/https/request_cert');
    expect(setHref).not.toHaveBeenCalled();
  });
});
