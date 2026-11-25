import { useTranslation } from 'react-i18next';
import { Button } from '@/components/button';
import type { DetailsFactsProps, DeviceDetailsProps } from '../types';
import {
  appLabel, deviceReason, MARK_OF_ANSWER, reasonText,
} from '../utils';
import { Details, Facts, Section } from './details';
import { ChannelReading } from './device-parts';
import { Mark } from './mark';

/**
 * What the bridge knows of one device, under its row: what every app says of it, every
 * channel with the control it is read from, and what an app is given for it. A device
 * that is not given to Matter has one thing to say: why.
 *
 * Everything here is worked out by the bridge and only put into words.
 */
export const DeviceDetails = ({ device, fabrics, onOpen }: DeviceDetailsProps) => {
  const { t } = useTranslation();
  const label = (name: string) => t(`matter.labels.fact-${name}`);
  const unknown = t('matter.labels.unknown');
  const { matter, followed_by: followed } = device;

  const appRows: DetailsFactsProps['rows'] = (followed?.answers ?? []).map(({ index, answer }) => [
    <span className="matter-line" key={index}>
      <Mark status={MARK_OF_ANSWER[answer]} />
      {appLabel(fabrics, index, t)}
    </span>,
    t(`matter.labels.app-says-${answer}`),
  ]);

  const channelRows: DetailsFactsProps['rows'] = (device.channels ?? []).map((channel) => [
    <span className="matter-line" key={channel.role}>
      <Mark status={channel.status} />
      {t(`configurator.roles.${channel.role}`, { defaultValue: channel.role })}
    </span>,
    <span className="matter-detailsCommand" key={channel.role}>
      {channel.status === 'ok' ? <ChannelReading channel={channel} /> : <span>{reasonText(channel.code, t)}</span>}
      {channel.control && <span className="matter-detailsNote">{channel.control}</span>}
    </span>,
  ]);

  return (
    <Details
      title={device.name}
      footer={(
        <Button size="small" variant="secondary" label={t('matter.buttons.open-configurator')} onClick={onOpen} />
      )}
    >
      {!device.exposed && (
        <Section title={t('matter.labels.section-not-passed')}>
          <Facts rows={[[label('reason'), deviceReason(device, t) || unknown]]} />
        </Section>
      )}

      {appRows.length > 0 && (
        <Section title={t('matter.labels.section-apps')}>
          <Facts rows={appRows} />
          {followed.answer === 'no' && (
            <span className="matter-detailsAdvice">{t('matter.labels.app-no-advice')}</span>
          )}
        </Section>
      )}

      {channelRows.length > 0 && (
        <Section title={t('matter.labels.section-channels')}>
          <Facts rows={channelRows} />
        </Section>
      )}

      {matter && (
        <Section title={t('matter.labels.section-given')}>
          <Facts
            rows={[
              [label('matter-type'), matter.type],
              [label('matter-name'), device.name],
              [
                label('matter-group'),
                device.area ? t('matter.labels.group-as-room', { group: device.area }) : t('matter.labels.none'),
              ],
              [label('power'), matter.power ? t(`matter.labels.power-${matter.power}`) : unknown],
              [label('endpoint'), matter.endpoint ?? unknown],
            ]}
          />
        </Section>
      )}
    </Details>
  );
};
