import { observer } from 'mobx-react-lite';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import CodeIcon from '@/assets/icons/code.svg';
import CollapseIcon from '@/assets/icons/collapse.svg';
import ExpandIcon from '@/assets/icons/expand.svg';
import ModbusIcon from '@/assets/icons/modbus.svg';
import SystemDeviceIcon from '@/assets/icons/system-device.svg';
import TrashIcon from '@/assets/icons/trash.svg';
import ZigbeeIcon from '@/assets/icons/zigbee.svg';
import { Alert } from '@/components/alert';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Cell } from '@/components/cell';
import { ColumnsWrapper, useMaxColumns, MIN_COLUMN_WIDTH } from '@/components/columns-wrapper';
import { Confirm } from '@/components/confirm';
import { Dropdown, type Option } from '@/components/dropdown';
import { Tooltip } from '@/components/tooltip';
import { PageLayout } from '@/layouts/page';
import { ColumnsEditor } from '@/pages/dashboards/[slug]/components/columns-editor';
import { authStore, UserRole } from '@/stores/auth';
import { devicesStore, DeviceType } from '@/stores/devices';
import { readViewPreferences, writeViewPreferences } from '@/utils/view-preferences';
import './styles.css';

const VIEW_KEY = 'devices';

interface DevicesViewPrefs {
  columns: number | null;
  order: string[][] | null;
}

const DEFAULTS: DevicesViewPrefs = { columns: null, order: null };

function readPrefs(): DevicesViewPrefs {
  const prefs = readViewPreferences(VIEW_KEY, DEFAULTS);
  if (prefs.columns !== null && (!Number.isFinite(prefs.columns) || prefs.columns < 1)) {
    prefs.columns = null;
  }
  if (prefs.order !== null && !Array.isArray(prefs.order)) {
    prefs.order = null;
  }
  return prefs;
}

function savePrefs(prefs: DevicesViewPrefs) {
  writeViewPreferences(VIEW_KEY, prefs, DEFAULTS);
}

function distributeToColumns(flat: string[], count: number): string[][] {
  const unique = [...new Set(flat)];
  const result: string[][] = Array.from({ length: count }, () => []);
  unique.forEach((id, i) => result[i % count].push(id));
  return result;
}

function reconcileOrder(deviceIds: string[], savedOrder: string[][]): string[][] {
  const available = new Set(deviceIds);
  const columns: string[][] = [];
  for (const col of savedOrder) {
    const filtered: string[] = [];
    for (const id of col) {
      if (available.has(id)) {
        filtered.push(id);
        available.delete(id);
      }
    }
    columns.push(filtered);
  }
  if (available.size > 0) {
    available.forEach((id) => {
      const shortest = columns.reduce((a, b) => (a.length <= b.length ? a : b));
      shortest.push(id);
    });
  }
  return columns;
}

