import { type DeviceTabStore } from '@/stores/device-manager';
import type { PortTab } from '../../stores/port-tab-store';
import type { SettingsTab } from '../../stores/settings-tab-store';
import { TabType } from '../../stores/tabs-store';
import { matchesSearchQuery } from './filter-tabs';

const makeDeviceTab = (name: string, hidden = false) =>
  ({ type: TabType.Device, name, hidden }) as unknown as DeviceTabStore;
const makePortTab = (name: string, children: DeviceTabStore[] = []) =>
  ({ type: TabType.Port, name, children }) as unknown as PortTab;
const makeSettingsTab = (name = 'Settings') => ({ type: TabType.Settings, name }) as unknown as SettingsTab;

describe('matchesSearchQuery', () => {
  it('matches everything when the query is empty', () => {
    expect(matchesSearchQuery(makeDeviceTab('Water meter'), '')).toBe(true);
    expect(matchesSearchQuery(makePortTab('ttyRS485-1'), '')).toBe(true);
  });

  it('always matches the settings tab, regardless of the query', () => {
    expect(matchesSearchQuery(makeSettingsTab(), 'water')).toBe(true);
  });

  it('matches a device tab case-insensitively by its own name', () => {
    expect(matchesSearchQuery(makeDeviceTab('Water meter'), 'WATER')).toBe(true);
    expect(matchesSearchQuery(makeDeviceTab('Water meter'), 'power')).toBe(false);
  });

  it('matches a port tab by its own name even without matching children', () => {
    const port = makePortTab('ttyRS485-1', [makeDeviceTab('Water meter')]);
    expect(matchesSearchQuery(port, 'rs485-1')).toBe(true);
  });

  it('matches a port tab whose name does not match but a visible child device does', () => {
    const port = makePortTab('ttyRS485-1', [makeDeviceTab('Water meter'), makeDeviceTab('Power meter')]);
    expect(matchesSearchQuery(port, 'water')).toBe(true);
  });

  it('does not match a port tab through a collapsed (hidden) child device', () => {
    const port = makePortTab('ttyRS485-1', [makeDeviceTab('Water meter', true)]);
    expect(matchesSearchQuery(port, 'water')).toBe(false);
  });

  it('does not match a port tab when neither it nor any visible child matches', () => {
    const port = makePortTab('ttyRS485-1', [makeDeviceTab('Water meter'), makeDeviceTab('Power meter')]);
    expect(matchesSearchQuery(port, 'gas')).toBe(false);
  });
});
