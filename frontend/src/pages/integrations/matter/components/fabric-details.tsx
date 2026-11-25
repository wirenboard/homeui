import { useTranslation } from 'react-i18next';
import { Button } from '@/components/button';
import type { MatterCommand } from '@/stores/matter';
import { useTimes } from '../hooks';
import type { DetailsFactsProps, FabricDetailsProps } from '../types';
import { fabricDisplayLabel, replacedLabelText, vendorHex } from '../utils';
import { Details, Facts, Section } from './details';
import { FabricController } from './fabric-controller';
import { StatusLine } from './status-line';

// The verdicts with nothing to advise in the section of the status: all is well, or the
// advice is about what one controller follows and stands with that controller.
const NO_STATUS_ADVICE = ['online', 'partly'];

/**
 * What the bridge knows of one fabric, under its row: first the short facts of the fabric
 * as a whole - the pairing, the commands, the status - and then its controllers, which
 * are the long part (FabricController).
 *
 * A problem the row marked is marked here again, with the same sign, at the fact that
 * says it. Everything is worked out by the bridge and only put into words.
 */
export const FabricDetails = ({
  fabric, now, isChecking, hasCheckFailed, onCheck,
}: FabricDetailsProps) => {
  const { t } = useTranslation();
  const { ago, day, second } = useTimes(now);
  const label = (name: string) => t(`matter.labels.fact-${name}`);
  const deviceName = (name: string | undefined, did: number) => name ?? `#${did}`;

  const controllers = fabric.devices ?? [];
  const { link, commands } = fabric;
  const hasLinkTrouble = fabric.overview?.link.status === 'error';

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
          {command.from.name ?? command.from.address
            ? t('matter.labels.command-from', { controller: command.from.name ?? command.from.address })
            : t('matter.labels.device-nameless')}
        </span>
      </span>,
    ]);
  };

  const reply = (answer?: string) => t(`matter.labels.reply-${answer ?? 'unknown'}`);

  return (
    <Details title={fabricDisplayLabel(fabric, t)}>
      <Section title={t('matter.labels.section-pairing')}>
        <Facts
          rows={[
            [label('vendor'), vendor],
            // The label of the app, where one typed on this controller stands instead of it.
            ...(replacedLabelText(fabric, t) ? [[label('app-label'), replacedLabelText(fabric, t)] as const] : []),
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
            <span className="matter-detailsAdvice">
              {hasLinkTrouble
                ? <StatusLine status="error">{t(`matter.labels.link-advice-${link.code}`)}</StatusLine>
                : t(`matter.labels.link-advice-${link.code}`)}
            </span>
          )}
          <div className="matter-detailsCheck" data-nocopy>
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
            <FabricController
              key={`${controller.address}-${controller.mac}-${order}`}
              controller={controller}
              pairedAt={fabric.paired_at}
              now={now}
            />
          ))}
        </Section>
      )}
    </Details>
  );
};
