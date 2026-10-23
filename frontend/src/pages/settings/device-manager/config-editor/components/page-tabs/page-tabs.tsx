import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { Tabs, TabContent } from '@/components/tabs';
import { DeviceTab, DeviceTabContent } from '@/pages/settings/device-manager';
import { type DeviceTabStore } from '@/stores/device-manager';
import type { PortTab as PortTabStore } from '../../stores/port-tab-store';
import type { SettingsTab as SettingsTabStore } from '../../stores/settings-tab-store';
import { TabType } from '../../stores/tabs-store';
import { PortTab, PortTabContent } from '../port-tab';
import { SettingsTab, SettingsTabContent } from '../settings-tab';
import { matchesSearchQuery } from './filter-tabs';
import { type PageTabsProps } from './types';
import './styles.css';

export const PageTabs = observer(
  ({
    tabs,
    selectedIndex,
    deviceTypeSelectOptions,
    mobileModeStore,
    searchQuery,
    onSelect,
    onDeleteTab,
    onDeletePortDevices,
    onCopyTab,
    onDeviceTypeChange,
    onSearchDisconnectedDevice,
    onUpdateFirmware,
    onUpdateBootloader,
    onUpdateComponents,
    onReadRegisters,
  }: PageTabsProps) => {
    const { t } = useTranslation();

    const visibleTabs = tabs
      .map((tab, originalIndex) => ({ tab, originalIndex }))
      .filter(({ tab }) => !(tab as DeviceTabStore)?.hidden)
      .filter(({ tab }) => matchesSearchQuery(tab, searchQuery));
    const hasMatchingPortsOrDevices = visibleTabs.some(({ tab }) => tab.type !== TabType.Settings);

    return (
      <div className="deviceManagerPageTabs-container">
        {!(mobileModeStore.inMobileMode && !mobileModeStore.tabsPanelIsActive) && (
          <div className="deviceManagerPageTabs-listWrapper">
            <div
              className={classNames('deviceManagerPageTabs-list', {
                'deviceManagerPageTabs-listMobile': mobileModeStore.inMobileMode,
              })}
            >
              {searchQuery && !hasMatchingPortsOrDevices && (
                <div className="deviceManagerPageTabs-empty">{t('common.labels.empty-search')}</div>
              )}
              <Tabs
                activeTab={selectedIndex}
                items={visibleTabs.map(({ tab, originalIndex }) => ({
                  id: originalIndex,
                  label: tab.type === TabType.Device
                    ? <DeviceTab tab={tab as DeviceTabStore} />
                    : tab.type === TabType.Port
                      ? <PortTab tab={tab as PortTabStore} />
                      : <SettingsTab tab={tab as SettingsTabStore} />,
                }))}
                isEllipsis={false}
                onTabChange={(val: number) => {
                  onSelect(val);
                }}
              />
            </div>
          </div>
        )}

        {!(mobileModeStore.inMobileMode && mobileModeStore.tabsPanelIsActive) && tabs.map((tab, index) => (
          <TabContent
            activeTab={selectedIndex}
            key={index}
            tabId={index}
            className={classNames('deviceManagerPageTabs-tab', {
              'deviceManagerPageTabs-tabMobile': mobileModeStore.inMobileMode,
            })}
          >
            <>
              {tab.type === TabType.Port && (
                <PortTabContent
                  tab={tab}
                  onDeleteTab={onDeleteTab}
                  onDeletePortDevices={onDeletePortDevices}
                />
              )}
              {tab.type === TabType.Device && (
                <DeviceTabContent
                  tab={tab as DeviceTabStore}
                  deviceTypeSelectOptions={deviceTypeSelectOptions}
                  onDeleteTab={onDeleteTab}
                  onCopyTab={onCopyTab}
                  onDeviceTypeChange={onDeviceTypeChange}
                  onSetUniqueMqttTopic={() => (tab as DeviceTabStore).setUniqueMqttTopic()}
                  onSearchDisconnectedDevice={onSearchDisconnectedDevice}
                  onUpdateFirmware={onUpdateFirmware}
                  onUpdateBootloader={onUpdateBootloader}
                  onUpdateComponents={onUpdateComponents}
                  onReadRegisters={onReadRegisters}
                />
              )}
              {tab.type === TabType.Settings && (
                <SettingsTabContent tab={tab as SettingsTabStore} />
              )}
            </>
          </TabContent>
        ))}
      </div>
    );
  },
);
