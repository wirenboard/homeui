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

// Events sent under any other scheme carry no sender address (IEC 62386-103
// Table 8), so the daemon cannot tell whose controls to update.
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
}: {
  store: DeviceStore;
  title?: ReactNode;
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
    }
  });

  const isBusy = store.isLoading || isIdentifying || isResetting;

  return (
    <>
      <TabToolbar title={title}>
        <FormButtonGroup>
          <Tooltip text={t('dali.labels.identify-tooltip')}>
            <Button
              label={t('dali.buttons.identify')}
              isLoading={isIdentifying}
              disabled={isBusy}
              onClick={identify}
            />
          </Tooltip>
          <Button
            label={t('dali.buttons.reload')}
            disabled={isBusy}
            onClick={() => store.load(true)}
          />
          <Button
            label={t('dali.buttons.reset')}
            variant="danger"
            disabled={isBusy}
            onClick={() => setIsResetDialogOpen(true)}
          />
          <Button
            label={t('common.buttons.save')}
            disabled={isBusy || !store.objectStore?.isDirty || store.objectStore.hasErrors}
            onClick={() => store.save()}
          />
        </FormButtonGroup>
      </TabToolbar>
      {store.mqttId && <DeviceControls mqttId={store.mqttId} />}
      {!store.isLoading && wrongSchemeInstances(store.objectStore?.value).length > 0 && (
        <Alert variant="warn">
          <div className="dali-schemeWarning">
            <span>{t('dali.labels.event-scheme-warning')}</span>
            <Button
              label={t('dali.buttons.fix-event-schemes')}
              variant="warn"
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
      ) : store.objectStore && (
        <JsonSchemaEditor
          store={store.objectStore}
          translator={store.translator}
        />
      )}
      <ResetConfirm
        isOpened={isResetDialogOpen}
        isLoading={isResetting}
        isDirty={!!store.objectStore?.isDirty}
        closeCallback={() => setIsResetDialogOpen(false)}
        onConfirm={runReset}
      />
    </>
  );
});
