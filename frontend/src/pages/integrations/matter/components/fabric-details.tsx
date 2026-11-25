import { format, formatDistance } from 'date-fns';
import { enUS, ru } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/button';
import type { MatterCommand, MatterFabricDevice } from '@/stores/matter';
import type { DetailsFactsProps, DetailsSectionProps, FabricDetailsProps } from '../types';
import { roleSaysKey, vendorHex } from '../utils';

// More names than this in one cell push everything below them off the screen.
const MISSING_SHOWN = 3;

// The verdicts with nothing to advise in the section of the status: all is well, or the
// advice is about what one controller follows and stands with that controller.
const NO_STATUS_ADVICE = ['online', 'partly'];

const Section = ({ title, children }: DetailsSectionProps) => (
  <section className="matter-detailsSection">
    <h4 className="matter-detailsHeading">{title}</h4>
    {children}
  </section>
);

const Facts = ({ rows }: DetailsFactsProps) => (
  <dl className="matter-facts">
    {rows.map(([name, value], order) => (
      // With its place: two commands of one second carry the same label.
      <div className="matter-fact" key={`${name}-${order}`}>
        <dt>{name}</dt>
        <dd>{value}</dd>
      </div>
    ))}
  </dl>
);

/**
 * What the bridge knows of one fabric, under its row: first the short facts of the fabric
 * as a whole - the pairing, the commands, the status - and then its controllers, which
 * are the long part. Every controller shows the same rows in the same order, so two of
 * them are compared by reading down; what is not known is said in a word, not left out.
 *
 * Everything here is worked out by the bridge and only put into words.
 */
