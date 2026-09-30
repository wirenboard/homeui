import { dump as dumpYaml, load as loadYaml } from 'js-yaml';
import { observer } from 'mobx-react-lite';
import { useEffect, useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import PlusIcon from '@/assets/icons/plus.svg';
import { Alert } from '@/components/alert';
import { Button } from '@/components/button';
import { Confirm } from '@/components/confirm';
import { Dropdown, type Option } from '@/components/dropdown';
import { PageLayout } from '@/layouts/page';
import { authStore, UserRole } from '@/stores/auth';
import { configuratorStore, type DeviceDraft } from '@/stores/configurator';
import { devicesStore } from '@/stores/devices';
import { buildConfig, draftsFromConfig, typeById } from './build-config';
import { ConfigPreview } from './components/config-preview';
import { DeviceCard } from './components/device-card';
import { DiscoveryPanel } from './components/discovery-panel';
import { DEVICE_TYPES } from './templates';
import type { BackendState, Config, PreviewStatus } from './types';
import './styles.css';

const ConfiguratorPage = observer(() => {
  const { t, i18n } = useTranslation();
  const [typePick, setTypePick] = useState(DEVICE_TYPES[0].id);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<PreviewStatus | null>(null);
  const [deletedDevice, setDeletedDevice] = useState<DeviceDraft | null>(null);
  const [isClearConfirmOpened, setIsClearConfirmOpened] = useState(false);

  const importedRef = useRef(false);
  const [savedConfig, setSavedConfig] = useState<Config | null>(null);
  const [backendState, setBackendState] = useState<BackendState>('checking');
  const [hasSavedConfig, setHasSavedConfig] = useState(false);
  const [isConfigLoading, setIsConfigLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const devices = Array.from(devicesStore.devices.values());
  const allCells = devices.flatMap((device) => devicesStore.getDeviceCells(device.id));
  const cellById = new Map(allCells.map((cell) => [cell.id, cell]));
  const cellByTopic = new Map(allCells.map((cell) => [cell.topic, cell.id]));

  // Проверяем, установлен ли бэкенд wb-converter-ext. Без него страница работает автономно
  // («собрать → Скопировать/Скачать YAML»): кнопку «Сохранить» и подгрузку не показываем.
  useEffect(() => {
    let cancelled = false;
    fetch('/converter-ext/status')
      .then((response) => (response.ok ? response.json() : null))
      .then((backendStatus) => {
        if (!cancelled) {
          setBackendState(typeof backendStatus?.has_config === 'boolean' ? 'available' : 'unavailable');
          setHasSavedConfig(backendStatus?.has_config === true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setBackendState('unavailable');
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Если на контроллере уже есть сохранённый конфиг — забираем его.
  useEffect(() => {
    if (!hasSavedConfig) {
      return;
    }
    let cancelled = false;
    setIsConfigLoading(true);
    fetch('/converter-ext/config')
      .then((response) => {
        if (!response.ok) {
          throw new Error(String(response.status));
        }
        return response.text();
      })
      .then((text) => {
        if (cancelled || !text) {
          return;
        }
        const parsed = loadYaml(text) as Config;
        if (!parsed || !Array.isArray(parsed.devices)) {
          throw new Error('devices');
        }
        setSavedConfig(parsed);
      })
      .catch((error) => {
        if (!cancelled) {
          setLoadError(t('configurator.errors.load', { error: error.message }));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsConfigLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [hasSavedConfig]);

  // Разворачиваем конфиг в черновики, когда контролы загрузились (иначе привязки не срослись бы).
  // Один раз и только если оператор ещё ничего не набрал, чтобы не затирать правки.
  useEffect(() => {
    if (importedRef.current || !savedConfig || configuratorStore.devices.length > 0 || allCells.length === 0) {
      return;
    }
    configuratorStore.setDevices(draftsFromConfig(savedConfig, cellByTopic));
    importedRef.current = true;
  }, [savedConfig, allCells.length]);

  const config = buildConfig(configuratorStore.devices, cellById);
  const configYaml = dumpYaml(config, { lineWidth: 120 });

  const boundCellIds = new Set(
    configuratorStore.devices.flatMap((device) => Object.values(device.bindings)),
  );

  const typeLabel = (id: string) => {
    const name = typeById(id)?.name;
    return (i18n.language === 'ru' ? name?.ru : name?.en) ?? id;
  };
  const roleLabel = (role: string) => t(`configurator.roles.${role}`, { defaultValue: role });
  const typeOptions: Option<string>[] = DEVICE_TYPES.map((type) => ({ label: typeLabel(type.id), value: type.id }));

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(configYaml);
      setStatus({ variant: 'success', text: t('configurator.labels.copied') });
    } catch (error) {
      setStatus({ variant: 'danger', text: t('configurator.errors.copy', { error: String(error) }) });
    }
  };

  const handleDownload = () => {
    const blob = new Blob([configYaml], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'wb-convention-config.yaml';
    link.click();
    URL.revokeObjectURL(url);
  };

  // Браузер не может писать в файловую систему контроллера, поэтому конфиг сохраняет бэк:
  // POST на /converter-ext/config (проксируется nginx на сервис wb-converter-ext).
  const handleSave = async () => {
    setSaving(true);
    setStatus(null);
    try {
      const response = await fetch('/converter-ext/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/yaml' },
        body: configYaml,
      });
      if (response.ok) {
        const result = await response.json();
        setStatus({ variant: 'success', text: t('configurator.labels.saved', { count: result.device_count }) });
      } else {
        const detail = await response.text();
        setStatus({ variant: 'danger', text: t('configurator.errors.save', { status: response.status, detail }) });
      }
    } catch (error) {
      setStatus({ variant: 'danger', text: t('configurator.errors.unavailable', { error: String(error) }) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageLayout
      title={t('configurator.title')}
      hasRights={authStore.hasRights(UserRole.Operator)}
      isLoading={isConfigLoading}
      errors={loadError ? [{ variant: 'danger', text: loadError, onClose: () => setLoadError(null) }] : []}
      actions={(
        <Button
          variant="danger"
          label={t('configurator.buttons.clear')}
          disabled={!configuratorStore.devices.length}
          aria-haspopup="dialog"
          onClick={() => setIsClearConfirmOpened(true)}
        />
      )}
    >
      <Alert variant="info" size="small" className="configurator-alert">
        {t('configurator.labels.summary')}
      </Alert>

      <DiscoveryPanel boundCellIds={boundCellIds} typeLabel={typeLabel} roleLabel={roleLabel} />

      <div className="configurator-layout">
        <section className="configurator-main">
          <div className="configurator-add">
            <Dropdown
              className="configurator-typeSelect"
              options={typeOptions}
              value={typePick}
              ariaLabel={t('configurator.labels.device-type')}
              isSearchable
              onChange={(option: Option<string>) => setTypePick(option.value)}
            />
            <Button
              icon={<PlusIcon />}
              label={t('configurator.buttons.add')}
              onClick={() => configuratorStore.addDevice(typePick, typeLabel(typePick))}
            />
          </div>

          {!configuratorStore.devices.length && (
            <p className="configurator-empty">{t('configurator.labels.no-devices')}</p>
          )}

          {configuratorStore.devices.map((device) => {
            const type = typeById(device.type);
            return type && (
              <DeviceCard
                key={device.did}
                device={device}
                type={type}
                typeName={typeLabel(device.type)}
                roleLabel={roleLabel}
                allCells={allCells}
                cellById={cellById}
                onDelete={setDeletedDevice}
              />
            );
          })}
        </section>

        <ConfigPreview
          yaml={configYaml}
          deviceCount={config.devices.length}
          status={status}
          backendState={backendState}
          isSaving={saving}
          onSave={handleSave}
          onCopy={handleCopy}
          onDownload={handleDownload}
          onStatusClose={() => setStatus(null)}
        />
      </div>

      <Confirm
        isOpened={!!deletedDevice}
        heading={t('configurator.labels.delete-title')}
        variant="danger"
        acceptLabel={t('configurator.buttons.delete')}
        closeCallback={() => setDeletedDevice(null)}
        confirmCallback={() => {
          configuratorStore.removeDevice(deletedDevice.did);
          setDeletedDevice(null);
        }}
      >
        <Trans
          i18nKey="configurator.labels.delete-prompt"
          values={{ name: deletedDevice?.name || typeLabel(deletedDevice?.type) }}
          components={[<b key="device-name" />]}
          shouldUnescape
        />
      </Confirm>

      <Confirm
        isOpened={isClearConfirmOpened}
        heading={t('configurator.labels.clear-title')}
        variant="danger"
        acceptLabel={t('configurator.buttons.clear')}
        closeCallback={() => setIsClearConfirmOpened(false)}
        confirmCallback={() => {
          configuratorStore.clear();
          setIsClearConfirmOpened(false);
        }}
      >
        {t('configurator.labels.clear-prompt')}
      </Confirm>
    </PageLayout>
  );
});

export default ConfiguratorPage;
