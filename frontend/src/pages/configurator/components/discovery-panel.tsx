import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import PlusIcon from '@/assets/icons/plus.svg';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Checkbox } from '@/components/checkbox';
import { CollapsiblePanel } from '@/components/collapsible-panel';
import { Table, TableCell, TableRow } from '@/components/table';
import { Tag } from '@/components/tag';
import { Tooltip } from '@/components/tooltip';
import { configuratorStore } from '@/stores/configurator';
import { devicesStore, DeviceType } from '@/stores/devices';
import { defaultTypeForRole } from '../build-config';
import { inferRole } from '../infer';
import type { DiscoveryPanelProps } from '../types';
import { isAmbiguous } from '../utils';

export const DiscoveryPanel = observer(({ boundCellIds, typeLabel, roleLabel }: DiscoveryPanelProps) => {
  const { t } = useTranslation();
  const [isOpened, setIsOpened] = useState(false);
  const [showSystem, setShowSystem] = useState(false);
  const [showVirtual, setShowVirtual] = useState(false);
  const [showBound, setShowBound] = useState(false);

  const devices = Array.from(devicesStore.devices.values());
  const systemCount = devices.filter((device) => device.type === DeviceType.System).length;
  const virtualCount = devices.filter((device) => device.type === DeviceType.Virtual).length;
  const shownDevices = devices
    .filter((device) => {
      if (device.type === DeviceType.System) {
        return showSystem;
      }
      if (device.type === DeviceType.Virtual) {
        return showVirtual;
      }
      return true;
    })
    .map((device) => ({
      device,
      cells: devicesStore.getDeviceCells(device.id).filter((cell) => showBound || !boundCellIds.has(cell.id)),
    }))
    .filter((entry) => entry.cells.length > 0);

  return (
    <Card
      heading={t('configurator.labels.discovered')}
      variant="secondary"
      isBodyVisible={isOpened}
      toggleBody={() => setIsOpened(!isOpened)}
    >
      <div className="configurator-filters">
        <Checkbox
          checked={showSystem}
          title={t('configurator.labels.show-system', { count: systemCount })}
          onChange={setShowSystem}
        />
        <Checkbox
          checked={showVirtual}
          title={t('configurator.labels.show-virtual', { count: virtualCount })}
          onChange={setShowVirtual}
        />
        <Checkbox
          checked={showBound}
          title={t('configurator.labels.show-bound', { count: boundCellIds.size })}
          onChange={setShowBound}
        />
      </div>

      {!shownDevices.length && (
        <p className="configurator-empty">{t('configurator.labels.no-discovered')}</p>
      )}

      {shownDevices.map(({ device, cells }) => (
        <CollapsiblePanel
          key={device.id}
          title={`${device.name} (${device.id})`}
          isCollapsed
        >
          <Table isFullWidth>
            <TableRow isHeading>
              <TableCell>{t('configurator.labels.control')}</TableCell>
              <TableCell width={200}>{t('configurator.labels.suggested-role')}</TableCell>
              <TableCell width={110} />
              <TableCell width={140} />
            </TableRow>
            {cells.map((cell) => {
              const suggestion = inferRole(cell);
              const createType = defaultTypeForRole(suggestion.role);
              return (
                <TableRow key={cell.id}>
                  <TableCell ellipsis>{cell.name}</TableCell>
                  <TableCell width={200}>
                    {roleLabel(suggestion.role)}
                  </TableCell>
                  <TableCell width={110}>
                    {isAmbiguous(cell) && (
                      <Tooltip text={t('configurator.labels.ambiguous-hint')}>
                        <Tag variant="warn" tabIndex={0}>{t('configurator.labels.ambiguous')}</Tag>
                      </Tooltip>
                    )}
                  </TableCell>
                  <TableCell width={140} align="right">
                    {createType && (
                      <Button
                        size="small"
                        variant="secondary"
                        icon={<PlusIcon />}
                        label={t('configurator.buttons.create-from-control')}
                        aria-label={t('configurator.buttons.create-from-control-hint', {
                          type: typeLabel(createType),
                          control: cell.name,
                        })}
                        onClick={() => configuratorStore.addDeviceFromControl(
                          createType, suggestion.role, cell.id, device.id, cell.name,
                        )}
                      />
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </Table>
        </CollapsiblePanel>
      ))}
    </Card>
  );
});
