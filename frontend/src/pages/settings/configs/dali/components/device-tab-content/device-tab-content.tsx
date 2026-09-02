import { observer } from 'mobx-react-lite';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
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
import type { ResetMode } from './types';

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
