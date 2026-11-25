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
import { DetailsToggle } from './details';
import { DeviceDetails } from './device-details';
import { DeviceApps, DeviceChannels, DeviceName } from './device-parts';

/**
 * The devices of the config and what became of each in Matter: what of it is passed, and
 * which apps show it. Columns on a wide screen, the same three blocks stacked on a phone;
 * the button of a row opens the details of its device, and the name leads to its card in
 * the configurator.
 *
 * The type and the group stand under the name on both, so the columns are spent on the
 * two questions people bring here. The column of the apps is there only when there is an
 * app: without one it is a column of blanks.
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

  const nameOf = (device: MatterDevice) => <DeviceName device={device} onOpen={() => onOpen(device)} />;

  const detailsOf = (device: MatterDevice) => (
    <DeviceDetails device={device} fabrics={fabrics} onOpen={() => onOpen(device)} />
  );

  const deviceRows = (
    <ul className="matter-rows">
      {devices.list.map((device) => (
        <li
          className={classNames('matter-row', 'matter-rowWithDetails', { 'matter-rowOff': !device.exposed })}
          key={device.did}
        >
          <div className="matter-rowMain">
            {nameOf(device)}
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
            <TableCell width="26%">{t('matter.labels.column-name')}</TableCell>
            <TableCell className="matter-linesCell">{t('matter.labels.column-passed')}</TableCell>
            {hasApps && (
              <TableCell className="matter-linesCell" width="26%">{t('matter.labels.column-apps')}</TableCell>
            )}
            <TableCell>
              <span className="matter-srOnly">{t('matter.labels.column-actions')}</span>
            </TableCell>
          </TableRow>

          {devices.list.flatMap((device) => [
            <TableRow key={device.did} className={classNames({ 'matter-rowOff': !device.exposed })}>
              <TableCell verticalAlign="top">{nameOf(device)}</TableCell>
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
                <TableCell colSpan={hasApps ? 4 : 3}>{detailsOf(device)}</TableCell>
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
