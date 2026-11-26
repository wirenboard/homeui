import { useTranslation } from 'react-i18next';
import { Tag } from '@/components/tag';
import type {
  CardNameProps, ChannelProps, DeviceAppsProps, DeviceProps,
} from '../types';
import {
  appLabel, cardOf, deviceReason, reasonText, STATUS_OF_ANSWER,
} from '../utils';
import { NamedLine, StatusLine } from './status-line';

// The readings this page has a word for. Any other is shown as the bridge formatted it.
const TRANSLATED_READINGS = new Set(['on', 'off']);

/**
 * The device as the configurator has it - its card - which leads there, and its group.
 * Said once for a card, at its first part: the parts after it have nothing to say here.
 * In one line on a phone, where it stands over the name of the part.
 */
export const CardName = ({ device, onOpen, isLine = false }: CardNameProps) => {
  const { t } = useTranslation();
  const card = cardOf(device);
  if (!card?.first) {
    return null;
  }
  return (
    <>
      <button
        type="button"
        className={isLine ? 'matter-rowCard matter-deviceLink' : 'matter-cardName matter-deviceLink'}
        title={t('matter.labels.open-device', { name: card.name })}
        onClick={onOpen}
      >
        {isLine && card.group ? `${card.name} · ${card.group}` : card.name}
      </button>
      {!isLine && card.group && <span className="matter-rowLine">{card.group}</span>}
    </>
  );
};

/**
 * A part of a device: what an app is given as one device. Its name is the one the app
 * shows, and under it what it is. The type is named by the configurator, so the names of
 * the types live in one place. A part with no card says its group itself, and a part with
 * no name of its own says none: it is called as its device, which stands beside it.
 */
export const PartName = ({ device }: DeviceProps) => {
  const { t } = useTranslation();
  const type = t(`configurator.types.${device.type}.name`, { defaultValue: device.type });
  const ownGroup = cardOf(device) ? null : device.group;
  return (
    <>
      {!device.unnamed && <span className="matter-rowName">{device.name}</span>}
      <span className="matter-rowLine">{ownGroup ? `${type} · ${ownGroup}` : type}</span>
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
 * What of a device is passed to Matter, a line a channel: the reading of one that is
 * passed, the reason of one that is not. A device that is not given at all is one line
 * with its reason.
 */
export const DeviceChannels = ({ device }: DeviceProps) => {
  const { t } = useTranslation();

  if (!device.exposed) {
    return (
      <NamedLine
        status={device.reason_status ?? 'off'}
        name={t('matter.labels.not-passed')}
        reason={deviceReason(device, t)}
      />
    );
  }
  return (
    <ul className="matter-lines">
      {(device.channels ?? []).map((channel, place) => (
        <li key={channel.role}>
          <NamedLine
            status={channel.status}
            name={t(`configurator.roles.${channel.role}`, { defaultValue: channel.role })}
            // The first channel is what the device is read by: its name is the type above.
            isFirst={place === 0}
            reason={channel.status === 'ok' ? undefined : reasonText(channel.code, t)}
          >
            <ChannelReading channel={channel} />
          </NamedLine>
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
    <StatusLine status={STATUS_OF_ANSWER[followed.answer]}>
      <span className={followed.answer === 'no' ? 'matter-lineWhat' : undefined}>
        {followed.answer === 'yes' ? everyApp : t(`matter.labels.apps-${followed.answer}`, { names })}
      </span>
    </StatusLine>
  );
};
