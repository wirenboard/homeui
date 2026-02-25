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

interface DeviceInfo {
  sn: string;
  ip: string;
  https_cert: CertificateStatus;
  release_suite: ReleaseSuite;
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
  const ip = getIpForHttpsDomainName(window.location.hostname, deviceInfo.ip);
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
      // eslint-disable-next-line typescript/naming-convention
      const { https_cert } = await getDeviceInfo();
      const certStatus = https_cert || CertificateStatus.UNAVAILABLE;
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
  const host = window.location.hostname;
  return isIp(host) || isLocalDomain(host);
}

/**
 * Checks the current protocol and attempts to redirect to an HTTPS version of the site if applicable.
 *
 * If the current protocol is HTTPS or the hostname is a localhost or 127.0.0.1, the function returns false.
 * If the hostname is an IP address or a local domain, it fetches device information using both HTTP and HTTPS.
 * If the device information matches and certificate is valid, it redirects the browser to the HTTPS URL.
 *
 * @returns {Promise<boolean>} - A promise that resolves to true if a redirect to HTTPS was initiated, otherwise false.
 */
export async function switchToHttps() {
  if (window.location.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(window.location.hostname)) {
    return false;
  }

  if (!await isHttpsEnabled()) {
    return false;
  }

  if (!urlIsSwitchableToHttps()) {
    return false;
  }

  let deviceInfo : DeviceInfo;
  try {
    deviceInfo = await getDeviceInfo();
    if (!isDeviceSn(deviceInfo.sn)) {
      return false;
    }
  } catch (e) {
    return false;
  }

  if (await hasInvalidCertificate(deviceInfo.https_cert)) {
    return false;
  }

  const originalPathname = window.location.pathname;
  const originalHash = window.location.hash;

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
          window.location.href = `${httpsUrlOrigin}${originalPathname}${originalHash}`;
          return true;
        }
        return false;
      }
    } catch (e) {
    }
  }

  // HTTPS certificate is valid, but the device is not reachable via special crafted URL
  // Redirect using original URL
  window.location.href = `https://${window.location.hostname}${originalPathname}${originalHash}`;
  return true;
}

export const getHttpsCertificateStatus = async (): Promise<CertificateStatus> => {
  // eslint-disable-next-line typescript/naming-convention
  const { https_cert } = await getDeviceInfo();
  return https_cert;
};
