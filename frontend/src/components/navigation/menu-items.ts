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
import type { MenuItemInstance } from './components/menu-item';

export const getMenuItems = (
  dashboardsList: Dashboard[],
  params: URLSearchParams,
  hasRights: (role: UserRole) => boolean,
  computeUrlWithParams: (url: string) => string,
  integrations: string[],
  language: string
): MenuItemInstance[] => {
  let availableIntegrations = integrations || [];
  if (language === 'en') {
    availableIntegrations = availableIntegrations.filter((item) => item !== 'alice');
  }

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
      isShow: hasRights(UserRole.Admin) && !params.has('fullscreen') && !!availableIntegrations.length,
      children: [
        {
          label: 'navigation.labels.alice',
          url: 'integrations/alice',
          isShow: availableIntegrations.includes('alice'),
        },
      ],
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
        {
          label: 'navigation.labels.scenario',
          url: 'configs/edit/~2Fusr~2Fshare~2Fwb-mqtt-confed~2Fschemas~2Fwb-scenarios.schema.json',
        },
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
