import { observer } from 'mobx-react-lite';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { documentation } from '@/common/links';
import { Alert } from '@/components/alert';
import { Button } from '@/components/button';
import { Dropdown, type Option } from '@/components/dropdown';
import { StringField } from '@/components/form';
import {
  CustomEditorBuilderContext,
  Form,
  MakeFormFields,
  ShowParamCaptionContext,
} from '@/components/json-editor/forms';
import { PageLayout } from '@/layouts/page';
import { MbGateStore } from '@/pages/settings/configs/mbgate/stores/page-store';
import {
  REGISTER_TYPE_SELECTIONS,
  type RegisterTypeSelection,
} from '@/pages/settings/configs/mbgate/stores/types';
import { authStore, UserRole } from '@/stores/auth';
import { configsStore } from '@/stores/configs';
import { devicesStore } from '@/stores/devices';
import { useAsyncAction } from '@/utils/async-action';
import { usePreventLeavePage } from '@/utils/prevent-page-leave';
import { useStore } from '@/utils/use-store';
import { SelectControls } from './components/select-controls';
import './styles.css';

const MbGatePage = observer(() => {
  const { t, i18n } = useTranslation();
  const { setIsDirty } = usePreventLeavePage();
  const store = useStore(() => new MbGateStore(configsStore, devicesStore));
  const [isSelectOpen, setIsSelectOpen] = useState(false);
  const [configuredControls, setConfiguredControls] = useState<string[]>([]);
  const [registerType, setRegisterType] = useState<RegisterTypeSelection>('auto');

  useEffect(() => {
    setIsDirty(store.isDirty);
  }, [store.isDirty]);

  const addMenuOptions: Option<RegisterTypeSelection>[] = REGISTER_TYPE_SELECTIONS.map((value) => ({
    value,
    label: t(`mbgate.labels.register-types.${value}`),
  }));

  const handleOpenSelect = useCallback((option: Option<RegisterTypeSelection>) => {
    if (!option?.value) {
      return;
    }
    setRegisterType(option.value);
    setConfiguredControls(store.getConfiguredControls());
    setIsSelectOpen(true);
  }, [store]);

  const handleConfirmSelect = useCallback(
    (selectedControls: string[]) => {
      store.addControls(selectedControls, registerType);
      setIsSelectOpen(false);
    },
    [store, registerType],
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
            <Dropdown
              className="mbgate-addMenu"
              value={null}
              options={addMenuOptions}
              placeholder={t('mbgate.buttons.add')}
              ariaLabel={t('mbgate.buttons.add')}
              isDisabled={allConfigured}
              isButton
              onChange={handleOpenSelect}
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
        infoLink={documentation[i18n.language]?.mbgate}
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
        registerType={registerType}
        onConfirm={handleConfirmSelect}
        onClose={handleCloseSelect}
      />
    </>
  );
});

export default MbGatePage;
