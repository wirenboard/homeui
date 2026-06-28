import DesktopIcon from '@/assets/icons/desktop.svg';
import FileIcon from '@/assets/icons/file.svg';
import IntegrationsIcon from '@/assets/icons/integrations.svg';
import SettingsIcon from '@/assets/icons/settings.svg';
import SitemapIcon from '@/assets/icons/sitemap.svg';
import StatsIcon from '@/assets/icons/stats.svg';
import { migrateLegacyUrl } from '@/router/legacy-redirects';
import { UserRole } from '@/stores/auth';
import { type Dashboard } from '@/stores/dashboards';
import { type CustomMenuItem, type MenuItemInstance } from './types';

export const normalizeMenuResponse = (data: CustomMenuItem[]) => {
  const items: CustomMenuItem[] = [];

  if (!Array.isArray(data)) {
    return items;
  }

  data.forEach((entry) => {
    if (Array.isArray(entry)) {
      items.push(...entry);
    } else if (entry && typeof entry === 'object') {
      items.push(entry);
    }
  });

  return items;
};

const normalizeUrl = (url?: string) => {
  if (!url) return url;
  const normalized = url.startsWith('/') ? url : `/${url}`;
  return migrateLegacyUrl(normalized);
};

// Treat a custom-menu item as external only for a safe target: a same-origin
// absolute path (`/…`, not `//` or `/\`) or an explicit http(s) URL. Rejects
// `javascript:`/`data:`/protocol-relative hrefs that would otherwise become a
// clickable XSS / open-redirect via the rendered <a>.
const isSafeExternalUrl = (url?: string): boolean => {
  if (!url) return false;
  if (/^\/(?![/\\])/.test(url)) return true;
  try {
    return ['http:', 'https:'].includes(new URL(url).protocol);
  } catch {
    return false;
  }
};

export const toMenuItemInstance = (
  item: CustomMenuItem,
  language: string,
  hasRights?: (role: UserRole) => boolean,
): MenuItemInstance => {
  const label = item.title?.[language as 'ru' | 'en'] || item.title?.ru || item.title?.en || item.id;
  const children = item.children?.map((child) => toMenuItemInstance(child, language, hasRights));
  const isExternal = Boolean(item.isExternal && isSafeExternalUrl(item.url));
  const output: MenuItemInstance = {
    id: item.id,
    // External links: keep the safe URL verbatim (the in-app normalizer would break it).
    url: isExternal ? item.url : normalizeUrl(item.url),
    label,
    ...(isExternal ? { isExternal: true } : null),
    ...(isExternal && item.openInNewTab ? { openInNewTab: true } : null),
    children: children?.length ? children : undefined,
  };

  if (item.id === 'alice') {
    output.isShow = language !== 'en';
  }

  // Role gating combines with any visibility already decided above (e.g. the
  // alice language rule): the item stays visible only when both allow it, so a
  // requiredRole never silently re-shows an item another rule hid, nor vice
  // versa. Without a hasRights checker the role gate is a no-op.
  if (item.requiredRole !== undefined && hasRights) {
    output.isShow = output.isShow !== false && hasRights(item.requiredRole);
  }

  return output;
};

export const mergeMenuItems = (baseItems: MenuItemInstance[], customItems: MenuItemInstance[]) => {
  const items = [...baseItems];
  if (!customItems.length) {
    return filterMenuItems(items);
  }
  const indexById = new Map<string, number>();

  items.forEach((item, index) => {
    if (item.id) {
      indexById.set(item.id, index);
    }
  });

  customItems.forEach((item) => {
    if (item.id && indexById.has(item.id)) {
      const idx = indexById.get(item.id);
      const baseItem = items[idx];
      const mergedChildren = [...(baseItem.children || []), ...(item.children || [])];

      items[idx] = {
        ...baseItem,
        ...(item.url ? { url: item.url } : null),
        ...(item.isExternal !== undefined ? { isExternal: item.isExternal } : null),
        ...(item.openInNewTab !== undefined ? { openInNewTab: item.openInNewTab } : null),
        ...(item.label && item.label !== item.id ? { label: item.label } : null),
        children: mergedChildren.length ? mergedChildren : undefined,
      };
    } else {
      items.push(item);
    }
  });

  return filterMenuItems(items);
};

const filterMenuItems = (items: MenuItemInstance[]): MenuItemInstance[] => {
  return items.reduce<MenuItemInstance[]>((filtered, item) => {
    const children = item.children ? filterMenuItems(item.children) : undefined;
    const hasVisibleChildren = Boolean(children?.some((child) => child.isShow !== false));

    if (!item.url && !hasVisibleChildren) {
      return filtered;
    }

    const normalizedChildren = children?.length ? children : undefined;

    filtered.push({
      ...item,
      ...(normalizedChildren ? { children: normalizedChildren } : {}),
    });

    return filtered;
  }, []);
};

export const getMenuItems = (
  dashboardsList: Dashboard[],
  isShowWidgetsPage: boolean,
  params: URLSearchParams,
  hasRights: (role: UserRole) => boolean,
): MenuItemInstance[] => {
  const computeUrlWithParams = (url: string) => {
    return params.has('fullscreen') ? `${url}?fullscreen` : url;
  };

  return [
    {
      label: 'navigation.labels.dashboards',
      id: 'dashboards-all',
      icon: DesktopIcon,
      children: [
        { label: 'navigation.labels.list', url: '/dashboards', isShow: !params.has('fullscreen') },
        ...dashboardsList
          .filter((dashboard) => !dashboard.options?.isHidden)
          .map((dashboard) => {
            return {
              label: dashboard.name,
              url: computeUrlWithParams(dashboard.isSvg
                ? `/dashboards/svg/view/${dashboard.id}`
                : `/dashboards/${dashboard.id}`),
            };
          }),
        {
          label: 'navigation.labels.widgets',
          url: '/dashboards/widgets',
          isShow: isShowWidgetsPage && !params.has('fullscreen'),
        },
      ],
    },
    {
      label: 'navigation.labels.devices',
      url: '/devices',
      icon: SitemapIcon,
      isShow: hasRights(UserRole.Operator) && !params.has('fullscreen'),
    },
    {
      label: 'navigation.labels.integrations',
      id: 'integrations',
      icon: IntegrationsIcon,
      isShow: hasRights(UserRole.Admin) && !params.has('fullscreen'),
    },
    {
      label: 'navigation.labels.history',
      url: computeUrlWithParams('/history'),
      icon: StatsIcon,
    },
    {
      label: 'navigation.labels.rules',
      id: 'rules',
      icon: FileIcon,
      isShow: hasRights(UserRole.Admin) && !params.has('fullscreen'),
      children: [
        { label: 'navigation.labels.rule-editor', url: '/rules' },
      ],
    },
    {
      label: 'navigation.labels.settings',
      id: 'settings',
      icon: SettingsIcon,
      isShow: !params.has('fullscreen'),
      children: [
        { label: 'navigation.labels.configs', url: '/settings/configs', isShow: hasRights(UserRole.Admin) },
        { label: 'navigation.labels.ui', url: '/settings/ui' },
        { label: 'navigation.labels.system', url: '/settings/system', isShow: hasRights(UserRole.Admin) },
        { label: 'navigation.labels.channels', url: '/settings/mqtt-channels' },
        { label: 'navigation.labels.access', url: '/settings/users', isShow: hasRights(UserRole.Admin) },
        { label: 'navigation.labels.logs', url: '/settings/logs', isShow: hasRights(UserRole.Operator) },
      ],
    },
  ];
};
