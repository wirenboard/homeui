import { observer } from 'mobx-react-lite';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from '@/components/alert';
import { Button } from '@/components/button';
import { StringField } from '@/components/form';
import { PageLayout } from '@/layouts/page';
import { MbGateStore } from '@/pages/settings/configs/mbgate/stores/page-store';
import { authStore, UserRole } from '@/stores/auth';
import { useAsyncAction } from '@/utils/async-action';
import { usePreventLeavePage } from '@/utils/prevent-page-leave';
import { useStore } from '@/utils/use-store';
import {
  CustomEditorBuilderContext,
  Form,
  MakeFormFields,
  ShowParamCaptionContext,
} from '~/react-directives/forms/forms';
import { SelectControls } from './components/select-controls';
import { type MbGatePageProps } from './types';
import './styles.css';

const MbGatePage = observer(({ configsStore, devicesStore, rootScope }: MbGatePageProps) => {
  const { t } = useTranslation();
  const { setIsDirty } = usePreventLeavePage(rootScope);
  const store = useStore(() => new MbGateStore(configsStore, devicesStore));
  const [isSelectOpen, setIsSelectOpen] = useState(false);
  const [configuredControls, setConfiguredControls] = useState<string[]>([]);

  useEffect(() => {
    setIsDirty(store.isDirty);
  }, [store.isDirty]);

  const handleOpenSelect = useCallback(() => {
    setConfiguredControls(store.getConfiguredControls());
    setIsSelectOpen(true);
  }, [store]);

  const handleConfirmSelect = useCallback(
    (selectedControls: string[]) => {
      store.addControls(selectedControls);
      setIsSelectOpen(false);
    },
    [store],
  );

  const handleCloseSelect = useCallback(() => {
    setIsSelectOpen(false);
  }, []);

  const buildRegistersForm = (param, paramName: string) => {
    if (paramName === 'registers') {
      const allConfigured = store.checkAllControlsConfigured();
      return (
        <fieldset>
          <legend className="mbgate-registersHeader">
            <span className="mbgate-registerName">{param.name}</span>
            <Button
              label={t('mbgate.buttons.add')}
              aria-haspopup="dialog"
              disabled={allConfigured}
              onClick={handleOpenSelect}
            />
            {allConfigured && (
              <Alert variant="info" size="small" withIcon={false}>
                {t('mbgate.labels.no-controls')}
              </Alert>
            )}
          </legend>
          <div className="mbgate-registerContent">
            <ShowParamCaptionContext.Provider value={true}>
              {MakeFormFields(Object.entries(param.params))}
            </ShowParamCaptionContext.Provider>
          </div>
        </fieldset>
      );
    }
    if (paramName?.startsWith('topic')) {
      return (
        <div className="mbgate-channelName">
          <StringField
            value={param.value}
            aria-label={param.name}
            error={param.error}
            isDisabled={param.readOnly}
            onChange={(val) => param.setValue(val)}
          />
        </div>
      );
    }
    return null;
  };

  const [save, isSaving] = useAsyncAction(async () => {
    await store.save();
  });

  const [loadData, isLoading] = useAsyncAction(async () => store.loadData());

  useEffect(() => {
    loadData();
  }, []);

  return (
    <>
      <PageLayout
        title={t('mbgate.title')}
        hasRights={authStore.hasRights(UserRole.Admin)}
        isLoading={isLoading}
        errors={store.error ? [{ variant: 'danger', text: store.error }] : []}
        actions={
          <>
            <Button
              label={t('mbgate.buttons.save')}
              disabled={!store.allowSave && !isSaving}
              isLoading={isSaving}
              onClick={() => save()}
            />
          </>
        }
      >
        <div className="mbgate">
          <ShowParamCaptionContext.Provider value={false}>
            <CustomEditorBuilderContext.Provider value={buildRegistersForm}>
              {store.paramsStore.params && <Form store={store.paramsStore} />}
            </CustomEditorBuilderContext.Provider>
          </ShowParamCaptionContext.Provider>
        </div>
      </PageLayout>
      <SelectControls
        isOpen={isSelectOpen}
        configuredControls={configuredControls}
        devicesStore={devicesStore}
        onConfirm={handleConfirmSelect}
        onClose={handleCloseSelect}
      />
    </>
  );
});

export default MbGatePage;
