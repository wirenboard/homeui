const WIRENBOARD_DNS_POSTFIX = 'ip.wirenboard.com';

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

/**
 * Checks the current protocol and attempts to redirect to an HTTPS version of the site if applicable.
 * 
 * If the current protocol is HTTPS, the function returns 'ok'.
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
  if (window.location.protocol === 'https:') {
    return 'ok';
  }

  if (isIp(window.location.hostname) || isLocalDomain(window.location.hostname)) {
    try {
      let response = await fetch('/device/info');
      if (response.status === 200) {
        const deviceInfo = await response.json();
        if (!isDeviceSn(deviceInfo.sn)) {
          return 'warn';
        }
        const ip = getIpForHttpsDomainName(window.location.hostname, deviceInfo.ip);
        if (ip === null) {
          return 'warn';
        }
        const httpsUrlOrigin = makeHttpsUrlOrigin(ip, deviceInfo.sn);
        response = await fetch(`${httpsUrlOrigin}/device/info`, {
          method: 'GET',
          mode: 'cors',
        });
        if (response.status === 200) {
          const httpsDeviceInfo = await response.json();
          if (httpsDeviceInfo.sn === deviceInfo.sn) {
            window.location.href = httpsUrlOrigin;
            return 'redirected';
          }
        }
      }
    } catch (e) {
      /* empty */
    }
  }
  return 'warn';
}
