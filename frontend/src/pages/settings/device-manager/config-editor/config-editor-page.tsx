import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { type ChangeEvent, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { documentation } from '@/common/links';
import { Confirm, useConfirm } from '@/components/confirm';
import { PageLayout } from '@/layouts/page';
import { authStore, UserRole } from '@/stores/auth';
import { AddDeviceModal } from './components/add-device-modal';
import { AddPortModal } from './components/add-port-modal';
import { CopyDeviceModal } from './components/copy-device-modal';
import { DeleteModal } from './components/delete-modal';
import { HeaderButtons } from './components/header-buttons';
import { PageTabs } from './components/page-tabs';
import type { ConfigEditorPageProps } from './types';
import './styles.css';

const isTemplateInUseError = (err: unknown): boolean =>
  typeof err === 'object' && err !== null && (err as any).data === 'template-in-use';

const ConfigEditorPage = observer((
  { pageStore, serialTemplatesProxy, onAddWbDevice, onSearchDisconnectedDevice }: ConfigEditorPageProps,
) => {
  const { t, i18n } = useTranslation();
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

  const handleUploadTemplate = useCallback(async () => {
    const confirmed = await showUploadConfirmModal();
    if (confirmed) {
      fileInputRef.current?.click();
    }
  }, [showUploadConfirmModal]);

  const handleFileSelect = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }
    const fileInput = e.target;
    pageStore.startTemplateOperation();
    try {
      const content = await file.text();
      JSON.parse(content);
      const filename = file.name;

      let result;
      try {
        result = await serialTemplatesProxy.Upload({
          content,
          filename,
          lang: i18n.language,
        });
      } catch (uploadErr) {
        if (!isTemplateInUseError(uploadErr)) {
          throw uploadErr;
        }
        const deviceType = filename.replace(/\.json$/, '');
        const confirmed = await showTemplateInUseModal({
          action: 'upload',
          templateName:
            pageStore.deviceTypesStore.getName(deviceType) || deviceType,
        });
        if (!confirmed) {
          pageStore.endTemplateOperation();
          return;
        }
        result = await serialTemplatesProxy.Upload({
          content,
          filename,
          lang: i18n.language,
          force: true,
        });
      }
      pageStore.deviceTypesStore.mergeDeviceTypes(result.types);
      const affectedTypes = new Set<string>(result.types.flatMap((g) => g.types.map((t) => t.type)));
      await pageStore.refreshDeviceTypeSchemas(affectedTypes);
      await pageStore.save();
      pageStore.endTemplateOperation();
    } catch (err) {
      pageStore.endTemplateOperation(err);
    } finally {
      fileInput.value = '';
    }
  }, [pageStore, serialTemplatesProxy, i18n.language, showTemplateInUseModal]);

  const handleDeleteTemplate = useCallback(async (deviceType: string) => {
    pageStore.startTemplateOperation();
    try {
      let result;
      try {
        result = await serialTemplatesProxy.Delete({
          type: deviceType,
          lang: i18n.language,
        });
      } catch (deleteErr) {
        if (!isTemplateInUseError(deleteErr)) {
          throw deleteErr;
        }
        const confirmed = await showTemplateInUseModal({
          action: 'delete',
          templateName:
            pageStore.deviceTypesStore.getName(deviceType) || deviceType,
        });
        if (!confirmed) {
          pageStore.endTemplateOperation();
          return;
        }
        result = await serialTemplatesProxy.Delete({
          type: deviceType,
          lang: i18n.language,
          force: true,
        });
      }
      pageStore.deviceTypesStore.removeDeviceType(deviceType);
      for (const group of result.types) {
        for (const type of group.types) {
          if (type.type === deviceType) {
            delete type['user-defined'];
          }
        }
      }
      pageStore.deviceTypesStore.mergeDeviceTypes(result.types);
      await pageStore.refreshDeviceTypeSchemas(new Set<string>([deviceType]));
      pageStore.endTemplateOperation();
    } catch (err) {
      pageStore.endTemplateOperation(err);
    }
  }, [pageStore, serialTemplatesProxy, i18n.language, showTemplateInUseModal]);

  return (
    <>
      <PageLayout
        title={t('device-manager.labels.title')}
        infoLink={documentation[i18n.language]?.serial}
        hasRights={authStore.hasRights(UserRole.Admin)}
        errors={
          pageStore.error
            ? [{ variant: 'danger', text: pageStore.error }]
            : []
        }
        isLoading={pageStore.loading || pageStore.saving}
        loadingOptions={
          pageStore.saving ? { overlay: true, showActions: true } : undefined
        }
        actions={
          (!pageStore.loading) && (
            <HeaderButtons
              allowSave={pageStore.allowSave}
              isSaving={pageStore.saving}
              allowAddDevice={pageStore.tabs.hasPortTabs}
              mobileModeStore={pageStore.tabs.mobileModeStore}
              onSave={() => pageStore.save()}
              onAddDevice={() => pageStore.addDevice(showAddDeviceModal)}
              onAddWbDevice={onAddWbDevice}
            />
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
              showButtons={!pageStore.loading}
              deviceTypeSelectOptions={
                pageStore.deviceTypesStore.deviceTypeDropdownOptions
              }
              mobileModeStore={pageStore.tabs.mobileModeStore}
              isUserDefinedTypeFn={(type) =>
                pageStore.deviceTypesStore.isUserDefined(type)
              }
              templateOperationPending={pageStore.templateOperationPending}
              templateError={pageStore.templateError}
              onSelect={(index) => pageStore.tabs.onSelectTab(index)}
              onDeleteTab={() => pageStore.deleteTab(showDeleteModal)}
              onDeletePortDevices={() =>
                pageStore.deletePortDevices(showDeleteModal)
              }
              onCopyTab={() => pageStore.copyTab(showCopyDeviceModal)}
              onAddPort={() => pageStore.addPort(showAddPortModal)}
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
              onClearTemplateError={() => pageStore.clearTemplateError()}
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
          {t(
            templateInUsePayload?.action === 'delete'
              ? 'device-manager.labels.confirm-template-in-use-delete'
              : 'device-manager.labels.confirm-template-in-use-upload',
            {
              item: templateInUsePayload?.templateName,
              interpolation: { escapeValue: false },
            },
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
