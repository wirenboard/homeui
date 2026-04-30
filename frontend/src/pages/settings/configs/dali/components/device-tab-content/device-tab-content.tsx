import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/button';
import { FormButtonGroup } from '@/components/form';
import { JsonSchemaEditor } from '@/components/json-schema-editor';
import { Loader } from '@/components/loader';
import { Tooltip } from '@/components/tooltip';
import type { DeviceStore } from '@/stores/dali';
import { useAsyncAction } from '@/utils/async-action';
import { ResetConfirm } from './reset-confirm';
import type { ResetMode } from './types';

export const DeviceTabContent = observer(({
  store,
  onSave,
  onDeviceRemoved,
}: {
  store: DeviceStore;
  onSave: () => void;
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
      onSave();
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
      <div className="dali-deviceToolbar">
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
            onClick={async () => {
              await store.load(true);
              onSave();
            }}
          />
          <Button
            label={t('dali.buttons.reset')}
            variant="danger"
            onClick={() => setIsResetDialogOpen(true)}
          />
          <Button
            label={t('common.buttons.save')}
            disabled={!store.objectStore.isDirty || store.objectStore.hasErrors}
            onClick={async () => {
              await store.save();
              onSave();
            }}
          />
        </FormButtonGroup>
      </div>
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
        onConfirm={runReset}
        closeCallback={() => setIsResetDialogOpen(false)}
      />
    </>
  );
});
