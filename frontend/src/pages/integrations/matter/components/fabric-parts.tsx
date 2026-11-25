import { useTranslation } from 'react-i18next';
import type { MatterOutcome } from '@/stores/matter';
import { useTimes } from '../hooks';
import type { FabricLinesProps, FabricProps } from '../types';
import { fabricDisplayLabel, fabricVendor } from '../utils';
import { NamedLine } from './status-line';

/** The name of a fabric, and under it whose it is: its vendor. */
export const FabricName = ({ fabric }: FabricProps) => {
  const { t } = useTranslation();
  return (
    <>
      <span className="matter-rowName">{fabricDisplayLabel(fabric, t)}</span>
      <span className="matter-rowLine">{fabricVendor(fabric)}</span>
    </>
  );
};

/**
 * The status of a fabric in three lines - the link, the devices, the commands - read as
 * the channels of a device are: the link by its words alone, the other two named.
 *
 * What each line is and how it came out is the bridge's answer (`overview` in /status);
 * this only puts it into words. A line that is a problem says its words as the reason.
 */
export const FabricLines = ({ fabric, now }: FabricLinesProps) => {
  const { t } = useTranslation();
  const { ago, span } = useTimes(now);
  // A bridge older than this page tells no lines.
  if (!fabric.overview) {
    return null;
  }
  const { link, devices, commands } = fabric.overview;

  const line = (name: string, status: MatterOutcome, words: string, isFirst = false) => (
    <li>
      <NamedLine
        status={status}
        name={t(`matter.labels.line-${name}`)}
        isFirst={isFirst}
        reason={status === 'error' ? words : undefined}
      >
        {words}
      </NamedLine>
    </li>
  );

  return (
    <ul className="matter-lines">
      {line('link', link.status, t(`matter.labels.status-${link.word}`, {
        ago: Number.isFinite(link.since) ? span(link.since) : '',
      }), true)}
      {line('devices', devices.status, t(`matter.labels.follows-${devices.kind}`, {
        count: devices.followed, of: devices.of,
      }))}
      {line('commands', commands.status, commands.last_at === null
        ? t('matter.labels.commands-never')
        : ago(commands.last_at))}
    </ul>
  );
};
