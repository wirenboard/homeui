import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import {
  JsonSchemaEditor,
  NumberEditor,
  ParamDescription,
  ParamError,
  StringEditor,
} from '@/components/json-schema-editor';
import { Table, TableRow, TableCell } from '@/components/table';
import { Tabs, TabContent, useTabs } from '@/components/tabs';
import {
  type WbDeviceParameterEditorsGroup,
  type WbDeviceChannelEditor,
} from '@/stores/device-manager';
import { type NumberStore, type Translator } from '@/stores/json-schema-editor';
import { MakeEditors } from './device-settings-param-editor';
import type { DeviceSettingsEditorProps, DeviceSettingsTabsProps } from './types';

const DeviceSettingsSubGroup = (
  { group, translator }:
  { group: WbDeviceParameterEditorsGroup; translator: Translator }
) => {
  const { i18n } = useTranslation();
  const currentLanguage = i18n.language;
  if (group.properties.ui_options?.wb?.disable_title) {
    return <DeviceSettingsTabContent group={group} isTopLevel={false} translator={translator} />;
  }
  return (
    <div className="deviceSettingsEditor-subGroup">
      <label>
        {translator.find(group.properties.title, currentLanguage)}
      </label>
      <DeviceSettingsTabContent group={group} isTopLevel={false} translator={translator} />
    </div>
  );
};

const CustomPeriodEditor = observer(({ store, translator }: { store: NumberStore; translator: Translator }) => {
  const errorId = useId();
  return (
    <div className="deviceSettingsEditor-parameter" >
      <NumberEditor store={store} translator={translator} />
      {store.hasErrors && <ParamError id={errorId} error={store.error} translator={translator} />}
    </div>
  );
});

const ChannelsTableRow = observer(({
  channel,
  translator,
}: {
  channel: WbDeviceChannelEditor;
  translator: Translator;
}) => {
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.language;
  let descriptionLines = [];
  if (channel.channel.description) {
    descriptionLines.push(translator.find(channel.channel.description, currentLanguage));
  }
  if (!channel.isSupportedByFirmware) {
    descriptionLines.push(t('device-manager.errors.supported-since', { fw: channel.channel.fw }));
  }
  const description = descriptionLines.join('<br/>');
  return (
    <TableRow key={channel.channel.name}>
      <TableCell>
        {translator.find(channel.channel.name, currentLanguage)}
        {description && <ParamDescription description={description} />}
      </TableCell>
      <TableCell>
        {channel.isSupportedByFirmware && (
          <StringEditor
            store={channel.mode}
            translator={translator}
          />
        )}
      </TableCell>
      <TableCell>
        {channel.isSupportedByFirmware && channel.hasCustomPeriod && (
          <CustomPeriodEditor
            store={channel.period}
            translator={translator}
          />
        )}
      </TableCell>
    </TableRow>
  );
});

const ChannelsTable = observer((
  { channels, translator }:
  { channels: WbDeviceChannelEditor[]; translator: Translator }
) => {
  const { t } = useTranslation();
  if (!channels || channels.length === 0) {
    return null;
  }
  return (
    <Table className="deviceSettingsEditor-channelsTable">
      <TableRow isHeading={true}>
        <TableCell>{t('device-manager.labels.channel')}</TableCell>
        <TableCell>{t('device-manager.labels.mode')}</TableCell>
        <TableCell>{t('device-manager.labels.period')}</TableCell>
      </TableRow>
      {channels.map((channel) => {
        if (!channel.isEnabledByCondition) {
          return null;
        }
        return <ChannelsTableRow key={channel.channel.name} channel={channel} translator={translator} />;
      })}
    </Table>
  );
});

const DeviceSettingsTabContent = observer((
  { group, isTopLevel, translator }:
  { group: WbDeviceParameterEditorsGroup; isTopLevel: boolean; translator: Translator }
) => {
  const showDescription = !!group.properties.description;
  const { i18n } = useTranslation();
  const currentLanguage = i18n.language;
  return (
    <div
      className={classNames({
        'deviceSettingsEditor-topGroupContent': isTopLevel,
        'deviceSettingsEditor-subGroupContent': !isTopLevel,
        'deviceSettingsEditor-subGroupContentWithBorder': !isTopLevel && !group.properties.ui_options?.wb?.disable_title,
      })}
    >
      {showDescription && (
        <ParamDescription description={translator.find(group.properties.description, currentLanguage)} />
      )}
      {MakeEditors(group.parameters, translator)}
      <ChannelsTable channels={group.channels} translator={translator} />
      {group.subgroups.map((subGroup: WbDeviceParameterEditorsGroup) => {
        return subGroup.isEnabledByCondition ?
          <DeviceSettingsSubGroup key={subGroup.properties.id} group={subGroup} translator={translator} />
          : null;
      })}
    </div>
  );
});

const DeviceSettingsTabs = observer((
  { groups, translator, customChannelsStore }: DeviceSettingsTabsProps
) => {
  const { i18n, t } = useTranslation();
  const tabs = groups.map((group: WbDeviceParameterEditorsGroup) => ({
    id: group.properties.id,
    label: (
      <span className={classNames({ 'deviceSettingsEditor-tabWithError': group.hasErrors })}>
        {translator.find(group.properties.title, i18n.language)}
      </span>
    ),
  }));
  if (customChannelsStore) {
    tabs.push({
      id: 'customChannels',
      label: (
        <span className={classNames({ 'deviceSettingsEditor-tabWithError': customChannelsStore.hasErrors })}>
          {t('device-manager.labels.custom-channels')}
        </span>
      ),
    });
  }
  const { activeTab, onTabChange } = useTabs({
    defaultTab: groups[0].properties.id,
    items: tabs,
  });
  return (
    <div className="deviceSettingsEditor-tabs">
      <Tabs activeTab={activeTab} items={tabs} onTabChange={onTabChange}/>
      {groups.map((group: WbDeviceParameterEditorsGroup) => (
        <TabContent
          key={group.properties.id}
          activeTab={activeTab}
          tabId={group.properties.id}
          className="deviceSettingsEditor-tabContent"
        >
          <DeviceSettingsTabContent group={group} isTopLevel={true} translator={translator} />
        </TabContent>
      ))}
      {customChannelsStore && (
        <TabContent
          key="customChannels"
          activeTab={activeTab}
          tabId="customChannels"
          className="deviceSettingsEditor-tabContent"
        >
          <JsonSchemaEditor store={customChannelsStore} translator={translator} />
        </TabContent>
      )}
    </div>
  );
});

export const DeviceSettingsEditorDesktop = observer(({ store, translator } : DeviceSettingsEditorProps) => {
  const { t } = useTranslation();
  return (
    <div className="deviceSettingsEditor deviceSettingsEditor-desktop">
      <JsonSchemaEditor store={store.commonParams} translator={translator} />
      {MakeEditors(store.topLevelGroup.parameters, translator)}
      <ChannelsTable channels={store.topLevelGroup.channels} translator={translator} />
      {store.topLevelGroup.subgroups.length > 0 && (
        <DeviceSettingsTabs
          groups={store.topLevelGroup.subgroups}
          translator={translator}
          customChannelsStore={store.customChannels}
        />
      )}
      {store.topLevelGroup.subgroups.length === 0 && store.customChannels && (
        <div className="deviceSettingsEditor-customChannelsNoTabs">
          <label>
            {t('device-manager.labels.custom-channels')}
          </label>
          <JsonSchemaEditor
            store={store.customChannels}
            translator={translator}
          />
        </div>
      )}
    </div>
  );
});
