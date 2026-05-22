import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/button';
import { Tabs, TabContent } from '@/components/tabs';
import { DeviceTab, DeviceTabContent } from '@/pages/settings/device-manager';
import { type DeviceTabStore } from '@/stores/device-manager';
import type { PortTab as PortTabStore } from '../../stores/port-tab-store';
import type { SettingsTab as SettingsTabStore } from '../../stores/settings-tab-store';
import { TabType } from '../../stores/tabs-store';
import { PortTab, PortTabContent } from '../port-tab';
import { SettingsTab, SettingsTabContent } from '../settings-tab';
import { type PageTabsProps } from './types';
import './styles.css';

export const PageTabs = observer(
  ({
    tabs,
    selectedIndex,
    showButtons,
    deviceTypeSelectOptions,
    mobileModeStore,
    onSelect,
    onDeleteTab,
    onDeletePortDevices,
    onCopyTab,
    onAddPort,
    onDeviceTypeChange,
    onSearchDisconnectedDevice,
    onUpdateFirmware,
    onUpdateBootloader,
    onUpdateComponents,
    onReadRegisters,
  }: PageTabsProps) => {
    const { t } = useTranslation();

    return (
      <div className="deviceManagerPageTabs-container">
        {!(mobileModeStore.inMobileMode && !mobileModeStore.tabsPanelIsActive) && (
          <div className="deviceManagerPageTabs-listWrapper">
            <div
              className={classNames('deviceManagerPageTabs-list', {
                'deviceManagerPageTabs-listMobile': mobileModeStore.inMobileMode,
              })}
            >
              <Tabs
                activeTab={selectedIndex}
                items={tabs
                  .filter((tab) => !(tab as DeviceTabStore)?.hidden)
                  .map((tab, i) => ({
                    id: i,
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

            {showButtons && (
              <Button
                variant="secondary"
                className="deviceManagerPageTabs-addPort"
                label={t('device-manager.buttons.add-port')}
                aria-haspopup="dialog"
                onClick={onAddPort}
              />
            )}
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