export const FabricDetails = ({
  fabric, now, isChecking, hasCheckFailed, onCheck,
}: FabricDetailsProps) => {
  const { t, i18n } = useTranslation();
  const isRussian = i18n.language === 'ru';
  const ago = (at: number) => formatDistance(at, now, { locale: isRussian ? ru : enUS, addSuffix: true });
  const day = (at: number) => format(at, isRussian ? 'dd.MM.yyyy' : 'dd/MM/yyyy');
  const minute = (at: number) => format(at, isRussian ? 'dd.MM.yyyy, HH:mm' : 'dd/MM/yyyy, HH:mm');
  const second = (at: number) => format(at, isRussian ? 'dd.MM.yyyy, HH:mm:ss' : 'dd/MM/yyyy, HH:mm:ss');
  const label = (name: string) => t(`matter.labels.fact-${name}`);
  const unknown = t('matter.labels.unknown');
  const none = t('matter.labels.none');
  const deviceName = (name: string | undefined, did: number) => name ?? `#${did}`;

  const controllers = fabric.devices ?? [];
  const { link, commands } = fabric;

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

  // What an app asked of a device: in a word where the bridge has one for it.
  const asked = ({ action, asked: writes }: MatterCommand) => (action
    ? t(`matter.labels.asked-${action}`)
    : writes.map(({ role, value }) => `${role}: ${value}`).join(', '));

  const commandRows = (): DetailsFactsProps['rows'] => {
    if (!commands.recent) {
      // A bridge that keeps the count alone.
      return [[second(commands.last_at), deviceName(commands.last_name, commands.last_did)]];
    }
    return commands.recent.map((command) => [
      second(command.at),
      <span className="matter-detailsCommand" key={command.at}>
        <span>
          {t('matter.labels.command', { device: deviceName(command.name, command.did), asked: asked(command) })}
        </span>
        <span className="matter-detailsNote">
          {t('matter.labels.command-from', {
            controller: command.from.name ?? command.from.address ?? t('matter.labels.device-nameless'),
          })}
        </span>
      </span>,
    ]);
  };

  const roleTitle = ({ role, role_name: roleName, name }: MatterFabricDevice) => {
    if (!role || !roleName) {
      return name ?? t('matter.labels.device-nameless');
    }
    const isDated = Number.isFinite(fabric.paired_at);
    return (
      <>
        <span className="matter-detailsRole">{t(`matter.labels.role-${roleName.replace(/_/g, '-')}`)}</span>
        {` - ${t(`matter.labels.${roleSaysKey(role, isDated)}`, isDated ? { date: minute(fabric.paired_at) } : {})}`}
      </>
    );
  };

  const missing = (names: string[]) => {
    const shown = names.slice(0, MISSING_SHOWN).join(', ');
    return (
      <span className="matter-detailsMissing">
        {names.length > MISSING_SHOWN
          ? t('matter.labels.missing-more', { names: shown, count: names.length - MISSING_SHOWN })
          : shown}
      </span>
    );
  };

  const reply = (answer?: string) => t(`matter.labels.reply-${answer ?? 'unknown'}`);

  const revision = (number?: number | null) => (Number.isFinite(number)
    ? t('matter.labels.revision', { revision: number })
    : unknown);

  // The same rows for every controller, in the same order.
  const controllerRows = (controller: MatterFabricDevice): DetailsFactsProps['rows'] => {
    const { matter, watching } = controller;
    // A controller with no session follows nothing; a bridge that does not count says nothing.
    const follows = {
      all: t('matter.labels.watching-all', { count: watching?.of }),
      some: t('matter.labels.watching-some', { count: watching?.dids.length, of: watching?.of }),
      none,
    }[watching ? watching.kind : 'none'] ?? unknown;
    return [
      [label('device-name'), controller.name ?? t('matter.labels.device-nameless')],
      [label('device-mac'), controller.mac ?? unknown],
      [label('device-address'), controller.address ?? unknown],
      [label('subscriptions'), controller.subscriptions > 0 ? controller.subscriptions : none],
      [label('watching'), follows],
      ...(watching?.kind === 'some'
        ? [[label('not-watching'), missing(watching.missing_names ?? [])] as const]
        : []),
      [label('heard'), Number.isFinite(controller.heard_at) ? ago(controller.heard_at) : unknown],
      [label('matter'), matter ? matter.version ?? t('matter.labels.specification-old') : unknown],
      [label('data-model'), revision(matter?.data_model_revision)],
      [label('interaction-model'), revision(matter?.interaction_model_revision)],
    ];
  };

  return (
    <div className="matter-details">
      <Section title={t('matter.labels.section-pairing')}>
        <Facts
          rows={[
            [label('vendor'), vendor],
            [label('paired-via'), pairedVia()],
            ...(fabric.certificate ? [[label('certificate'), certificate()] as const] : []),
          ]}
        />
      </Section>

      {link && (
        <Section title={t('matter.labels.section-commands')}>
          {commands ? (
            <>
              <Facts rows={commandRows()} />
              <span className="matter-detailsNote">
                {t(commands.recent && commands.count > commands.recent.length
                  ? 'matter.labels.commands-total-more'
                  : 'matter.labels.commands-total', { count: commands.count, shown: commands.recent?.length })}
              </span>
            </>
          ) : (
            <span className="matter-detailsNote">{t('matter.labels.commands-none')}</span>
          )}
        </Section>
      )}

      {link && (
        <Section title={t('matter.labels.section-status')}>
          <Facts
            rows={[[
              label('heard'),
              Number.isFinite(fabric.heard_at) ? ago(fabric.heard_at) : t('matter.labels.heard-unknown'),
            ]]}
          />
          {!NO_STATUS_ADVICE.includes(link.code) && (
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

      {fabric.devices && (
        <Section title={t(controllers.length > 1 ? 'matter.labels.controllers' : 'matter.labels.controller')}>
          <span className="matter-detailsNote">
            {t(controllers.length === 0 ? 'matter.labels.controllers-none' : 'matter.labels.controllers-about')}
          </span>
          {controllers.map((controller, order) => (
            <div className="matter-detailsDevice" key={`${controller.address}-${controller.mac}-${order}`}>
              <h5 className="matter-detailsDeviceTitle">{roleTitle(controller)}</h5>
              <Facts rows={controllerRows(controller)} />
              {controller.watching?.kind === 'some' && (
                <span className="matter-detailsAdvice">{t('matter.labels.link-advice-partly')}</span>
              )}
            </div>
          ))}
        </Section>
      )}
    </div>
  );
};
