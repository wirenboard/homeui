import { format, formatDistance } from 'date-fns';
import { enUS, ru } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/button';
import type { MatterFabricDevice } from '@/stores/matter';
import {
  type DetailsFactsProps, type DetailsSectionProps, type FabricDetailsProps, WatchingKind,
} from '../types';
import {
  declaredMatter, deviceNameOf, vendorHex, watchedDevices,
} from '../utils';

// More names than this in one cell push everything below them off the screen.
const MISSING_SHOWN = 3;

// The verdicts whose advice has a place of its own: nothing to do, or it is about the
// subscriptions and stands with them.
const NO_LINK_ADVICE = ['online', 'partly'];

const Section = ({ title, children }: DetailsSectionProps) => (
  <section className="matter-detailsSection">
    <h4 className="matter-detailsHeading">{title}</h4>
    {children}
  </section>
);

const Facts = ({ rows }: DetailsFactsProps) => (
  <dl className="matter-facts">
    {rows.map(([name, value]) => (
      <div className="matter-fact" key={name}>
        <dt>{name}</dt>
        <dd>{value}</dd>
      </div>
    ))}
  </dl>
);

/**
 * What the bridge knows of one fabric, under its row, from the general to the particular:
 * the device, its Matter, the pairing, the subscriptions, the link. Everything here is
 * worked out by the bridge - the verdict about the link and the answers of a check too -
 * and this only puts it into words.
 */
