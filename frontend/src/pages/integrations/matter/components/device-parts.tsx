import { useTranslation } from 'react-i18next';
import { Tag } from '@/components/tag';
import type {
  ChannelProps, DeviceAppsProps, DeviceCountsProps, DeviceNameProps, DeviceProps,
} from '../types';
import {
  appLabel, deviceReason, MARK_OF_ANSWER, OUTCOMES, reasonText,
} from '../utils';
import { Mark } from './mark';

// The readings this page has a word for. Any other is shown as the bridge formatted it.
const TRANSLATED_READINGS = new Set(['on', 'off']);

/** How many devices came to what, and with that the legend of the three signs. */
export const DeviceCounts = ({ outcomes }: DeviceCountsProps) => {
  const { t } = useTranslation();
  return (
    <p className="matter-counts">
      {OUTCOMES.map((outcome) => (
        <span className="matter-line" key={outcome}>
          <Mark status={outcome} />
          {t(`matter.labels.count-${outcome}`, { count: outcomes[outcome] })}
        </span>
      ))}
    </p>
  );
};

/**
 * The name of a device, which leads to its card in the configurator, and under it what it
 * is and where it stands. The type is named by the configurator, so the names of the types
 * live in one place.
 */
export const DeviceName = ({ device, onOpen }: DeviceNameProps) => {
  const { t } = useTranslation();
  const type = t(`configurator.types.${device.type}.name`, { defaultValue: device.type });
  return (
    <>
      <button
        type="button"
        className="matter-rowName matter-deviceLink"
        title={t('matter.labels.open-device', { name: device.name })}
        onClick={onOpen}
      >
        {device.name}
      </button>
      <span className="matter-rowLine">{device.area ? `${type} · ${device.area}` : type}</span>
    </>
  );
};

/** The reading of a channel: a word of the page for a switch, the text of the bridge for the rest. */
export const ChannelReading = ({ channel }: ChannelProps) => {
  const { t } = useTranslation();
  if (TRANSLATED_READINGS.has(channel.text)) {
    return <Tag variant={channel.text === 'on' ? 'success' : 'gray'}>{t(`matter.labels.state-${channel.text}`)}</Tag>;
  }
  return (
    <span className="matter-reading">
      {channel.colour && <i className="matter-swatch" style={{ background: channel.colour }} />}
      {channel.text}
    </span>
  );
};

/**
 * What of a device is passed to Matter: every channel with its sign, the reading of one
 * that is passed and the reason of one that is not. A device that is not given at all is
 * one line with its reason.
 */
export const DeviceChannels = ({ device }: DeviceProps) => {
  const { t } = useTranslation();
  const role = (name: string) => t(`configurator.roles.${name}`, { defaultValue: name });

  if (!device.exposed) {
    return (
      <span className="matter-line">
        <Mark status={device.reason_status ?? 'off'} />
        <span>
          {t('matter.labels.not-passed')}
          {deviceReason(device, t) && <span className="matter-lineReason">{` — ${deviceReason(device, t)}`}</span>}
        </span>
      </span>
    );
  }
  return (
    <ul className="matter-lines">
      {(device.channels ?? []).map((channel, place) => (
        <li className="matter-line" key={channel.role}>
          <Mark status={channel.status} />
          {channel.status === 'ok' ? (
            <span>
              {/* The first channel is what the device is read by: its name is the type above. */}
              {place > 0 && <span className="matter-lineName">{role(channel.role)}</span>}
              <ChannelReading channel={channel} />
            </span>
          ) : (
            <span>
              <span className={channel.status === 'error' ? 'matter-lineWhat' : undefined}>{role(channel.role)}</span>
              <span className="matter-lineReason">{` — ${reasonText(channel.code, t)}`}</span>
            </span>
          )}
        </li>
      ))}
    </ul>
  );
};

/**
 * Which apps show a device, in one line: all of them in two words, otherwise the ones
 * that gave the worst answer, by name. Every app with its own answer is in the details.
 */
export const DeviceApps = ({ device, fabrics }: DeviceAppsProps) => {
  const { t } = useTranslation();
  const followed = device.followed_by;
  if (!followed || followed.of === 0) {
    return null;
  }
  const names = followed.answers
    .filter((app) => app.answer === followed.answer)
    .map((app) => appLabel(fabrics, app.index, t))
    .join(', ');
  // A single app is named: its name says more than "all 1".
  const everyApp = followed.of === 1 ? names : t('matter.labels.apps-all', { count: followed.of });

  return (
    <span className="matter-line">
      <Mark status={MARK_OF_ANSWER[followed.answer]} />
      <span>{followed.answer === 'yes' ? everyApp : t(`matter.labels.apps-${followed.answer}`, { names })}</span>
    </span>
  );
};
