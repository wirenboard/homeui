import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/card';
import {
  JsonSchemaEditor,
  NumberEditor,
  ParamDescription,
  ParamError,
  StringEditor
} from '@/components/json-schema-editor';
import {
  WbDeviceParameterEditorsGroup,
  WbDeviceChannelEditor
} from '@/stores/device-manager';
import { NumberStore, Translator } from '@/stores/json-schema-editor';
import { MakeEditors, ParamSimpleLabel } from './device-settings-param-editor';
import type { DeviceSettingsEditorProps } from './types';

const DeviceSettingsSubGroup = (
  { group, translator }:
  { group: WbDeviceParameterEditorsGroup; translator: Translator }
) => {
  const { i18n } = useTranslation();
  const currentLanguage = i18n.language;
  if (group.properties.ui_options?.wb?.disable_title) {
    return <DeviceSettingsCardContent group={group} isTopLevel={false} translator={translator} />;
  }
  return (
    <div className="device-settings__sub-group">
      <label>
        {translator.find(group.properties.title, currentLanguage)}
      </label>
      <DeviceSettingsCardContent group={group} isTopLevel={false} translator={translator} />
    </div>
  );
};

const CustomPeriodEditor = observer(({ store, translator }: { store: NumberStore; translator: Translator }) => {
  const errorId = useId();
  const inputId = useId();
  const { t } = useTranslation();
  return (
    <div className={classNames('device-settings__parameter', { 'wb-jsonEditor-propertyError': store.hasErrors })} >
      <ParamSimpleLabel
        title={t('device-manager.labels.period')}
        inputId={inputId}
        className="device-settings__channel-period-label"
      />
      <NumberEditor store={store} translator={translator} />
      {store.hasErrors && <ParamError id={errorId} error={store.error} translator={translator} />}
    </div>
  );
});

const ChannelCard = observer((
  { channel, translator }:
  { channel: WbDeviceChannelEditor; translator: Translator }
) => {
  const { i18n } = useTranslation();
  const currentLanguage = i18n.language;
  return (
    <Card
      key={channel.channel.name}
      heading={translator.find(channel.channel.name, currentLanguage)}
      id={channel.channel.name}
      className={classNames({ 'group-has-error': channel.hasErrors })}
    >
      <div className="device-settings__channel">
        {channel.channel.description && (
          <ParamDescription description={translator.find(channel.channel.description, currentLanguage)} />
        )}
        <StringEditor store={channel.mode} translator={translator} />
        {channel.hasCustomPeriod && <CustomPeriodEditor store={channel.period} translator={translator} />}
      </div>
    </Card>
  );
});

const DeviceSettingsCardContent = observer((
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
      {group.channels.map((channel) => {
        if (!channel.isEnabledByCondition) {
          return null;
        }
        return (
          <ChannelCard key={channel.channel.name} channel={channel} translator={translator} />
        );
      })}
      {group.subgroups.map((subGroup: WbDeviceParameterEditorsGroup) => {
        return subGroup.isEnabledByCondition ?
          <DeviceSettingsSubGroup key={subGroup.properties.id} group={subGroup} translator={translator} />
          : null;
      })}
    </div>
  );
});

const DeviceSettingsCard = observer((
  { group, translator }:
  { group: WbDeviceParameterEditorsGroup; translator: Translator }
) => {
  const { i18n } = useTranslation();
  const currentLanguage = i18n.language;
  const [isBodyVisible, setIsBodyVisible] = useState(false);
  return (
    <Card
      key={group.properties.id}
      heading={translator.find(group.properties.title, currentLanguage)}
      id={group.properties.id}
      className={classNames({ 'group-has-error': group.hasErrors })}
      isBodyVisible={isBodyVisible}
      toggleBody={() => setIsBodyVisible(!isBodyVisible)}
    >
      <DeviceSettingsCardContent group={group} isTopLevel={true} translator={translator} />
    </Card>
  );
});

export const DeviceSettingsEditorMobile = observer(({ store, translator } : DeviceSettingsEditorProps) => {
  return (
    <div className="device-settings__editor">
      <JsonSchemaEditor store={store.commonParams} translator={translator} />
      {MakeEditors(store.topLevelParameters, translator)}
      {store.groups.map((group: WbDeviceParameterEditorsGroup) => (
        <DeviceSettingsCard key={group.properties.id} group={group} translator={translator} />
      ))}
    </div>
  );
});
