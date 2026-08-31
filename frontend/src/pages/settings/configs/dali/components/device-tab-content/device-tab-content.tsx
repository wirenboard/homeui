import { observer } from 'mobx-react-lite';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from '@/components/alert';
import { Button } from '@/components/button';
import { FormButtonGroup } from '@/components/form';
import { JsonSchemaEditor } from '@/components/json-schema-editor';
import { Loader } from '@/components/loader';
import { Tooltip } from '@/components/tooltip';
import type { DeviceStore } from '@/stores/dali';
import { useAsyncAction } from '@/utils/async-action';
import { DeviceControls } from '../device-controls';
import { TabToolbar } from '../tab-toolbar';
import { ResetConfirm } from './reset-confirm';
import type { InstanceConfig, ResetMode } from './types';

// IEC 62386-103 Table 8: only the "device short and instance number" scheme
// puts both the sender's short address and the instance number into an event
// frame — the only combination the daemon can attribute to a device. A sensor
// left in another scheme (the factory default is "instance type and number")
// sends events that decode fine in the monitor yet update nothing, an
// invisible misconfiguration worth a visible warning.
export const ATTRIBUTABLE_EVENT_SCHEME = 2;

export const wrongSchemeInstances = (config: object | undefined): string[] =>
  Object.entries(config ?? {})
    .filter(([key, value]) => /^instance\d+$/.test(key)
      && typeof (value as InstanceConfig)?.event_scheme === 'number'
      && (value as InstanceConfig).event_scheme !== ATTRIBUTABLE_EVENT_SCHEME)
    .map(([key]) => key);

export const DeviceTabContent = observer(({
  store,
  title,
  onDeviceRemoved,
}: {
  store: DeviceStore;
  title?: ReactNode;
  onDeviceRemoved: (device: DeviceStore) => void;
}) => {
  const { t } = useTranslation();
  const [identify, isIdentifying] = useAsyncAction(async () => {
    await store.identify();
  });

  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);

  const [fixEventSchemes, isFixingSchemes] = useAsyncAction(async () => {
    const config = JSON.parse(JSON.stringify(store.objectStore.value));
    for (const key of wrongSchemeInstances(config)) {
      config[key].event_scheme = ATTRIBUTABLE_EVENT_SCHEME;
    }
    store.objectStore.setValue(config);
    await store.save();
  });

  const [runReset, isResetting] = useAsyncAction(async (mode: ResetMode) => {
    if (mode === 'settings') {
      await store.resetSettings();
      setIsResetDialogOpen(false);
    } else {
      await store.reset();
      setIsResetDialogOpen(false);
      onDeviceRemoved(store);
    }
  });

  if (!store.objectStore) {
    return (
      <div className="dali-contentLoader">
        <Loader />
      </div>
    );
  }
  return (
    <>
      <TabToolbar title={title}>
        <FormButtonGroup>
          <Tooltip text={t('dali.labels.identify-tooltip')}>
            <Button
              label={t('dali.buttons.identify')}
              isLoading={isIdentifying}
              onClick={identify}
            />
          </Tooltip>
          <Button
            label={t('dali.buttons.reload')}
            onClick={() => store.load(true)}
          />
          <Button
            label={t('dali.buttons.reset')}
            variant="danger"
            onClick={() => setIsResetDialogOpen(true)}
          />
          <Button
            label={t('common.buttons.save')}
            disabled={!store.objectStore.isDirty || store.objectStore.hasErrors}
            onClick={() => store.save()}
          />
        </FormButtonGroup>
      </TabToolbar>
      {store.mqttId && <DeviceControls mqttId={store.mqttId} />}
      {!store.isLoading && wrongSchemeInstances(store.objectStore.value).length > 0 && (
        <Alert variant="warn">
          <div className="dali-schemeWarning">
            <span>{t('dali.labels.event-scheme-warning')}</span>
            <Button
              label={t('dali.buttons.fix-event-schemes')}
              isLoading={isFixingSchemes}
              onClick={fixEventSchemes}
            />
          </div>
        </Alert>
      )}
      {store.isLoading ? (
        <div className="dali-contentLoader">
          <Loader />
        </div>
      ) : (
        <JsonSchemaEditor
          store={store.objectStore}
          translator={store.translator}
        />
      )}
      <ResetConfirm
        isOpened={isResetDialogOpen}
        isLoading={isResetting}
        isDirty={store.objectStore.isDirty}
        closeCallback={() => setIsResetDialogOpen(false)}
        onConfirm={runReset}
      />
    </>
  );
});
