import DesktopIcon from '@/assets/icons/desktop.svg';
import FileIcon from '@/assets/icons/file.svg';
import InfoIcon from '@/assets/icons/info.svg';
import IntegrationsIcon from '@/assets/icons/integrations.svg';
import ListIcon from '@/assets/icons/list.svg';
import SettingsIcon from '@/assets/icons/settings.svg';
import SitemapIcon from '@/assets/icons/sitemap.svg';
import StatsIcon from '@/assets/icons/stats.svg';
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

export const toMenuItemInstance = (item: CustomMenuItem, language: string): MenuItemInstance => {
  const label = item.title?.[language as 'ru' | 'en'] || item.title?.ru || item.title?.en || item.id;
  const children = item.children?.map((child) => toMenuItemInstance(child, language));
  const output: MenuItemInstance = {
    id: item.id,
    url: item.url,
    label,
    children: children?.length ? children : undefined,
  };

  if (item.id === 'alice') {
    output.isShow = language !== 'en';
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
  params: URLSearchParams,
  hasRights: (role: UserRole) => boolean,
  computeUrlWithParams: (url: string) => string
): MenuItemInstance[] => {
  return [
    {
      label: 'navigation.labels.dashboards',
      id: 'dashboards-all',
      icon: DesktopIcon,
      children: [
        { label: 'navigation.labels.list', url: 'dashboards', isShow: !params.has('fullscreen') },
        ...dashboardsList
          .filter((dashboard) => !dashboard.options?.isHidden)
          .map((dashboard) => {
            return {
              label: dashboard.name,
              url: computeUrlWithParams(dashboard.isSvg
                ? `dashboards/svg/view/${dashboard.id}`
                : `dashboards/${dashboard.id}`),
            };
          }),
      ],
    },
    {
      label: 'navigation.labels.devices',
      url: 'devices',
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
      label: 'navigation.labels.widgets',
      url: 'widgets',
      icon: ListIcon,
      isShow: !params.has('fullscreen'),
    },
    {
      label: 'navigation.labels.history',
      url: computeUrlWithParams('history'),
      icon: StatsIcon,
    },
    {
      label: 'navigation.labels.rules',
      id: 'rules',
      icon: FileIcon,
      isShow: hasRights(UserRole.Admin) && !params.has('fullscreen'),
      children: [
        { label: 'navigation.labels.rule-editor', url: 'rules' },
      ],
    },
    {
      label: 'navigation.labels.settings',
      id: 'settings',
      icon: SettingsIcon,
      isShow: !params.has('fullscreen'),
      children: [
        { label: 'navigation.labels.configs', url: 'configs', isShow: hasRights(UserRole.Admin) },
        { label: 'navigation.labels.ui', url: 'web-ui' },
        { label: 'navigation.labels.system', url: 'system', isShow: hasRights(UserRole.Admin) },
        { label: 'navigation.labels.channels', url: 'MQTTChannels' },
        { label: 'navigation.labels.access', url: 'access-level', isShow: hasRights(UserRole.Admin) },
        { label: 'navigation.labels.logs', url: 'logs', isShow: hasRights(UserRole.Operator) },
      ],
    },
    {
      label: 'navigation.labels.help',
      url: 'help',
      icon: InfoIcon,
      isShow: !params.has('fullscreen'),
    },
  ];
};
