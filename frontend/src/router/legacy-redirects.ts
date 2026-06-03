export const legacyStaticRedirects: Record<string, string> = {
  '/access-level': '/settings/users',
  '/serial-config': '/settings/configs/serial-config',
  '/scan': '/settings/configs/serial-config',
  '/widgets': '/dashboards/widgets',
  '/configs': '/settings/configs',
  '/dali': '/settings/configs/dali',
  '/mbgate': '/settings/configs/mbgate',
  '/network-connections': '/settings/configs/network-connections',
  '/logs': '/settings/logs',
  '/system': '/settings/system',
  '/web-ui': '/settings/ui',
  '/MQTTChannels': '/settings/mqtt-channels',
  '/help': '/',
};

export const legacyParamRedirects: { prefix: string; target: string }[] = [
  { prefix: '/configs/edit/', target: '/settings/configs/' },
  { prefix: '/rules/edit/', target: '/rules/' },
];

export const migrateLegacyUrl = (url: string): string => {
  if (legacyStaticRedirects[url]) {
    return legacyStaticRedirects[url];
  }

  for (const { prefix, target } of legacyParamRedirects) {
    if (url.startsWith(prefix)) {
      return target + url.slice(prefix.length);
    }
  }

  return url;
};
