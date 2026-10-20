import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { useEffect, useState, useCallback, useRef, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { documentation } from '@/common/links';
import { Alert } from '@/components/alert';
import { Confirm, useConfirm } from '@/components/confirm';
import { SearchBar } from '@/components/search-bar';
import { PageLayout } from '@/layouts/page';
import { authStore, UserRole } from '@/stores/auth';
import { AddDeviceModal } from './components/add-device-modal';
import { AddPortModal } from './components/add-port-modal';
import { CopyDeviceModal } from './components/copy-device-modal';
import { DeleteModal } from './components/delete-modal';
import { HeaderButtons } from './components/header-buttons';
import { PageTabs } from './components/page-tabs';
import { callWithForceOnTemplateInUse, formatTemplateOperationError } from './template-errors';
import type { ApplyProblemDevice, ConfigEditorPageProps } from './types';
import './styles.css';

const ConfigEditorPage = observer((
  { pageStore, serialTemplatesProxy, onAddWbDevice, onSearchDisconnectedDevice }: ConfigEditorPageProps,
) => {
  const { t, i18n } = useTranslation();
  const [ searchQuery, setSearchQuery ] = useState('');
  const [ showCopyDeviceModal, isCopyTabOpened, handleCopyTab, handleCopyTabClose ] = useConfirm<any>();
  const [ showAddDeviceModal, isAddDeviceOpened, handleAddDevice, handleAddDeviceClose ] = useConfirm<any>();
  const [ showAddPortModal, isAddPortOpened, handleAddPort, handleAddPortClose ] = useConfirm<any>();
  const [ showDeleteModal, isDeleteModalOpened, handleDelete, handleDeleteClose ] = useConfirm<any>();
  const [
    showRereadConfigModal,
    isRereadConfigOpened,
    handleRereadConfig,
    handleRereadConfigClose,
  ] = useConfirm<any>();
  const [
    showUploadConfirmModal,
    isUploadConfirmOpened,
    handleUploadConfirmAccept,
    handleUploadConfirmClose,
  ] = useConfirm<any>();
  const [
    showTemplateInUseModal,
    isTemplateInUseOpened,
    handleTemplateInUseConfirm,
    handleTemplateInUseClose,
    templateInUsePayload,
  ] = useConfirm<any>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isBusy = pageStore.saving || pageStore.templateOperationPending;

  const handleUploadTemplate = useCallback(async () => {
    if (pageStore.isDirty) {
      pageStore.setError(t('device-manager.labels.template-requires-saved-config'));
      return;
    }
    const confirmed = await showUploadConfirmModal();
    if (confirmed) {
      fileInputRef.current?.click();
    }
  }, [pageStore, showUploadConfirmModal, t]);

  const handleFileSelect = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }
    const fileInput = e.target;
    pageStore.startTemplateOperation();
    try {
      const content = await file.text();
      let parsedContent;
      try {
        parsedContent = JSON.parse(content);
      } catch {
        pageStore.setError(t('device-manager.labels.upload-template-invalid-json'));
        return;
      }
      const filename = file.name;

      const outcome = await callWithForceOnTemplateInUse(
        (force) => serialTemplatesProxy.Upload({ content, filename, lang: i18n.language, force }),
        (classification) => {
          const deviceType = parsedContent?.device_type || filename.replace(/\.json$/, '');
          return showTemplateInUseModal({
            action: 'upload',
            templateName: pageStore.deviceTypesStore.getName(deviceType) || deviceType,
            problems: classification.kind === 'apply-problems' ? classification.problems : undefined,
          }).then(Boolean);
        },
      );
      if (!outcome) {
        return;
      }
      if (outcome.forced) {
        const affectedTypes = new Set<string>(
          outcome.result.types.flatMap((group) => group.types.map((type) => type.type)),
        );
        pageStore.setTemplateAffectedTypes(affectedTypes);
        pageStore.setTemplateHint(t('device-manager.labels.template-sync-hint'));
      }
      await pageStore.reload();
      if (!pageStore.error) {
        pageStore.setTemplateSuccessMessage(t('device-manager.labels.upload-template-success'));
      }
    } catch (err) {
      pageStore.setError(formatTemplateOperationError(t('device-manager.buttons.upload-template'), err));
    } finally {
      pageStore.endTemplateOperation();
      fileInput.value = '';
    }
  }, [pageStore, serialTemplatesProxy, i18n.language, showTemplateInUseModal, t]);

  const handleDeleteTemplate = useCallback(async (deviceType: string) => {
    if (pageStore.isDirty) {
      pageStore.setError(t('device-manager.labels.template-requires-saved-config'));
      return;
    }
    pageStore.startTemplateOperation();
    try {
      const outcome = await callWithForceOnTemplateInUse(
        (force) => serialTemplatesProxy.Delete({ type: deviceType, lang: i18n.language, force }),
        (classification) => showTemplateInUseModal({
          action: 'delete',
          templateName: pageStore.deviceTypesStore.getName(deviceType) || deviceType,
          problems: classification.kind === 'apply-problems' ? classification.problems : undefined,
        }).then(Boolean),
      );
      if (!outcome) {
        return;
      }
      if (outcome.forced) {
        pageStore.setTemplateAffectedTypes(new Set<string>([deviceType]));
        pageStore.setTemplateHint(t('device-manager.labels.template-sync-hint'));
      }
      await pageStore.reload();
      if (!pageStore.error) {
        pageStore.setTemplateSuccessMessage(t('device-manager.labels.delete-template-success'));
      }
    } catch (err) {
      pageStore.setError(formatTemplateOperationError(t('device-manager.buttons.delete-template'), err));
    } finally {
      pageStore.endTemplateOperation();
    }
  }, [pageStore, serialTemplatesProxy, i18n.language, showTemplateInUseModal, t]);

  const renderProblemDeviceGroup = (labelKey: string, devices: ApplyProblemDevice[]) => {
    if (devices.length === 0) {
      return null;
    }
    return (
      <div className="applyProblems-group">
        <p>{t(labelKey)}:</p>
        <ul>
          {devices.map((device) => (
            <li key={`${device.port}-${device.slave_id}`}>
              {t('device-manager.labels.apply-problems-device', {
                port: device.port,
                slaveId: device.slave_id,
                interpolation: { escapeValue: false },
              })}
            </li>
          ))}
        </ul>
      </div>
    );
  };

  useEffect(() => {
    if (pageStore.pendingAddDeviceRequest) {
      pageStore.clearAddDeviceRequest();
      pageStore.addDevice(showAddDeviceModal);
    }
  }, [pageStore.pendingAddDeviceRequest]);

  const isMobile = pageStore.tabs.mobileModeStore.inMobileMode;
  const showSearch = !pageStore.tabs.isEmpty
    && (!isMobile || pageStore.tabs.mobileModeStore.tabsPanelIsActive);

  return (
    <>
      <PageLayout
        title={t('device-manager.labels.title')}
        infoLink={documentation[i18n.language]?.serial}
        hasRights={authStore.hasRights(UserRole.Admin)}
        errors={[
            ...(pageStore.error ? [{ variant: 'danger', text: pageStore.error }] : []),
            ...(pageStore.templateSuccessMessage
                ? [{
                    variant: 'success',
                    text: pageStore.templateSuccessMessage,
                    onClose: () => pageStore.clearTemplateSuccessMessage(),
                }]
                : []),
        ]}
        isLoading={pageStore.loading || isBusy}
        loadingOptions={
            isBusy ? { overlay: true, showActions: true } : undefined
        }
        titleArea={isMobile && showSearch && (
          <SearchBar
            value={searchQuery}
            placeholder={t('device-manager.labels.search')}
            ariaLabel={t('device-manager.labels.search')}
            onChange={setSearchQuery}
          />
        )}
        actions={
          (!pageStore.loading) && (
            <>
              {!isMobile && showSearch && (
                <SearchBar
                  value={searchQuery}
                  placeholder={t('device-manager.labels.search')}
                  ariaLabel={t('device-manager.labels.search')}
                  onChange={setSearchQuery}
                />
              )}
              <HeaderButtons
                allowSave={pageStore.allowSave}
                isSaving={isBusy}
                allowAddDevice={pageStore.tabs.hasPortTabs}
                mobileModeStore={pageStore.tabs.mobileModeStore}
                onSave={() => pageStore.save()}
                onAddDevice={() => pageStore.addDevice(showAddDeviceModal)}
                onAddWbDevice={onAddWbDevice}
                onAddPort={() => pageStore.addPort(showAddPortModal)}
              />
            </>
          )
        }
      >
        <div
          className={classNames('deviceManagerPage', {
            mobile: pageStore.tabs.mobileModeStore.inMobileMode,
          })}
        >
          {!pageStore.tabs.isEmpty && (
            <PageTabs
              tabs={pageStore.tabs.items}
              selectedIndex={pageStore.tabs.selectedTabIndex}
              deviceTypeSelectOptions={
                pageStore.deviceTypesStore.deviceTypeDropdownOptions
              }
              mobileModeStore={pageStore.tabs.mobileModeStore}
              searchQuery={searchQuery}
              isUserDefinedTypeFn={(type) =>
                pageStore.deviceTypesStore.isUserDefined(type)
              }
              templateOperationPending={pageStore.templateOperationPending}
              templateHint={pageStore.templateHint}
              templateAffectedTypes={pageStore.templateAffectedTypes}
              onSelect={(index) => pageStore.tabs.onSelectTab(index)}
              onDeleteTab={() => pageStore.deleteTab(showDeleteModal)}
              onDeletePortDevices={() =>
                pageStore.deletePortDevices(showDeleteModal)
              }
              onCopyTab={() => pageStore.copyTab(showCopyDeviceModal)}
              onDeviceTypeChange={(tab, type) =>
                pageStore.changeDeviceType(tab, type)
              }
              onSearchDisconnectedDevice={onSearchDisconnectedDevice}
              onUpdateFirmware={() => pageStore.updateFirmware()}
              onUpdateBootloader={() => pageStore.updateBootloader()}
              onUpdateComponents={() => pageStore.updateComponents()}
              onReadRegisters={(tab, isForce) =>
                pageStore.readRegisters(
                  tab,
                  isForce,
                  showRereadConfigModal,
                )
              }
              onClearTemplateHint={() => pageStore.clearTemplateHint()}
              onDeleteTemplate={handleDeleteTemplate}
              onUploadTemplate={handleUploadTemplate}
            />
          )}
        </div>
      </PageLayout>
      <input
        type="file"
        ref={fileInputRef}
        accept=".json"
        tabIndex={-1}
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />
      {isDeleteModalOpened && (
        <DeleteModal
          selectedTab={pageStore.tabs.selectedTab}
          isOpened={isDeleteModalOpened}
          onDelete={handleDelete}
          onClose={handleDeleteClose}
        />
      )}
      {isCopyTabOpened && (
        <CopyDeviceModal
          isOpened={isCopyTabOpened}
          currentPort={pageStore.tabs.selectedPortTab}
          portOptions={pageStore.getPortOptions()}
          onCopy={handleCopyTab}
          onClose={handleCopyTabClose}
        />
      )}
      {isAddDeviceOpened && (
        <AddDeviceModal
          isOpened={isAddDeviceOpened}
          currentPort={pageStore.tabs.selectedPortTab}
          portOptions={pageStore.getPortOptions()}
          deviceOptions={
            pageStore.deviceTypesStore.deviceTypeDropdownOptions
          }
          onSave={handleAddDevice}
          onClose={handleAddDeviceClose}
        />
      )}
      {isRereadConfigOpened && (
        <Confirm
          isOpened={isRereadConfigOpened}
          variant="danger"
          width={600}
          heading={t('device-manager.labels.reread-config-title')}
          acceptLabel={t('device-manager.buttons.reread-config')}
          confirmCallback={() => handleRereadConfig(true)}
          closeCallback={() => handleRereadConfigClose()}
        >
          {t('device-manager.labels.uncommitted-settings')}
        </Confirm>
      )}
      {isUploadConfirmOpened && (
        <Confirm
          isOpened={isUploadConfirmOpened}
          variant="primary"
          width={500}
          heading={t('device-manager.labels.upload-template-title')}
          acceptLabel={t('device-manager.buttons.upload-template')}
          confirmCallback={() => handleUploadConfirmAccept(true)}
          closeCallback={() => handleUploadConfirmClose()}
        >
          {t('device-manager.labels.upload-template-warning')}
        </Confirm>
      )}
      {isTemplateInUseOpened && (
        <Confirm
          isOpened={isTemplateInUseOpened}
          variant="danger"
          width={500}
          heading={t(
            templateInUsePayload?.action === 'delete'
              ? 'device-manager.labels.template-in-use-delete-title'
              : 'device-manager.labels.template-in-use-upload-title',
          )}
          acceptLabel={t(
            templateInUsePayload?.action === 'delete'
              ? 'device-manager.buttons.delete'
              : 'device-manager.buttons.overwrite-template',
          )}
          confirmCallback={() => handleTemplateInUseConfirm(true)}
          closeCallback={() => handleTemplateInUseClose()}
        >
          {templateInUsePayload?.problems ? (
            <>
              <p>
                {t(
                  templateInUsePayload.action === 'delete'
                    ? 'device-manager.labels.apply-problems-intro-delete'
                    : 'device-manager.labels.apply-problems-intro-upload',
                  { item: templateInUsePayload.templateName, interpolation: { escapeValue: false } },
                )}
              </p>
              {renderProblemDeviceGroup(
                'device-manager.labels.apply-problems-disabled',
                templateInUsePayload.problems.disabled_devices,
              )}
              {renderProblemDeviceGroup(
                'device-manager.labels.apply-problems-unread',
                templateInUsePayload.problems.unread_devices,
              )}
              {renderProblemDeviceGroup(
                'device-manager.labels.apply-problems-invalid',
                templateInUsePayload.problems.invalid_devices,
              )}
              {templateInUsePayload.problems.invalid_devices.length > 0 && (
                <Alert variant="danger" size="small">
                  {t('device-manager.labels.apply-problems-invalid-warning')}
                </Alert>
              )}
            </>
          ) : (
            t(
              templateInUsePayload?.action === 'delete'
                ? 'device-manager.labels.confirm-template-in-use-delete'
                : 'device-manager.labels.confirm-template-in-use-upload',
              {
                item: templateInUsePayload?.templateName,
                interpolation: { escapeValue: false },
              },
            )
          )}
        </Confirm>
      )}
      {isAddPortOpened && (
        <AddPortModal
          isOpened={isAddPortOpened}
          portOptions={pageStore.getPortTypeSelectOptions()}
          onSave={handleAddPort}
          onClose={handleAddPortClose}
        />
      )}
    </>
  );
});

export default ConfigEditorPage;