export const FabricDetails = ({
  fabric, devices, now, isChecking, hasCheckFailed, onCheck,
}: FabricDetailsProps) => {
  const { t, i18n } = useTranslation();
  const ago = (at: number) => formatDistance(at, now, {
    locale: i18n.language === 'ru' ? ru : enUS,
    addSuffix: true,
  });
  const day = (at: number) => format(at, i18n.language === 'ru' ? 'dd.MM.yyyy' : 'dd/MM/yyyy');
  const label = (name: string) => t(`matter.labels.fact-${name}`);

  const fabricDevices = fabric.devices ?? [];
  const declared = declaredMatter(fabricDevices, t('matter.labels.device-nameless'));
  const watched = watchedDevices(fabric, devices);
  const { link } = fabric;

  const deviceState = (device: MatterFabricDevice) => {
    if (device.online) {
      return t('matter.labels.device-online', { count: device.subscriptions });
    }
    return Number.isFinite(device.heard_at)
      ? t('matter.labels.device-heard', { ago: ago(device.heard_at) })
      : t('matter.labels.device-offline');
  };

  const deviceRows = (device: MatterFabricDevice): DetailsFactsProps['rows'] => [
    [label('device-name'), device.name ?? t('matter.labels.device-nameless')],
    ...(device.mac ? [[label('device-mac'), device.mac] as const] : []),
    ...(device.address ? [[label('device-address'), device.address] as const] : []),
    // With one device the section "Link" says the same of the whole fabric.
    ...(fabricDevices.length > 1 ? [[label('device-state'), deviceState(device)] as const] : []),
  ];

  const vendor = fabric.vendor_name
    ? `${fabric.vendor_name} (${vendorHex(fabric.vendor_id)})`
    : vendorHex(fabric.vendor_id);

  const pairedVia = () => {
    if (fabric.paired_via?.by === 'page') {
      return t('matter.labels.via-page');
    }
    if (fabric.paired_via?.by === 'app') {
      return t('matter.labels.via-app', {
        vendor: fabric.paired_via.vendor_name ?? vendorHex(fabric.paired_via.vendor_id),
      });
    }
    return t('matter.labels.via-unknown');
  };

  const certificate = () => (fabric.certificate.valid_until === null
    ? t('matter.labels.certificate-forever', { from: day(fabric.certificate.valid_from) })
    : t('matter.labels.certificate-until', {
      from: day(fabric.certificate.valid_from),
      date: day(fabric.certificate.valid_until),
    }));

  const watching = () => {
    switch (watched.kind) {
      case WatchingKind.All:
        return t('matter.labels.watching-all', { count: watched.of });
      case WatchingKind.Some:
        return t('matter.labels.watching-some', { count: watched.count, of: watched.of });
      default:
        return t('matter.labels.watching-none');
    }
  };

  const missing = () => {
    const shown = watched.missing.slice(0, MISSING_SHOWN).join(', ');
    return (
      <span className="matter-detailsMissing">
        {watched.missing.length > MISSING_SHOWN
          ? t('matter.labels.missing-more', { names: shown, count: watched.missing.length - MISSING_SHOWN })
          : shown}
      </span>
    );
  };

  const commands = () => (fabric.commands
    ? t('matter.labels.commands-some', {
      count: fabric.commands.count,
      ago: ago(fabric.commands.last_at),
      device: deviceNameOf(devices, fabric.commands.last_did) ?? `#${fabric.commands.last_did}`,
    })
    : t('matter.labels.commands-none'));

  const reply = (answer?: string) => t(`matter.labels.reply-${answer ?? 'unknown'}`);
  const revision = (number: number) => t('matter.labels.revision', { revision: number });

  return (
    <div className="matter-details">
      {fabric.devices && (
        <Section title={t(fabricDevices.length > 1 ? 'matter.labels.fabric-devices' : 'matter.labels.fabric-device')}>
          {fabricDevices.length === 0 && (
            <span className="matter-detailsNote">{t('matter.labels.fabric-devices-none')}</span>
          )}
          {fabricDevices.map((device, order) => (
            <Facts key={`${device.address}-${device.mac}-${order}`} rows={deviceRows(device)} />
          ))}
        </Section>
      )}

      {declared.length > 0 && (
        <Section title={t('matter.labels.section-matter')}>
          {declared.map(({ key, matter, names }) => (
            <Facts
              key={key}
              rows={[
                ...(declared.length > 1 ? [[label('declared-by'), names.join(', ')] as const] : []),
                [label('specification'), matter.version ?? t('matter.labels.specification-old')],
                ...(Number.isFinite(matter.data_model_revision)
                  ? [[label('data-model'), revision(matter.data_model_revision)] as const]
                  : []),
                ...(Number.isFinite(matter.interaction_model_revision)
                  ? [[label('interaction-model'), revision(matter.interaction_model_revision)] as const]
                  : []),
              ]}
            />
          ))}
        </Section>
      )}

      <Section title={t('matter.labels.section-pairing')}>
        <Facts
          rows={[
            [label('vendor'), vendor],
            [label('paired-via'), pairedVia()],
            ...(fabric.certificate ? [[label('certificate'), certificate()] as const] : []),
          ]}
        />
      </Section>

      {fabric.watching && (
        <Section title={t('matter.labels.section-subscriptions')}>
          <Facts
            rows={[
              [label('watching'), watching()],
              ...(watched.kind === WatchingKind.Some ? [[label('not-watching'), missing()] as const] : []),
              [label('subscriptions'), fabric.subscriptions ?? 0],
            ]}
          />
          {link?.code === 'partly' && (
            <span className="matter-detailsAdvice">{t('matter.labels.link-advice-partly')}</span>
          )}
        </Section>
      )}

      {link && (
        <Section title={t('matter.labels.section-link')}>
          <Facts
            rows={[
              [
                label('heard'),
                Number.isFinite(fabric.heard_at) ? ago(fabric.heard_at) : t('matter.labels.heard-unknown'),
              ],
              [label('commands'), commands()],
            ]}
          />
          {!NO_LINK_ADVICE.includes(link.code) && (
            <span className="matter-detailsAdvice">{t(`matter.labels.link-advice-${link.code}`)}</span>
          )}
          <div className="matter-detailsCheck">
            <Button
              variant="secondary"
              size="small"
              label={t('matter.buttons.check-link')}
              isLoading={isChecking}
              disabled={isChecking}
              onClick={onCheck}
            />
            <span className="matter-detailsNote">
              {t(isChecking ? 'matter.labels.check-running' : 'matter.labels.check-hint')}
            </span>
          </div>
          {hasCheckFailed && (
            <span className="matter-detailsNote matter-dialogError">{t('matter.labels.check-failed')}</span>
          )}
          {Number.isFinite(link.checked_at) && (
            <Facts
              rows={[
                [label('checked'), ago(link.checked_at)],
                ...(link.summary ? [
                  [label('in-network'), reply(link.summary.in_network)] as const,
                  [label('answers-bridge'), reply(link.summary.answers_bridge)] as const,
                  [label('holds-subscriptions'), reply(link.summary.holds_subscriptions)] as const,
                ] : []),
              ]}
            />
          )}
        </Section>
      )}
    </div>
  );
};
