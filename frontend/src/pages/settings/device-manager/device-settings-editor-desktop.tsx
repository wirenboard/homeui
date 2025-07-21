import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import {
  JsonSchemaEditor,
  NumberEditor,
  ParamDescription,
  ParamError,
  StringEditor
} from '@/components/json-schema-editor';
import { Table, TableRow, TableCell } from '@/components/table';
import { Tabs, TabContent, useTabs } from '@/components/tabs';
import {
  WbDeviceParameterEditorsGroup,
  WbDeviceChannelEditor
} from '@/stores/device-manager';
import { NumberStore, Translator } from '@/stores/json-schema-editor';
import { MakeEditors } from './device-settings-param-editor';
import type { DeviceSettingsEditorProps } from './types';

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
    <div className="device-settings__sub-group">
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
    <div className={classNames('device-settings__parameter', { 'wb-jsonEditor-propertyError': store.hasErrors })} >
      <NumberEditor store={store} translator={translator} />
      {store.hasErrors && <ParamError id={errorId} error={store.error} translator={translator} />}
    </div>
  );
});

const ChannelsTable = observer((
  { channels, translator }:
  { channels: WbDeviceChannelEditor[]; translator: Translator }
) => {
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.language;
  if (!channels || channels.length === 0) {
    return null;
  }
  return (
    <Table className="device-settings__channels-table">
      <TableRow isHeading={true}>
        <TableCell>{t('device-manager.labels.channel')}</TableCell>
        <TableCell>{t('device-manager.labels.mode')}</TableCell>
        <TableCell>{t('device-manager.labels.period')}</TableCell>
      </TableRow>
      {channels.map((channel) => {
        if (!channel.isEnabledByCondition) {
          return null;
        }
        return (
          <TableRow key={channel.channel.name}>
            <TableCell>
              {translator.find(channel.channel.name, currentLanguage)}
              <ParamDescription description={translator.find(channel.channel.description, currentLanguage)} />
            </TableCell>
            <TableCell>
              <StringEditor
                store={channel.mode}
                translator={translator}
              />
            </TableCell>
            <TableCell>
              {channel.hasCustomPeriod && (
                <CustomPeriodEditor
                  store={channel.period}
                  translator={translator}
                />
              )}
            </TableCell>
          </TableRow>
        );
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
        'device-settings__top-group-content': isTopLevel,
        'device-settings__sub-group-content': !isTopLevel,
        'device-settings__sub-group--border': !isTopLevel && !group.properties.ui_options?.wb?.disable_title,
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
  { groups, translator }:
  { groups: WbDeviceParameterEditorsGroup[]; translator: Translator }
) => {
  const { i18n } = useTranslation();
  const tabs = groups.map((group: WbDeviceParameterEditorsGroup) => ({
    id: group.properties.id,
    label: (
      <span className={classNames({ 'has-error': group.hasErrors })}>
        {translator.find(group.properties.title, i18n.language)}
      </span>
    ),
  }));
  const { activeTab, onTabChange } = useTabs({
    defaultTab: groups[0].properties.id,
    items: tabs,
  });
  return (
    <div className="device-settings__tabs">
      <Tabs activeTab={activeTab} items={tabs} onTabChange={onTabChange}/>
      {groups.map((group: WbDeviceParameterEditorsGroup) => (
        <TabContent activeTab={activeTab} tabId={group.properties.id} className="device-settings__tabpanel">
          <DeviceSettingsTabContent group={group} isTopLevel={true} translator={translator} />
        </TabContent>
      ))}
    </div>
  );
});

export const DeviceSettingsEditorDesktop = observer(({ store, translator } : DeviceSettingsEditorProps) => {
  return (
    <div className="device-settings__editor">
      <JsonSchemaEditor store={store.commonParams} translator={translator} />
      {MakeEditors(store.topLevelParameters, translator)}
      {store.groups.length > 0 && (
        <DeviceSettingsTabs groups={store.groups} translator={translator} />
      )}
    </div>
  );
});
