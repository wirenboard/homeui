import { observer } from 'mobx-react-lite';
import { type ChangeEvent, useEffect, useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useMediaQuery } from 'react-responsive';
import { Alert } from '@/components/alert';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Confirm, useConfirm } from '@/components/confirm';
import { Tag } from '@/components/tag';
import { PageLayout } from '@/layouts/page';
import { authStore, UserRole } from '@/stores/auth';
import { ConfigFormatError, ConfigParseError, configuratorStore } from '@/stores/configurator';
import { usePreventLeavePage } from '@/utils/prevent-page-leave';
import { AddDialog } from './components/add-dialog';
import { DeviceList } from './components/device-list';
import { NewDevicesAlert } from './components/new-devices-alert';
import { OwnDevicePanel } from './components/own-device-panel';
import { WbDevicePanel } from './components/wb-device-panel';
import type { ImportFile, PageStatus } from './types';
import { liveControls, UNESCAPED } from './utils';
import './styles.css';

const ConfiguratorPage = observer(() => {
  const { t } = useTranslation();
  const { setIsDirty } = usePreventLeavePage();
  const [loadError, setLoadError] = useState<string | null>(null);
  const [status, setStatus] = useState<PageStatus | null>(null);
  const [isAddOpened, setIsAddOpened] = useState(false);
  const [addDeviceId, setAddDeviceId] = useState<string | null>(null);
  const [pendingImport, setPendingImport] = useState<ImportFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const layoutRef = useRef<HTMLDivElement>(null);
  const selectionOnAdd = useRef(configuratorStore.selection);
  const isMobile = useMediaQuery({ maxWidth: 768 });
  const isSingleColumn = useMediaQuery({ maxWidth: 990 });
  const buttonSize = isMobile ? 'small' : 'default';
  const [isPanelShown, setIsPanelShown] = useState(false);
  const [isClearOpened, setIsClearOpened] = useState(false);
  const [removed, setRemoved] = useState<{ name: string; remove: () => void } | null>(null);
  const [confirmOverwrite, isOverwriteOpened, handleOverwrite, handleOverwriteClose] = useConfirm<any>();
  const { isDirty, isSaving, isLoading, backendState, selectedWb, selectedOwn } = configuratorStore;
  const hasDevices = !!(configuratorStore.wbs.length + configuratorStore.own.length);
  // В одну колонку на экране либо список устройств, либо панель выбранного, как в менеджере устройств.
  const isPanelMode = isSingleColumn && isPanelShown && !!(selectedWb || selectedOwn);

  useEffect(() => {
    configuratorStore.load().catch((error) => {
      setLoadError(error instanceof ConfigParseError
        ? t('configurator.errors.parse', { ...UNESCAPED, path: error.path })
        : t('configurator.errors.load', { ...UNESCAPED, error: error.message }));
    });
  }, []);

  useEffect(() => {
    setIsDirty(isDirty);
  }, [isDirty]);

  useEffect(() => {
    if (isPanelMode) {
      layoutRef.current?.scrollIntoView({ block: 'start' });
    }
  }, [isPanelMode]);

  const openAdd = (deviceId: string | null) => {
    selectionOnAdd.current = configuratorStore.selection;
    setAddDeviceId(deviceId);
    setIsAddOpened(true);
  };

  const closeAdd = () => {
    setIsAddOpened(false);
    if (configuratorStore.selection !== selectionOnAdd.current) {
      setIsPanelShown(true);
    }
  };

  const save = async () => {
    setStatus(null);
    try {
      const built = await configuratorStore.save(liveControls, async () => !!(await confirmOverwrite()));
      if (built) {
        const count = built.config.devices.length;
        setStatus({
          variant: 'success',
          text: built.drafts.length
            ? t('configurator.labels.saved-drafts', { ...UNESCAPED, count, drafts: built.drafts.length })
            : t('configurator.labels.saved', { ...UNESCAPED, count }),
        });
      }
    } catch (error) {
      setStatus({ variant: 'danger', text: t('configurator.errors.save', { ...UNESCAPED, error: error.message }) });
    }
  };

  const applyImport = ({ name, text }: ImportFile) => {
    try {
      const count = configuratorStore.importConfig(text);
      setStatus({ variant: 'success', text: t('configurator.labels.imported', { count }) });
    } catch (error) {
      const reason = error instanceof ConfigFormatError ? t('configurator.errors.import-format') : error.message;
      setStatus({ variant: 'danger', text: t('configurator.errors.import', { ...UNESCAPED, name, error: reason }) });
    }
  };

  const selectFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }
    const importFile = { name: file.name, text: await file.text() };
    if (hasDevices) {
      setPendingImport(importFile);
    } else {
      applyImport(importFile);
    }
  };

  const exportConfig = () => {
    const yaml = configuratorStore.toYaml(configuratorStore.build(liveControls).config);
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([yaml], { type: 'text/yaml' }));
    link.download = 'devices.yaml';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const saveButton = (
    <Button
      size={buttonSize}
      label={t('configurator.buttons.save')}
      disabled={!isDirty || backendState !== 'available'}
      isLoading={isSaving}
      onClick={save}
    />
  );

  return (
    <PageLayout
      title={t('configurator.title')}
      hasRights={authStore.hasRights(UserRole.Operator)}
      isLoading={isLoading}
      errors={loadError ? [{ variant: 'danger', text: loadError, onClose: () => setLoadError(null) }] : []}
      actions={isPanelMode ? (
        <div className="configurator-headerActions">
          <Button
            size={buttonSize}
            variant="secondary"
            label={t('configurator.buttons.to-list')}
            onClick={() => setIsPanelShown(false)}
          />
          {saveButton}
        </div>
      ) : (
        <div className="configurator-headerActions">
          <Tag variant={isDirty ? 'warn' : 'gray'} role="status">
            {isDirty ? t('configurator.labels.dirty') : t('configurator.labels.clean')}
          </Tag>
          {isDirty && (
            <Button
              size={buttonSize}
              variant="secondary"
              label={t('configurator.buttons.discard')}
              onClick={configuratorStore.revert}
            />
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".yaml,.yml"
            className="configurator-fileInput"
            onChange={selectFile}
          />
          <Button
            size={buttonSize}
            variant="secondary"
            label={t('configurator.buttons.import')}
            onClick={() => fileInputRef.current?.click()}
          />
          <Button
            size={buttonSize}
            variant="secondary"
            label={t('configurator.buttons.export')}
            disabled={!hasDevices}
            onClick={exportConfig}
          />
          {saveButton}
        </div>
      )}
      stickyHeader
    >
      {!isPanelMode && <p className="configurator-subtitle">{t('configurator.labels.subtitle')}</p>}
      {!isPanelMode && backendState === 'unavailable' && (
        <Alert variant="info" size="small" className="configurator-alert">
          {t('configurator.labels.save-unavailable')}
        </Alert>
      )}
      {status && (
        <Alert variant={status.variant} size="small" className="configurator-alert" onClose={() => setStatus(null)}>
          {status.text}
        </Alert>
      )}

      {!isPanelMode && <NewDevicesAlert onConfigure={openAdd} />}

      <div ref={layoutRef} className="configurator-layout">
        {!isPanelMode && (
          <DeviceList
            onAdd={() => openAdd(null)}
            onClear={() => setIsClearOpened(true)}
            onSelect={() => setIsPanelShown(true)}
          />
        )}

        {(!isSingleColumn || isPanelMode || !hasDevices) && (
          <div className="configurator-editor">
            {selectedWb && (
              <WbDevicePanel
                key={selectedWb.id}
                wb={selectedWb}
                onRemove={(name) => setRemoved({ name, remove: () => configuratorStore.removeWb(selectedWb.id) })}
              />
            )}
            {selectedOwn && (
              <OwnDevicePanel
                key={selectedOwn.id}
                item={selectedOwn}
                onRemove={(name) => setRemoved({ name, remove: () => configuratorStore.removeOwn(selectedOwn.id) })}
              />
            )}
            {!selectedWb && !selectedOwn && (
              <Card
                heading={hasDevices ? t('configurator.labels.select-device') : t('configurator.labels.first-title')}
              >
                {!hasDevices && <p>{t('configurator.labels.first-text')}</p>}
              </Card>
            )}
          </div>
        )}
      </div>

      <AddDialog isOpened={isAddOpened} initialDeviceId={addDeviceId} onClose={closeAdd} />

      <Confirm
        isOpened={!!removed}
        heading={t('configurator.labels.remove-title')}
        variant="danger"
        acceptLabel={t('configurator.buttons.remove')}
        closeCallback={() => setRemoved(null)}
        confirmCallback={() => {
          removed.remove();
          setRemoved(null);
          setIsPanelShown(false);
        }}
      >
        <Trans
          i18nKey="configurator.labels.remove-prompt"
          values={{ name: removed?.name }}
          components={[<b key="device-name" />]}
          shouldUnescape
        />
      </Confirm>

      <Confirm
        isOpened={isClearOpened}
        heading={t('configurator.labels.clear-title')}
        variant="danger"
        acceptLabel={t('configurator.buttons.clear-all')}
        closeCallback={() => setIsClearOpened(false)}
        confirmCallback={() => {
          configuratorStore.clearAll();
          setIsClearOpened(false);
        }}
      >
        {t('configurator.labels.clear-prompt')}
      </Confirm>

      <Confirm
        isOpened={!!pendingImport}
        heading={t('configurator.labels.import-title')}
        acceptLabel={t('configurator.buttons.import')}
        closeCallback={() => setPendingImport(null)}
        confirmCallback={() => {
          applyImport(pendingImport);
          setPendingImport(null);
        }}
      >
        {t('configurator.labels.import-prompt')}
      </Confirm>

      <Confirm
        isOpened={isOverwriteOpened}
        heading={t('configurator.labels.conflict-title')}
        variant="danger"
        acceptLabel={t('configurator.buttons.overwrite')}
        closeCallback={() => handleOverwriteClose(null)}
        confirmCallback={() => handleOverwrite(true)}
      >
        {t('configurator.labels.conflict-prompt')}
      </Confirm>
    </PageLayout>
  );
});

export default ConfiguratorPage;
