import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/button';
import { Loader } from '@/components/loader';
import { FormButtonGroup } from '@/components/form';
import { JsonSchemaEditor } from '@/components/json-schema-editor';
import type { DeviceStore } from '@/stores/dali';

export const DeviceTabContent = observer(({ store, onSave }: { store: DeviceStore; onSave: () => void }) => {
  const { t } = useTranslation();
  if (store.isLoading) {
    return (
      <div className="dali-contentLoader">
        <Loader />
      </div>
    );
  }
  return (
    <>
      <FormButtonGroup>
        <Button
          label={t('dali.buttons.reload')}
          onClick={async () => {
            await store.load(true);
            onSave();
          }}
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
      <JsonSchemaEditor
        store={store.objectStore}
        translator={store.translator}
      />
    </>
  );
});
