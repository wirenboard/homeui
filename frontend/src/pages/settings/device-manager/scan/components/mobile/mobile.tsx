import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/card';
import { CollapsiblePanel } from '@/components/collapsible-panel';
import { BooleanField } from '@/components/form';
import { Tag } from '@/components/tag';
import { DeviceName, SlaveId, Port } from '../common';
import type { DeviceListProps, DevicePanelProps } from './types';
import './styles.css';

const DevicePanel = observer(({ deviceStore }: DevicePanelProps) => {
  const { t } = useTranslation();

  return (
    <Card
      className={classNames('mobileDevicePanel-card', {
        'mobileDevicePanel-notSelectable': !deviceStore.selectable,
      })}
      variant="secondary"
      heading={
        <DeviceName
          title={deviceStore.title}
          bootloaderMode={deviceStore.bootloaderMode}
          errors={deviceStore?.scannedDevice.errors}
          duplicateMqttTopic={deviceStore.duplicateMqttTopic}
          unknownType={deviceStore.isUnknownType}
          selected={deviceStore.selected}
          otherMatchingDeviceTypesNames={deviceStore.names.slice(1)}
          selectable={deviceStore.selectable}
          onSelectionChange={(val: boolean) => deviceStore.setSelected(val)}
        />
      }
    >
      <div className="mobileDevicePanel-data">
        <div>SN</div>
        <div>{deviceStore.sn}</div>
      </div>
      <div className="mobileDevicePanel-data">
        <div>{t('scan.labels.address')}</div>
        <div><SlaveId slaveId={deviceStore.address} isDuplicate={deviceStore.duplicateSlaveId} /></div>
      </div>
      <div className="mobileDevicePanel-data">
        <div>{t('scan.labels.port')}</div>
        <div>
          <Port
            path={deviceStore.port}
            baudRate={deviceStore.baudRate}
            dataBits={deviceStore.dataBits}
            parity={deviceStore.parity}
            stopBits={deviceStore.stopBits}
            misconfiguredPort={deviceStore.misconfiguredPort}
          />
        </div>
      </div>
      {deviceStore?.scannedDevice?.fw?.update?.error && (
        <div className="row">
          <div className="col-xs-12">
            <Tag variant="danger">{deviceStore?.scannedDevice?.fw?.update?.error}</Tag>
          </div>
        </div>
      )}
    </Card>
  );
});

export const DevicesList = observer(({
  newDevices,
  alreadyConfiguredDevices,
  selectionValue,
  toggleSelection,
}: DeviceListProps) => {
  const { t } = useTranslation();

  return (
    <>
      {!!newDevices.length && (
        <div className="mobileDevicePanel-toggleWrapper">
          <BooleanField
            title={selectionValue ? t('common.labels.unselect-all') : t('common.labels.select-all')}
            view="checkbox"
            indeterminate={selectionValue === 'indeterminate'}
            isDisabled={!newDevices.length}
            value={!!selectionValue}
            onChange={(val) => toggleSelection(val)}
          />
        </div>
      )}
      {newDevices.map((device) => (
        <DevicePanel key={device.uuid} deviceStore={device} />
      ))}

      {!!alreadyConfiguredDevices.length && (
        <CollapsiblePanel title={t('scan.labels.device-in-config')} isCollapsed>
          {alreadyConfiguredDevices.map((d, index) => <DevicePanel key={index} deviceStore={d} />)}
        </CollapsiblePanel>
      )}
    </>
  );
});
