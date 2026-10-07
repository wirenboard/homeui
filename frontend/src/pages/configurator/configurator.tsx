import { observer } from 'mobx-react-lite';
import { type ChangeEvent, useEffect, useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
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
  const [pendingImport, setPendingImport] = useState<ImportFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isClearOpened, setIsClearOpened] = useState(false);
  const [removed, setRemoved] = useState<{ name: string; remove: () => void } | null>(null);
  const [confirmOverwrite, isOverwriteOpened, handleOverwrite, handleOverwriteClose] = useConfirm<any>();
  const { isDirty, isSaving, isLoading, backendState, selectedWb, selectedOwn } = configuratorStore;
  const hasDevices = !!(configuratorStore.wbs.length + configuratorStore.own.length);

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

  return (
    <PageLayout
      title={t('configurator.title')}
      hasRights={authStore.hasRights(UserRole.Operator)}
      isLoading={isLoading}
      errors={loadError ? [{ variant: 'danger', text: loadError, onClose: () => setLoadError(null) }] : []}
      actions={(
        <div className="configurator-headerActions">
          <Tag variant={isDirty ? 'warn' : 'gray'} role="status">
            {isDirty ? t('configurator.labels.dirty') : t('configurator.labels.clean')}
          </Tag>
          {isDirty && (
            <Button variant="secondary" label={t('configurator.buttons.discard')} onClick={configuratorStore.revert} />
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".yaml,.yml"
            className="configurator-fileInput"
            onChange={selectFile}
          />
          <Button
            variant="secondary"
            label={t('configurator.buttons.import')}
            onClick={() => fileInputRef.current?.click()}
          />
          <Button
            variant="secondary"
            label={t('configurator.buttons.export')}
            disabled={!hasDevices}
            onClick={exportConfig}
          />
          <Button
            label={t('configurator.buttons.save')}
            disabled={!isDirty || backendState !== 'available'}
            isLoading={isSaving}
            onClick={save}
          />
        </div>
      )}
    >
      <p className="configurator-subtitle">{t('configurator.labels.subtitle')}</p>
      {backendState === 'unavailable' && (
        <Alert variant="info" size="small" className="configurator-alert">
          {t('configurator.labels.save-unavailable')}
        </Alert>
      )}
      {status && (
        <Alert variant={status.variant} size="small" className="configurator-alert" onClose={() => setStatus(null)}>
          {status.text}
        </Alert>
      )}

      <div className="configurator-layout">
        <DeviceList onAdd={() => setIsAddOpened(true)} onClear={() => setIsClearOpened(true)} />

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
            <Card heading={hasDevices ? t('configurator.labels.select-device') : t('configurator.labels.first-title')}>
              {!hasDevices && <p>{t('configurator.labels.first-text')}</p>}
            </Card>
          )}
        </div>
      </div>

      <AddDialog isOpened={isAddOpened} onClose={() => setIsAddOpened(false)} />

      <Confirm
        isOpened={!!removed}
        heading={t('configurator.labels.remove-title')}
        variant="danger"
        acceptLabel={t('configurator.buttons.remove')}
        closeCallback={() => setRemoved(null)}
        confirmCallback={() => {
          removed.remove();
          setRemoved(null);
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
