import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import { useMediaQuery } from 'react-responsive';
import { Link } from 'react-router-dom';
import { MAX_MOBILE_WIDTH } from '@/common/breakpoints';
import { Card } from '@/components/card';
import { Table, TableCell, TableRow } from '@/components/table';
import type { MatterDevice } from '@/stores/matter';
import { useOpened } from '../hooks';
import type { DevicesCardProps } from '../types';
import { cardOf } from '../utils';
import { DetailsToggle } from './details';
import { DeviceDetails } from './device-details';
import {
  CardName, DeviceApps, DeviceChannels, PartName,
} from './device-parts';

/**
 * The devices of the configurator and what became of each in Matter. A device there is a
 * card, and what Matter is given as a device is a part of it: so a row is a part, and its
 * device is named once, in a column of its own, beside the first of its parts. The bridge
 * puts the parts of a device together and says where each stands (`card`).
 *
 * Two names, two columns: the device leads to its card in the configurator, the part is
 * what an app shows. Then the two questions people bring here - what of it is passed and
 * which apps show it; the column of the apps is there only when there is an app. On a
 * phone the device is a line over the name of its first part. The button of a row opens
 * the details of its part.
 */
export const DevicesCard = ({ devices, onOpen, fabrics = [] }: DevicesCardProps) => {
  const { t } = useTranslation();
  const isMobile = useMediaQuery({ maxWidth: MAX_MOBILE_WIDTH });
  const [isOpened, toggle] = useOpened();
  const hasApps = fabrics.length > 0;

  const toggleOf = (device: MatterDevice) => (
    <DetailsToggle
      isOpened={isOpened(device.did)}
      label={t('matter.buttons.device-details', { name: device.name })}
      onToggle={() => toggle(device.did)}
    />
  );

  // No line between the parts of one device: they read as one.
  const rowClass = (device: MatterDevice) => {
    const card = cardOf(device);
    return classNames({ 'matter-rowOff': !device.exposed, 'matter-rowInCard': card && !card.last });
  };

  const detailsOf = (device: MatterDevice) => (
    <DeviceDetails device={device} fabrics={fabrics} onOpen={() => onOpen(device)} />
  );

  const deviceRows = (
    <ul className="matter-rows">
      {devices.list.map((device) => (
        <li className={classNames('matter-row', 'matter-rowWithDetails', rowClass(device))} key={device.did}>
          <div className="matter-rowMain">
            <CardName device={device} isLine onOpen={() => onOpen(device)} />
            <PartName device={device} />
            <div className="matter-rowBlock"><DeviceChannels device={device} /></div>
            <div className="matter-rowBlock"><DeviceApps device={device} fabrics={fabrics} /></div>
          </div>
          <div className="matter-rowAction">{toggleOf(device)}</div>
          {isOpened(device.did) && detailsOf(device)}
        </li>
      ))}
    </ul>
  );

  return (
    <Card className="matter-card matter-devices" heading={t('matter.labels.devices')}>
      {devices.list.length === 0 && <p className="matter-empty">{t('matter.labels.devices-empty')}</p>}
      {devices.list.length > 0 && isMobile && deviceRows}
      {devices.list.length > 0 && !isMobile && (
        <Table isFullWidth>
          <TableRow isHeading>
            <TableCell width="20%">{t('matter.labels.column-name')}</TableCell>
            <TableCell width="20%">{t('matter.labels.column-part')}</TableCell>
            <TableCell className="matter-linesCell">{t('matter.labels.column-passed')}</TableCell>
            {hasApps && (
              <TableCell className="matter-linesCell" width="22%">{t('matter.labels.column-apps')}</TableCell>
            )}
            <TableCell>
              <span className="matter-srOnly">{t('matter.labels.column-actions')}</span>
            </TableCell>
          </TableRow>

          {devices.list.flatMap((device) => [
            <TableRow key={device.did} className={rowClass(device)}>
              <TableCell className="matter-cardCell" verticalAlign="top">
                <CardName device={device} onOpen={() => onOpen(device)} />
              </TableCell>
              <TableCell verticalAlign="top"><PartName device={device} /></TableCell>
              <TableCell className="matter-linesCell" verticalAlign="top">
                <DeviceChannels device={device} />
              </TableCell>
              {hasApps && (
                <TableCell className="matter-linesCell" verticalAlign="top">
                  <DeviceApps device={device} fabrics={fabrics} />
                </TableCell>
              )}
              <TableCell verticalAlign="top">{toggleOf(device)}</TableCell>
            </TableRow>,
            isOpened(device.did) && (
              <TableRow key={`${device.did}-details`} className="matter-detailsRow">
                <TableCell colSpan={hasApps ? 5 : 4}>{detailsOf(device)}</TableCell>
              </TableRow>
            ),
          ])}
        </Table>
      )}
      <p className="matter-hint">
        {devices.skipped > 0 && `${t('matter.labels.devices-skipped', { count: devices.skipped })} `}
        {t('matter.labels.devices-hint')}
        {' '}
        <Link to="/configurator">{t('matter.labels.devices-link')}</Link>
        .
      </p>
    </Card>
  );
};
