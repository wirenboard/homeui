import { request } from '@/utils/request';

const WIRENBOARD_DNS_POSTFIX = 'ip.wirenboard.com';

export enum CertificateStatus {
  VALID = 'valid',
  REQUESTING = 'requesting',
  UNAVAILABLE = 'unavailable',
}

export enum ReleaseSuite {
  Stable = 'stable',
  Testing = 'testing',
}

export interface DeviceInfo {
  sn: string;
  ip: string;
  https_cert: CertificateStatus;
  release_suite: ReleaseSuite;
  release_name: string;
  rootfs_expanded: boolean;
}

export interface HttpsStatus {
  enabled: boolean;
}

function isIp(host: string) {
  const ipComponents = host.split('.');
  if (ipComponents.length !== 4) {
    return false;
  }
  return ipComponents.every((num) => {
    const parsed = parseInt(num, 10);
    return !isNaN(parsed) && parsed >= 0 && parsed <= 255;
  });
}

function isLocalDomain(host: string) {
  return host.endsWith('.local');
}

function isDeviceSn(sn: string) {
  return /^[A-Z0-9]+$/.test(sn);
}

export function makeHttpsUrlOrigin(deviceInfo: DeviceInfo) {
  const ip = getIpForHttpsDomainName(location.hostname, deviceInfo.ip);
  if (!ip) {
    return '';
  }
  const ipPrefix = ip.replace(/\./g, '-');
  return `https://${ipPrefix}.${deviceInfo.sn.toLowerCase()}.${WIRENBOARD_DNS_POSTFIX}`;
}

function getIpForHttpsDomainName(hostname: string, deviceIp: string): string | null {
  if (isIp(hostname)) {
    return hostname;
  }
  return isIp(deviceIp) ? deviceIp : null;
}

const requestHttpsCert = async () =>
  request.post<undefined>('/api/https/request_cert');

export const getDeviceInfo = async () =>
  request.get<DeviceInfo>('/device/info').then(({ data }) => data);

async function waitCertificate(): Promise<string> {
  const MAX_WAIT_TIME = 120000; // 2 minutes
  const CHECK_INTERVAL = 1000; // 1 second
  const startTime = Date.now();
  while (Date.now() - startTime < MAX_WAIT_TIME) {
    await new Promise((resolve) => setTimeout(resolve, CHECK_INTERVAL));
    try {
      const { https_cert: httpsCert } = await getDeviceInfo();
      const certStatus = httpsCert || CertificateStatus.UNAVAILABLE;
      if (certStatus !== CertificateStatus.REQUESTING) {
        return certStatus;
      }
    } catch (e) {
      // Ignore errors and retry
    }
  }
  return CertificateStatus.UNAVAILABLE;
}

async function hasInvalidCertificate(certStatus: string): Promise<boolean> {
  if (certStatus === CertificateStatus.VALID) {
    return false;
  }
  if (certStatus === CertificateStatus.REQUESTING) {
    const newCertStatus = await waitCertificate();
    return (newCertStatus !== CertificateStatus.VALID);
  }
  try {
    await requestHttpsCert();
    const newCertStatus = await waitCertificate();
    return (newCertStatus !== CertificateStatus.VALID);
  } catch (e) {
    // Ignore errors
  }
  return true;
}

export const isHttpsEnabled = async (): Promise<boolean> => {
  return request.get<HttpsStatus>('/api/https').then(({ data }) => data.enabled);
};

export const setupHttps = async (enable: boolean) =>
  request.patch<undefined>('/api/https', { enabled: enable });

export function urlIsSwitchableToHttps(): boolean {
  const host = location.hostname;
  return isIp(host) || isLocalDomain(host);
}

/**
 * Looks for a device this site can be switched to over HTTPS.
 *
 * There is nothing to switch to, and null is returned, when:
 * - we already speak HTTPS, or the hostname is localhost / 127.0.0.1;
 * - the hostname is neither an IP address nor a local domain;
 * - HTTPS is disabled on the device;
 * - the device does not answer /device/info or reports no sane serial number.
 *
 * Otherwise the device is returned, and its certificate state tells whether the
 * switch can happen right away — see switchToHttps().
 */
export async function findHttpsRedirectTarget(): Promise<DeviceInfo | null> {
  if (location.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(location.hostname)) {
    return null;
  }

  // Free and local, so it goes before the request — on a DNS hostname we ask the device nothing
  if (!urlIsSwitchableToHttps()) {
    return null;
  }

  if (!await isHttpsEnabled()) {
    return null;
  }

  try {
    const deviceInfo = await getDeviceInfo();
    return isDeviceSn(deviceInfo.sn) ? deviceInfo : null;
  } catch (e) {
    return null;
  }
}

/**
 * Redirects the browser to the HTTPS site, preferring the domain the certificate is issued for.
 *
 * @returns true when a redirect was started, false when we have to stay on http.
 */
export async function switchToHttps(deviceInfo: DeviceInfo): Promise<boolean> {
  if (await hasInvalidCertificate(deviceInfo.https_cert)) {
    return false;
  }

  const originalPathname = location.pathname;
  const originalHash = location.hash;

  const httpsUrlOrigin = makeHttpsUrlOrigin(deviceInfo);
  if (httpsUrlOrigin) {
    try {
      let response = await fetch(`${httpsUrlOrigin}/device/info`, {
        method: 'GET',
        mode: 'cors',
      });
      if (response.status === 200) {
        const httpsDeviceInfo = await response.json();
        if (httpsDeviceInfo.sn === deviceInfo.sn) {
          location.href = `${httpsUrlOrigin}${originalPathname}${originalHash}`;
          return true;
        }
        return false;
      }
    } catch (e) {
    }
  }

  // HTTPS certificate is valid, but the device is not reachable via special crafted URL
  // Redirect using original URL
  location.href = `https://${location.hostname}${originalPathname}${originalHash}`;
  return true;
}

export const getHttpsCertificateStatus = async (): Promise<CertificateStatus> => {
  const { https_cert: httpsCert } = await getDeviceInfo();
  return httpsCert;
};