const DevicesPage = observer(() => {
  const { t } = useTranslation();
  const [deletedDeviceId, setDeletedDeviceId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<DevicesViewPrefs>(readPrefs);
  const [isEditLayout, setIsEditLayout] = useState(false);
  const [draftOrder, setDraftOrder] = useState<string[][] | null>(null);
  const [draftColumnCount, setDraftColumnCount] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const maxColumns = useMaxColumns(containerRef, devicesStore.filteredDevices.size > 0);

  useEffect(() => {
    if (prefs.columns !== null && prefs.columns > maxColumns) {
      const next = { ...prefs, columns: maxColumns };
      setPrefs(next);
      savePrefs(next);
    }
  }, [maxColumns, prefs]);

  const startEditLayout = useCallback(() => {
    const ids = Array.from(devicesStore.filteredDevices.keys());
    const cols = prefs.columns ?? Math.max(1, maxColumns);
    if (prefs.order) {
      const reconciled = reconcileOrder(ids, prefs.order);
      setDraftOrder(reconciled.length === cols
        ? reconciled
        : distributeToColumns(reconciled.flat(), cols));
    } else {
      setDraftOrder(distributeToColumns(ids, cols));
    }
    setDraftColumnCount(prefs.columns);
    setIsEditLayout(true);
  }, [prefs, maxColumns]);

  const cancelEditLayout = useCallback(() => {
    setDraftOrder(null);
    setDraftColumnCount(null);
    setIsEditLayout(false);
  }, []);

  const saveEditLayout = useCallback(() => {
    if (draftOrder) {
      const next: DevicesViewPrefs = {
        ...prefs,
        order: draftOrder,
        columns: draftColumnCount,
      };
      setPrefs(next);
      savePrefs(next);
    }
    setDraftOrder(null);
    setDraftColumnCount(null);
    setIsEditLayout(false);
  }, [draftOrder, draftColumnCount, prefs]);

  const handleEditorChange = useCallback((newColumns: string[][], newColumnCount: number | null) => {
    setDraftOrder(newColumns);
    setDraftColumnCount(newColumnCount);
  }, []);

  const typeFilterMap: Record<string, DeviceType> = {
    system: DeviceType.System,
    virtual: DeviceType.Virtual,
    modbus: DeviceType.Modbus,
    zigbee: DeviceType.Zigbee,
  };
  const typeLabelKeys: Record<string, string> = {
    system: 'devices.labels.type-system',
    virtual: 'devices.labels.type-virtual',
    modbus: 'devices.labels.type-modbus',
    zigbee: 'devices.labels.type-zigbee',
  };

  const presentTypes = new Set(
    Array.from(devicesStore.filteredDevices.values()).map((device) => device.type),
  );
  const typeOptions = [
    { value: null, label: t('devices.labels.all-devices') },
    ...Object.entries(typeFilterMap)
      .filter(([_, type]) => presentTypes.has(type))
      .map(([key]) => ({ value: key, label: t(typeLabelKeys[key]) })),
  ];

  const displayedIds = useMemo(() => {
    const devices = devicesStore.filteredDevices;
    const ids = Array.from(devices.keys());
    if (!typeFilter) return ids;
    return ids.filter((id) => devices.get(id)?.type === typeFilterMap[typeFilter]);
  }, [devicesStore.filteredDevices, typeFilter]);

  if (!localStorage.getItem('foldedDevices')) {
    localStorage.setItem('foldedDevices', JSON.stringify([]));
  }

  const actions = isEditLayout ? [] : [
    {
      title: t('devices.labels.delete'),
      action: (id: string) => setDeletedDeviceId(id),
      icon: TrashIcon,
      isPopupAction: true,
    },
  ];

  const renderDevice = useCallback((deviceId: string) => {
    const device = devicesStore.filteredDevices.get(deviceId);
    if (!device) return null;
    return (
      <Card
        heading={
          <span className="devices-deviceHeader">
            {device.name}
            {device.type === DeviceType.Virtual && <CodeIcon className="devices-icon" />}
            {device.type === DeviceType.System && <SystemDeviceIcon className="devices-icon" />}
            {device.type === DeviceType.Modbus && <ModbusIcon className="devices-icon" />}
            {device.type === DeviceType.Zigbee && <ZigbeeIcon className="devices-icon" />}
          </span>
        }
        id={deviceId}
        actions={actions}
        toggleBody={device.toggleDeviceVisibility}
        isBodyVisible={device.isVisible}
      >
        {devicesStore.getDeviceCells(device.id).map((cell) => (
          <Cell cell={cell} key={cell.id} />
        ))}
      </Card>
    );
  }, [devicesStore.filteredDevices, actions]);

  const viewColumnItems = useMemo(() => {
    if (!prefs.order) return undefined;
    return reconcileOrder(displayedIds, prefs.order).map((col) =>
      col.map((id) => <Fragment key={id}>{renderDevice(id)}</Fragment>),
    );
  }, [displayedIds, prefs.order, renderDevice]);

  return (
    <PageLayout
      title={t('devices.title')}
      hasRights={authStore.hasRights(UserRole.Operator)}
      actions={
        <>
          {!isEditLayout && typeOptions.length > 2 && (
            <Dropdown
              value={typeFilter}
              options={typeOptions}
              ariaLabel={t('devices.labels.filter-type')}
              onChange={(option: Option<string>) => setTypeFilter(option?.value ?? null)}
            />
          )}
          {!isEditLayout && displayedIds.length > 0 && (
            <Button
              label={t('common.buttons.edit-layout')}
              variant="secondary"
              onClick={startEditLayout}
            />
          )}
          {isEditLayout && (
            <>
              <Button
                label={t('common.buttons.cancel-layout')}
                variant="secondary"
                onClick={cancelEditLayout}
              />
              <Button
                label={t('common.buttons.save-layout')}
                onClick={saveEditLayout}
              />
            </>
          )}
          {!isEditLayout && (
            <Tooltip
              text={devicesStore.hasOpenedDivices ? t('devices.labels.collapse') : t('devices.labels.expand')}
            >
              <Button
                variant="secondary"
                aria-label={devicesStore.hasOpenedDivices ? t('devices.labels.collapse') : t('devices.labels.expand')}
                icon={devicesStore.hasOpenedDivices ? <CollapseIcon /> : <ExpandIcon />}
                onClick={devicesStore.toggleDevices}
              />
            </Tooltip>
          )}
        </>
      }
    >
      <section className="devices" ref={containerRef}>
        {displayedIds.length ? (
          <>
            {isEditLayout && draftOrder ? (
              <ColumnsEditor
                columns={draftOrder}
                columnCount={draftColumnCount}
                maxColumns={maxColumns}
                renderWidget={renderDevice}
                onChange={handleEditorChange}
              />
            ) : (
              <ColumnsWrapper
                columnClassName="devices-column"
                baseColumnWidth={MIN_COLUMN_WIDTH}
                columnCount={prefs.columns ?? undefined}
                columnItems={viewColumnItems}
              >
                {!viewColumnItems && displayedIds.map((id) => (
                  <Fragment key={id}>
                    {renderDevice(id)}
                  </Fragment>
                ))}
              </ColumnsWrapper>
            )}
          </>
        ) : (
          <Alert variant="info">
            {t('devices.labels.nothing')}
          </Alert>
        )}
      </section>

      <Confirm
        isOpened={!!deletedDeviceId}
        heading={t('devices.prompt.delete-title')}
        variant="danger"
        closeCallback={() => setDeletedDeviceId(null)}
        confirmCallback={() => {
          devicesStore.deleteDevice(deletedDeviceId);
          setDeletedDeviceId(null);
        }}
      >
        <Trans
          i18nKey="devices.prompt.delete-description"
          values={{
            name: devicesStore.devices.get(deletedDeviceId)?.name,
          }}
          components={[<b key="device-name" />]}
          shouldUnescape
        />
      </Confirm>
    </PageLayout>
  );
});

export default DevicesPage;
