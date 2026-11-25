import { useTranslation } from 'react-i18next';
import { useMediaQuery } from 'react-responsive';
import { Link } from 'react-router-dom';
import ChevronRightIcon from '@/assets/icons/chevron-right.svg';
import { MAX_MOBILE_WIDTH } from '@/common/breakpoints';
import { Card } from '@/components/card';
import { Table, TableCell, TableRow } from '@/components/table';
import { Tag } from '@/components/tag';
import type { MatterDevice } from '@/stores/matter';
import type { DevicesCardProps } from '../types';
import { fabricDisplayLabel } from '../utils';

/** The states this page has words for. Anything else is a reading, and is shown as it is. */
const TRANSLATED_STATES = new Set(['on', 'off']);

/**
 * The devices the config gives to Matter: columns on a wide screen, stacked lines on a phone.
 *
 * At 375 px the four columns ask for 384 and the state is clipped, so each device becomes a
 * block instead. The group is dropped where no device has one - the configurator leaves it
 * empty until somebody fills it in, and a column of blanks costs a sixth of the width.
 */
export const DevicesCard = ({ devices, onOpen, fabrics = [] }: DevicesCardProps) => {
  const { t } = useTranslation();
  const isMobile = useMediaQuery({ maxWidth: MAX_MOBILE_WIDTH });
  const hasAreas = devices.list.some((device) => device.area);

  /** The name of the type, taken from the configurator so the names live in one place. */
  const deviceType = ({ type }: MatterDevice) => t(`configurator.types.${type}.name`, { defaultValue: type });

  /**
   * Why a device is not given to Matter, in the language of the page. The service sends
   * a code for exactly this, and its own English sentence stays in /status and in the
   * journal for support. An unknown code means a newer service than this page: then the
   * sentence is better than nothing.
   */
  const notExposedReason = (device: MatterDevice) => (device.reason_code
    ? t(`matter.labels.reason-${device.reason_code}`, { defaultValue: device.reason ?? '' })
    : device.reason ?? '');

  /**
   * The roles the config asks for and the endpoint does not carry, in the words of the
   * configurator so that the names of the roles live in one place.
   *
   * The field is optional: a page can be newer than the service it talks to, and an
   * older service simply says nothing about this.
   */
  const ignoredRoles = (device: MatterDevice) => (device.ignored_roles ?? [])
    .map((role) => t(`configurator.roles.${role}`, { defaultValue: role }))
    .join(', ');

  /** What the state column shows: the value of the control, or why there is none. */
  const deviceState = (device: MatterDevice) => {
    if (!device.exposed) {
      return (
        <Tag variant="gray" title={notExposedReason(device) || undefined}>
          {t('matter.labels.not-exposed')}
        </Tag>
      );
    }
    if (device.state === null) {
      return <Tag variant="warn" title={t('matter.labels.state-silent-hint')}>{t('matter.labels.state-silent')}</Tag>;
    }
    // Only a switch has a state with a word for it. A sensor puts its reading here, as
    // the service formatted it ("10.0 C"), and asking for a translation of that printed
    // the key it could not find - "matter.labels.state-10.0 C" - right in the table.
    const text = TRANSLATED_STATES.has(device.state)
      ? t(`matter.labels.state-${device.state}`)
      : device.state;
    return (
      <>
        <Tag variant={device.state === 'on' ? 'success' : 'gray'}>{text}</Tag>
        {/* Readings, not words: "50 %", "#FF0000", "3000 K". Beside the tag and not
            inside it - the tag is translated by a dictionary, a reading is not. */}
        {(device.details ?? []).map(({ text, colour }) => (
          <span className="matter-detail" key={text}>
            {colour && <i className="matter-swatch" style={{ background: colour }} />}
            {text}
          </span>
        ))}
      </>
    );
  };

  const notTakenBy = (device: MatterDevice) => (device.not_followed_by ?? [])
    .map((index) => fabrics.find((fabric) => fabric.index === index))
    .filter(Boolean)
    .map((fabric) => fabricDisplayLabel(fabric, t))
    .join(', ');

  const deviceRows = (
    <ul className="matter-rows">
      {devices.list.map((device) => (
        <li className="matter-row" key={device.did}>
          <button
            type="button"
            className="matter-deviceButton"
            aria-label={t('matter.labels.open-device', { name: device.name })}
            onClick={() => onOpen(device)}
          >
            <span className="matter-rowMain">
              <span className="matter-rowName">{device.name}</span>
              <span className="matter-rowLine">
                {device.area ? `${deviceType(device)} · ${device.area}` : deviceType(device)}
              </span>
              <span className="matter-rowState">{deviceState(device)}</span>
              {device.exposed && ignoredRoles(device) !== '' && (
                <span className="matter-rowLine">
                  {t('matter.labels.ignored-roles', { roles: ignoredRoles(device) })}
                </span>
              )}
              {notTakenBy(device) !== '' && (
                <span className="matter-rowLine">
                  {t('matter.labels.not-followed-by', { fabrics: notTakenBy(device) })}
                </span>
              )}
            </span>
            <ChevronRightIcon className="matter-rowChevron" aria-hidden="true" />
          </button>
        </li>
      ))}
    </ul>
  );

  return (
    <Card className="matter-card" heading={t('matter.labels.devices')}>
      {devices.list.length === 0 && <p className="matter-empty">{t('matter.labels.devices-empty')}</p>}
      {devices.list.length > 0 && isMobile && deviceRows}
      {devices.list.length > 0 && !isMobile && (
        <Table isFullWidth>
          <TableRow isHeading>
            <TableCell>{t('matter.labels.column-name')}</TableCell>
            <TableCell>{t('matter.labels.column-type')}</TableCell>
            {hasAreas && <TableCell>{t('matter.labels.column-group')}</TableCell>}
            <TableCell>{t('matter.labels.column-state')}</TableCell>
          </TableRow>

          {devices.list.map((device) => (
            <TableRow
              key={device.did}
              className="matter-deviceRow"
              aria-label={t('matter.labels.open-device', { name: device.name })}
              // Not the url of the row: the selection has to be set before the
              // configurator mounts, and a Link navigates from the cell, which
              // is the click target and runs before this handler.
              onClick={() => onOpen(device)}
            >
              <TableCell>{device.name}</TableCell>
              <TableCell>{deviceType(device)}</TableCell>
              {hasAreas && <TableCell>{device.area ?? ''}</TableCell>}
              <TableCell>
                {deviceState(device)}
                {device.exposed && ignoredRoles(device) !== '' && (
                  <span className="matter-ignored">
                    {t('matter.labels.ignored-roles', { roles: ignoredRoles(device) })}
                  </span>
                )}
                {notTakenBy(device) !== '' && (
                  <span className="matter-ignored">
                    {t('matter.labels.not-followed-by', { fabrics: notTakenBy(device) })}
                  </span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </Table>
      )}
      <p className="matter-hint">
        {t('matter.labels.devices-count', { count: devices.configured, exposed: devices.exposed })}
        {devices.skipped > 0 && ` ${t('matter.labels.devices-skipped', { count: devices.skipped })}`}
        {' '}
        {t('matter.labels.devices-hint')}
        {' '}
        <Link to="/configurator">{t('matter.labels.devices-link')}</Link>
        .
      </p>
    </Card>
  );
};
