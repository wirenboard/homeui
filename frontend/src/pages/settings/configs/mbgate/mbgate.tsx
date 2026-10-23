import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMediaQuery } from 'react-responsive';
import SettingsIcon from '@/assets/icons/settings.svg';
import WarnIcon from '@/assets/icons/warn.svg';
import { documentation } from '@/common/links';
import { Alert } from '@/components/alert';
import { Button } from '@/components/button';
import { Confirm } from '@/components/confirm';
import { Dropdown, type Option } from '@/components/dropdown';
import { StringField } from '@/components/form';
import {
  CustomEditorBuilderContext,
  MakeFormFields,
  ShowParamCaptionContext,
} from '@/components/json-editor/forms';
import { Tabs, TabContent } from '@/components/tabs';
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

const MAIN_PORT_TAB = 'main';
const SETTINGS_TAB = 'settings';

const additionalPortTab = (index: number) => `port-${index}`;

function formatPortBinding(binding?: Record<string, any>) {
  if (!binding) {
    return '';
  }
  if (binding.path) {
    return `RTU ${binding.path}`;
  }
  return `TCP ${binding.host ?? ''}:${binding.port ?? ''}`;
}

const MbGatePage = observer(() => {
  const { t, i18n } = useTranslation();
  const { setIsDirty } = usePreventLeavePage();
  const store = useStore(() => new MbGateStore(configsStore, devicesStore));
  const [isSelectOpen, setIsSelectOpen] = useState(false);
  const [configuredControls, setConfiguredControls] = useState<string[]>([]);
  const [registerType, setRegisterType] = useState<RegisterTypeSelection>('auto');
  const [activeTab, setActiveTab] = useState<string>(MAIN_PORT_TAB);
  const [targetRegisters, setTargetRegisters] = useState(null);
  const [portToDelete, setPortToDelete] = useState<number | null>(null);
  const isMobile = useMediaQuery({ maxWidth: 991 });
  const [isTabListShown, setIsTabListShown] = useState(true);

  useEffect(() => {
    setIsTabListShown(true);
  }, [isMobile]);

  // On mobile the tab list and the selected tab content are shown one at a time
  const showTabList = !isMobile || isTabListShown;
  const showContent = !isMobile || !isTabListShown;

  const selectTab = (tab: string) => {
    setActiveTab(tab);
    setIsTabListShown(false);
  };

  useEffect(() => {
    setIsDirty(store.isDirty);
  }, [store.isDirty]);

  const addMenuOptions: Option<RegisterTypeSelection>[] = REGISTER_TYPE_SELECTIONS.map((value) => ({
    value,
    label: t(`mbgate.labels.register-types.${value}`),
  }));

  const handleOpenSelect = useCallback((option: Option<RegisterTypeSelection>, registersStore) => {
    if (!option?.value) {
      return;
    }
    setRegisterType(option.value);
    setTargetRegisters(registersStore);
    setConfiguredControls(store.getConfiguredControls(registersStore));
    setIsSelectOpen(true);
  }, [store]);

  const handleConfirmSelect = useCallback(
    (selectedControls: string[]) => {
      store.addControls(selectedControls, registerType, targetRegisters);
      setIsSelectOpen(false);
    },
    [store, registerType, targetRegisters],
  );

  const handleCloseSelect = useCallback(() => {
    setIsSelectOpen(false);
  }, []);

  const buildRegistersForm = (param, paramName: string) => {
    if (paramName === 'registers') {
      const allConfigured = store.checkAllControlsConfigured(param);
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
              onChange={(option: Option<RegisterTypeSelection>) => handleOpenSelect(option, param)}
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

  const params = store.paramsStore.params;

  const getAdditionalPortName = (index: number) =>
    store.additionalPorts[index]?.params.name?.value || t('mbgate.labels.additional-port', { number: index + 1 });

  const portToDeleteName = portToDelete !== null ? getAdditionalPortName(portToDelete) : '';

  // Port numbering follows store.portConflicts: 0 is the main port, i + 1 is additional port i
  const getPortName = (portNumber: number) =>
    portNumber === 0 ? t('mbgate.labels.main-port') : getAdditionalPortName(portNumber - 1);

  const portConflicts = store.portConflicts;

  const renderPortTab = (portNumber: number, binding?: Record<string, any>) => (
    <div className="mbgate-portTab">
      <span className="mbgate-portTabName">
        {getPortName(portNumber)}
        {!!portConflicts[portNumber]?.length && <WarnIcon className="mbgate-portTabWarn" />}
      </span>
      <span className="mbgate-portTabDetails">{formatPortBinding(binding)}</span>
    </div>
  );

  const renderPortConflict = (portNumber: number) =>
    !!portConflicts[portNumber]?.length && (
      <Alert variant="danger" className="mbgate-portConflict">
        {t('mbgate.errors.port-conflict', {
          ports: portConflicts[portNumber].map((other) => `«${getPortName(other)}»`).join(', '),
        })}
      </Alert>
    );

  const tabs = params
    ? [
      {
        id: MAIN_PORT_TAB,
        label: renderPortTab(0, params.modbus?.value),
      },
      ...store.additionalPorts.map((port, index) => ({
        id: additionalPortTab(index),
        label: renderPortTab(index + 1, port.params.modbus?.value),
      })),
      {
        id: SETTINGS_TAB,
        label: (
          <div className="mbgate-settingsTab">
            <SettingsIcon className="mbgate-settingsTabIcon" />
            <span>{t('mbgate.labels.settings')}</span>
          </div>
        ),
      },
    ]
    : [];

  return (
    <>
      <PageLayout
        title={t('mbgate.title')}
        infoLink={documentation[i18n.language]?.mbgate}
        hasRights={authStore.hasRights(UserRole.Admin)}
        isLoading={isLoading}
        errors={store.error ? [{ variant: 'danger', text: store.error }] : []}
        actions={
          showContent && isMobile ? (
            <Button
              label={t('mbgate.buttons.to-port-list')}
              variant="secondary"
              onClick={() => setIsTabListShown(true)}
            />
          ) : (
            <>
              {params && (
                <Button
                  label={t('mbgate.buttons.add-port')}
                  variant="secondary"
                  onClick={() => selectTab(additionalPortTab(store.addPort()))}
                />
              )}
              <Button
                label={t('mbgate.buttons.save')}
                disabled={!store.allowSave && !isSaving}
                isLoading={isSaving}
                onClick={() => save()}
              />
            </>
          )
        }
      >
        {params && (
          <div className={classNames('mbgate', { 'mbgate-mobile': isMobile })}>
            {showTabList && (
              <div className="mbgate-tabList">
                <Tabs activeTab={activeTab} items={tabs} isEllipsis={false} onTabChange={selectTab} />
              </div>
            )}
            <div className="mbgate-tabContent" hidden={!showContent}>
              <ShowParamCaptionContext.Provider value={true}>
                <CustomEditorBuilderContext.Provider value={buildRegistersForm}>
                  <TabContent activeTab={activeTab} tabId={MAIN_PORT_TAB}>
                    {renderPortConflict(0)}
                    <div className="form-content">
                      {MakeFormFields([['modbus', params.modbus], ['registers', params.registers]])}
                    </div>
                  </TabContent>
                  {store.additionalPorts.map((port, index) => (
                    <TabContent key={index} activeTab={activeTab} tabId={additionalPortTab(index)}>
                      <div className="mbgate-portHeader">
                        <Button
                          label={t('mbgate.buttons.delete-port')}
                          variant="danger"
                          aria-haspopup="dialog"
                          onClick={() => setPortToDelete(index)}
                        />
                      </div>
                      {renderPortConflict(index + 1)}
                      <div className="form-content">
                        {MakeFormFields([
                          ['name', port.params.name],
                          ['modbus', port.params.modbus],
                          ['registers', port.params.registers],
                        ])}
                      </div>
                    </TabContent>
                  ))}
                  <TabContent activeTab={activeTab} tabId={SETTINGS_TAB}>
                    <div className="form-content">
                      {MakeFormFields([['debug', params.debug], ['mqtt', params.mqtt]])}
                    </div>
                  </TabContent>
                </CustomEditorBuilderContext.Provider>
              </ShowParamCaptionContext.Provider>
            </div>
          </div>
        )}
      </PageLayout>
      <Confirm
        isOpened={portToDelete !== null}
        heading={t('mbgate.labels.delete-port')}
        variant="danger"
        acceptLabel={t('mbgate.buttons.delete-port')}
        closeCallback={() => setPortToDelete(null)}
        confirmCallback={() => {
          store.removePort(portToDelete);
          setPortToDelete(null);
          setActiveTab(MAIN_PORT_TAB);
          setIsTabListShown(true);
        }}
      >
        {t('mbgate.labels.delete-port-confirm', { name: portToDeleteName })}
      </Confirm>
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
