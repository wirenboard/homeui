import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { Suspense, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/card';
import {
  JsonSchemaEditor,
  NumberEditor,
  ParamDescription,
  ParamError,
  StringEditor,
} from '@/components/json-schema-editor';
import {
  type WbDeviceParameterEditorsGroup,
  type WbDeviceChannelEditor,
} from '@/stores/device-manager';
import { type NumberStore, type ArrayStore, type Translator } from '@/stores/json-schema-editor';
import { MakeEditors, useChannelDescription, ParamSimpleLabel } from './device-settings-param-editor';
import type { DeviceSettingsEditorProps } from './types';

const DeviceSettingsSubGroup = (
  { group, translator }:
  { group: WbDeviceParameterEditorsGroup; translator: Translator },
) => {
  const { i18n } = useTranslation();
  const currentLanguage = i18n.language;
  if (group.properties.ui_options?.wb?.disable_title) {
    return <DeviceSettingsCardContent group={group} isTopLevel={false} translator={translator} />;
  }
  return (
    <div className="deviceSettingsEditor-subGroup">
      <label>
        {translator.find(group.properties.title || group.properties.id, currentLanguage)}
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
    <div className="deviceSettingsEditor-parameter" >
      <ParamSimpleLabel
        title={t('device-manager.labels.period')}
        inputId={inputId}
      />
      <NumberEditor store={store} translator={translator} />
      {store.hasErrors && <ParamError id={errorId} error={store.error} translator={translator} />}
    </div>
  );
});

const ChannelBlock = observer((
  { channel, translator }:
  { channel: WbDeviceChannelEditor; translator: Translator },
) => {
  const titleInputId = useId();
  const titleErrorId = useId();
  const titleDescriptionId = useId();
  const modeInputId = useId();
  const { t } = useTranslation();
  const description = useChannelDescription(channel, translator);
  return (
    <div className="deviceSettingsEditor-channel" id={channel.channel.name}>
      <div className="deviceSettingsEditor-parameter">
        <ParamSimpleLabel title={t('device-manager.labels.channel')} inputId={titleInputId} />
        <StringEditor
          store={channel.title}
          inputId={titleInputId}
          descriptionId={description ? titleDescriptionId : undefined}
          errorId={titleErrorId}
          translator={translator}
        />
        {channel.title.hasErrors && (
          <ParamError id={titleErrorId} error={channel.title.error} translator={translator} />
        )}
        {description && <ParamDescription id={titleDescriptionId} description={description} />}
      </div>
      <div className="deviceSettingsEditor-parameter">
        <ParamSimpleLabel title={t('device-manager.labels.mode')} inputId={modeInputId} />
        <Suspense fallback="">
          <StringEditor store={channel.mode} inputId={modeInputId} translator={translator} />
        </Suspense>
      </div>
      {channel.hasCustomPeriod && (
        <CustomPeriodEditor store={channel.period} translator={translator} />
      )}
    </div>
  );
});

const ChannelsList = observer((
  { channels, translator }:
  { channels: WbDeviceChannelEditor[]; translator: Translator },
) => {
  return (
    <>
      {channels.map((channel) => {
        if (!channel.isEnabledByCondition) {
          return null;
        }
        return (
          <ChannelBlock key={channel.channel.name} channel={channel} translator={translator} />
        );
      })}
    </>
  );
});

const DeviceSettingsCardContent = observer((
  { group, isTopLevel, translator }:
  { group: WbDeviceParameterEditorsGroup; isTopLevel: boolean; translator: Translator },
) => {
  const showDescription = !!group.description;
  const { i18n } = useTranslation();
  const currentLanguage = i18n.language;
  return (
    <div
      className={classNames({
        'deviceSettingsEditor-topGroupContent': isTopLevel,
        'deviceSettingsEditor-subGroupContent': !isTopLevel,
        'deviceSettingsEditor-subGroupContentWithBorder': !isTopLevel
          && !group.properties.ui_options?.wb?.disable_title,
      })}
    >
      {showDescription && (
        <ParamDescription description={translator.find(group.description, currentLanguage)} />
      )}
      {MakeEditors(group.parameters, translator)}
      <ChannelsList channels={group.channels} translator={translator} />
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
  { group: WbDeviceParameterEditorsGroup; translator: Translator },
) => {
  const { i18n } = useTranslation();
  const currentLanguage = i18n.language;
  const [isBodyVisible, setIsBodyVisible] = useState(false);
  return (
    <Card
      key={group.properties.id}
      heading={translator.find(group.properties.title || group.properties.id, currentLanguage)}
      id={group.properties.id}
      variant="secondary"
      withError={group.hasErrors}
      isBodyVisible={isBodyVisible}
      hasStickyHeader={true}
      toggleBody={() => setIsBodyVisible(!isBodyVisible)}
    >
      <DeviceSettingsCardContent group={group} isTopLevel={true} translator={translator} />
    </Card>
  );
});

const CustomChannelsCard = observer((
  { customChannels, translator }:
  { customChannels: ArrayStore; translator: Translator },
) => {
  const { t } = useTranslation();
  const [isBodyVisible, setIsBodyVisible] = useState(false);
  return (
    <Card
      key="customChannels"
      heading={t('device-manager.labels.custom-channels')}
      id="customChannels"
      variant="secondary"
      withError={customChannels.hasErrors}
      isBodyVisible={isBodyVisible}
      hasStickyHeader={true}
      toggleBody={() => setIsBodyVisible(!isBodyVisible)}
    >
      <JsonSchemaEditor store={customChannels} translator={translator} />
    </Card>
  );
});

export const DeviceSettingsEditorMobile = observer(({ store, translator } : DeviceSettingsEditorProps) => {
  const { t } = useTranslation();
  return (
    <div className="deviceSettingsEditor deviceSettingsEditor-mobile">
      <JsonSchemaEditor store={store.commonParams} translator={translator} />
      {MakeEditors(store.topLevelGroup.parameters, translator)}
      <ChannelsList channels={store.topLevelGroup.channels} translator={translator} />
      {store.topLevelGroup.subgroups.map((group: WbDeviceParameterEditorsGroup) => (
        <DeviceSettingsCard key={group.properties.id} group={group} translator={translator} />
      ))}
      {store.customChannels && (
        <CustomChannelsCard customChannels={store.customChannels} translator={translator} />
      )}
      {store.topLevelGroup.subgroups.length === 0 && store.customChannels && (
        <div>
          <label>
            {t('device-manager.labels.custom-channels')}
          </label>
          <JsonSchemaEditor store={store.customChannels} translator={translator} />
        </div>
      )}
    </div>
  );
});
