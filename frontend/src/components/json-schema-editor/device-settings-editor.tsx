import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { Table, TableRow, TableCell } from '@/components/table';
import { Tabs, TabContent, useTabs } from '@/components/tabs';
import {
  WbDeviceParameterEditorsGroup,
  WbDeviceParameterEditor,
  WbDeviceChannelEditor,
  Translator
} from '@/stores/json-schema-editor';
import { NumberParamEditor } from './number-param-editor';
import { ObjectParamEditor } from './object-param-editor';
import { ParamDescription } from './param-description';
import { StringParamEditor } from './string-param-editor';
import type { DeviceSettingsEditorProps } from './types';

import './styles.css';

const DeviceSettingsSubGroup = ({ group, translator }: { group: WbDeviceParameterEditorsGroup; translator: Translator }) => {
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

const MakeEditors = (parameters: WbDeviceParameterEditor[], translator: Translator) => {
  return parameters.map((param) => {
    if (param.isEnabled) {
      return (
        <NumberParamEditor
          key={param.id}
          store={param.variants[param.activeVariantIndex].store}
          paramId={param.id}
          translator={translator}
        />
      );
    }
    return null;
  });
};

const ChannelsTable = observer(({ channels, translator }: { channels: WbDeviceChannelEditor[]; translator: Translator }) => {
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
      {channels.map((channel) => (
        <TableRow key={channel.channel.name}>
          <TableCell>
            {translator.find(channel.channel.name, currentLanguage)}
            <ParamDescription description={translator.find(channel.channel.description, currentLanguage)} />
          </TableCell>
          <TableCell>
            <StringParamEditor
              store={channel.mode}
              paramId={`${channel.channel.name}-mode`}
              translator={translator}
            />
          </TableCell>
          <TableCell>
            {channel.hasCustomPeriod && (
              <NumberParamEditor
                store={channel.period}
                paramId={`${channel.channel.name}-period`}
                translator={translator}
              />
            )}
          </TableCell>
        </TableRow>
      ))}
    </Table>
  );
});

const DeviceSettingsTabContent = observer(({ group, isTopLevel, translator }: { group: WbDeviceParameterEditorsGroup; isTopLevel: boolean; translator: Translator }) => {
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
        return subGroup.isEnabled ?
          <DeviceSettingsSubGroup key={subGroup.properties.id} group={subGroup} translator={translator} />
          : null;
      })}
    </div>
  );
});

const DeviceSettingsTabs = ({ groups, translator }: { groups: WbDeviceParameterEditorsGroup[]; translator: Translator }) => {
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
        <TabContent activeTab={activeTab} tabId={group.properties.id}>
          <DeviceSettingsTabContent group={group} isTopLevel={true} translator={translator} />
        </TabContent>
      ))}
    </div>
  );
};

export const DeviceSettingsEditor = observer(({ store, translator } : DeviceSettingsEditorProps) => {
  return (
    <div className="device-settings__editor">
      <ObjectParamEditor store={store.commonParams} translator={translator} />
      {MakeEditors(store.topLevelParameters, translator)}
      {store.groups.length > 0 && (
        <DeviceSettingsTabs groups={store.groups} translator={translator} />
      )}
    </div>
  );
});
