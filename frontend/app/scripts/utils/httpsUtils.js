const WIRENBOARD_DNS_POSTFIX = 'ip.wirenboard.com';

const CertificateStatus = Object.freeze({
  VALID: 'valid',
  REQUESTING: 'requesting',
  UNAVAILABLE: 'unavailable'
});

function isIp(host) {
  const ipComponents = host.split('.');
  if (ipComponents.length !== 4) {
    return false;
  }
  return ipComponents.every(num => {
    const parsed = parseInt(num, 10);
    return !isNaN(parsed) && parsed >= 0 && parsed <= 255;
  });
}

function isLocalDomain(host) {
  return host.endsWith('.local');
}

function isDeviceSn(sn) {
  return /^[A-Z0-9]+$/.test(sn);
}

function makeHttpsUrlOrigin(ip, sn) {
  const ipPrefix = ip.replace(/\./g, '-');
  return `https://${ipPrefix}.${sn.toLowerCase()}.${WIRENBOARD_DNS_POSTFIX}`;
}

function getIpForHttpsDomainName(hostname, deviceIp) {
  if (isIp(hostname)) {
    return hostname;
  }
  return isIp(deviceIp) ? deviceIp : null;
}

async function waitCertificate() {
  const MAX_WAIT_TIME = 120000; // 2 minutes
  const CHECK_INTERVAL = 1000; // 1 second
  const startTime = Date.now();
  while (Date.now() - startTime < MAX_WAIT_TIME) {
    await new Promise(resolve => setTimeout(resolve, CHECK_INTERVAL));
    try {
      const response = await fetch('/device/info', { method: 'GET' });
      if (response.status === 200) {
        const deviceInfo = await response.json();
        const certStatus = deviceInfo.https_cert || CertificateStatus.UNAVAILABLE;
        if (certStatus !== CertificateStatus.REQUESTING) {
          return certStatus;
        }
      }
    } catch (e) {
      // Ignore errors and retry
    }
  }
  return CertificateStatus.UNAVAILABLE;
}

async function hasInvalidCertificate(certStatus) {
  if (certStatus === CertificateStatus.VALID) {
    return false;
  }
  if (certStatus === CertificateStatus.REQUESTING) {
    certStatus = await waitCertificate();
    return (certStatus !== CertificateStatus.VALID)
  }
  try {
    const response = await fetch('/api/https/setup', { method: 'POST' });
    if (response.status === 200) {
      certStatus = await waitCertificate();
      return (certStatus !== CertificateStatus.VALID);
    }
  } catch (e) {
    // Ignore errors
  }
  return true;
}

/**
 * Checks the current protocol and attempts to redirect to an HTTPS version of the site if applicable.
 *
 * If the current protocol is HTTPS or the hostname is a local domain, the function returns 'ok'.
 * If the hostname is an IP address or a local domain, it fetches device information using both HTTP and HTTPS.
 * If the device information matches, it redirects the browser to the HTTPS URL.
 * 
 * @async
 * @function
 * @returns {Promise<string>} A promise that resolves to one of the following:
 * - 'ok': If the current protocol is HTTPS.
 * - 'warn': If validation fails or HTTPS redirection is not possible.
 * - 'redirected': If the browser is redirected to an HTTPS URL.
 */
export async function checkHttps() {
  if (window.location.protocol === 'https:' ||
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1') {
    return 'ok';
  }

  const host = window.location.hostname;
  if (!isIp(host) && !isLocalDomain(host)) {
    return 'warn';
  }

  let deviceInfo;
  try {
    let response = await fetch('/device/info');
    if (response.status !== 200) {
      return 'warn';
    }
    deviceInfo = await response.json();
    if (!isDeviceSn(deviceInfo.sn)) {
      return 'warn';
    }
  } catch (e) {
    return 'warn';
  }

  if (await hasInvalidCertificate(deviceInfo.https_cert)) {
    return 'warn';
  }

  const ip = getIpForHttpsDomainName(window.location.hostname, deviceInfo.ip);
  if (ip) {
    const httpsUrlOrigin = makeHttpsUrlOrigin(ip, deviceInfo.sn);
    try {
      let response = await fetch(`${httpsUrlOrigin}/device/info`, {
        method: 'GET',
        mode: 'cors',
      });
      if (response.status === 200) {
        const httpsDeviceInfo = await response.json();
        if (httpsDeviceInfo.sn === deviceInfo.sn) {
          window.location.href = httpsUrlOrigin;
          return 'redirected';
        }
        return 'warn';
      }
    } catch (e) {
    }
  }

  // HTTPS certificate is valid, but the device is not reachable via special crafted URL
  // Redirect using original URL
  window.location.href = `https://${host}${window.location.pathname}`;
  return 'redirected';
}
