import { type DeviceTabStore } from '@/stores/device-manager';
import type { PortTab } from '../../stores/port-tab-store';
import type { SettingsTab } from '../../stores/settings-tab-store';
import { TabType } from '../../stores/tabs-store';

function matchesName(name: string, lowerCaseQuery: string) {
  return name?.toLowerCase().includes(lowerCaseQuery);
}

export function matchesSearchQuery(
  tab: PortTab | SettingsTab | DeviceTabStore,
  query: string,
): boolean {
  if (!query) {
    return true;
  }
  const lowerCaseQuery = query.toLowerCase();
  if (tab.type === TabType.Settings) {
    return true;
  }
  if (tab.type === TabType.Device) {
    return matchesName((tab as DeviceTabStore).name, lowerCaseQuery);
  }
  const portTab = tab as PortTab;
  return matchesName(portTab.name, lowerCaseQuery)
    || portTab.children.some((child) => !child.hidden && matchesName(child.name, lowerCaseQuery));
}
