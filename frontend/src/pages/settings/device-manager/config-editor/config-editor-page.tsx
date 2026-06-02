import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { documentation } from '@/common/links';
import { useConfirm } from '@/components/confirm';
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

const ConfigEditorPage = observer(({ pageStore, onAddWbDevice, onSearchDisconnectedDevice }: ConfigEditorPageProps) => {
  const { t, i18n } = useTranslation();
  const [ showCopyDeviceModal, isCopyTabOpened, handleCopyTab, handleCopyTabClose ] = useConfirm<any>();
  const [ showAddDeviceModal, isAddDeviceOpened, handleAddDevice, handleAddDeviceClose ] = useConfirm<any>();
  const [ showAddPortModal, isAddPortOpened, handleAddPort, handleAddPortClose ] = useConfirm<any>();
  const [ showDeleteModal, isDeleteModalOpened, handleDelete, handleDeleteClose ] = useConfirm<any>();

  return (
    <>
      <PageLayout
        title={t('device-manager.labels.title')}
        infoLink={documentation[i18n.language]?.serial}
        hasRights={authStore.hasRights(UserRole.Admin)}
        errors={pageStore.error ? [{ variant: 'danger', text: pageStore.error }] : []}
        isLoading={pageStore.loading || pageStore.saving}
        loadingOptions={pageStore.saving ? { overlay: true, showActions: true } : undefined}
        actions={
          (!pageStore.loading && pageStore.loaded) && (
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
        <div className={classNames('deviceManagerPage', { mobile: pageStore.tabs.mobileModeStore.inMobileMode })}>
          {!pageStore.tabs.isEmpty && (
            <PageTabs
              tabs={pageStore.tabs.items}
              selectedIndex={pageStore.tabs.selectedTabIndex}
              showButtons={!pageStore.loading && pageStore.loaded}
              deviceTypeSelectOptions={pageStore.deviceTypesStore.deviceTypeDropdownOptions}
              mobileModeStore={pageStore.tabs.mobileModeStore}
              onSelect={(index) => pageStore.tabs.onSelectTab(index)}
              onDeleteTab={() => pageStore.deleteTab(showDeleteModal)}
              onDeletePortDevices={() => pageStore.deletePortDevices(showDeleteModal)}
              onCopyTab={() => pageStore.copyTab(showCopyDeviceModal)}
              onAddPort={() => pageStore.addPort(showAddPortModal)}
              onDeviceTypeChange={(tab, type) => pageStore.changeDeviceType(tab, type)}
              onSearchDisconnectedDevice={onSearchDisconnectedDevice}
              onUpdateFirmware={() => pageStore.updateFirmware()}
              onUpdateBootloader={() => pageStore.updateBootloader()}
              onUpdateComponents={() => pageStore.updateComponents()}
              onReadRegisters={(tab, isForce) => pageStore.readRegisters(tab, isForce)}
            />
          )}
        </div>
      </PageLayout>
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
          deviceOptions={pageStore.deviceTypesStore.deviceTypeDropdownOptions}
          onSave={handleAddDevice}
          onClose={handleAddDeviceClose}
        />
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
