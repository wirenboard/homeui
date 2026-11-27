import { useTranslation } from 'react-i18next';
import { Button } from '@/components/button';
import type { DetailsFactsProps, DeviceDetailsProps } from '../types';
import {
  appLabel, deviceReason, reasonText, STATUS_OF_ANSWER,
} from '../utils';
import { Details, Facts, Section } from './details';
import { ChannelReading } from './device-parts';

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

  // Each row with how it came out: the app that did not take the device and the channel
  // that has a problem carry the sign the row of the table marked them with.
  const appRows: DetailsFactsProps['rows'] = (followed?.answers ?? []).map(({ index, answer }) => [
    appLabel(fabrics, index, t),
    t(`matter.labels.app-says-${answer}`),
    STATUS_OF_ANSWER[answer],
  ]);

  const channelRows: DetailsFactsProps['rows'] = (device.channels ?? []).map((channel) => [
    t(`configurator.roles.${channel.role}`, { defaultValue: channel.role }),
    <span className="matter-detailsCommand" key={channel.role}>
      {channel.status === 'ok' ? <ChannelReading channel={channel} /> : <span>{reasonText(channel.code, t)}</span>}
      {channel.control && <span className="matter-detailsNote">{channel.control}</span>}
    </span>,
    channel.status,
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
            <div className="matter-detailsAdvice">
              <span>{t('matter.labels.app-no-advice')}</span>
              <ul>
                <li>{t('matter.labels.app-no-added-later')}</li>
                <li>{t('matter.labels.app-no-type')}</li>
              </ul>
            </div>
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
                device.group ? t('matter.labels.group-as-room', { group: device.group }) : t('matter.labels.none'),
              ],
              [label('power'), t(`matter.labels.power-${matter.power ?? 'none'}`)],
              [label('endpoint'), matter.endpoint ?? unknown],
            ]}
          />
        </Section>
      )}
    </Details>
  );
};
