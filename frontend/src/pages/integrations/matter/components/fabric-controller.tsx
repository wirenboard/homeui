import { useTranslation } from 'react-i18next';
import { useTimes } from '../hooks';
import type { FabricControllerProps } from '../types';
import { roleSaysKey } from '../utils';
import { Facts } from './details';
import { StatusLine } from './status-line';

// More names than this in one cell push everything below them off the screen.
const MISSING_SHOWN = 3;

/**
 * One controller of a fabric - a device of the app that talks to the bridge: what it is
 * for the app, and then the same rows as every other controller has, in the same order,
 * so two of them are compared by reading down. What is not known is said in a word, not
 * left out.
 *
 * A controller that does not follow every device has a problem, and the two rows that say
 * so and the advice under them carry its sign.
 */
export const FabricController = ({ controller, pairedAt, now }: FabricControllerProps) => {
  const { t } = useTranslation();
  const { ago, minute } = useTimes(now);
  const label = (name: string) => t(`matter.labels.fact-${name}`);
  const unknown = t('matter.labels.unknown');
  const none = t('matter.labels.none');
  const { matter, watching } = controller;
  const followsOnlySome = watching?.kind === 'some';

  const title = () => {
    const { role, role_name: roleName, name } = controller;
    if (!role || !roleName) {
      return name ?? t('matter.labels.device-nameless');
    }
    const isDated = Number.isFinite(pairedAt);
    return (
      <>
        <span className="matter-detailsRole">{t(`matter.labels.role-${roleName.replace(/_/g, '-')}`)}</span>
        {` - ${t(`matter.labels.${roleSaysKey(role, isDated)}`, isDated ? { date: minute(pairedAt) } : {})}`}
      </>
    );
  };

  // A controller with no session follows nothing; a bridge that does not count says nothing.
  const follows = {
    all: t('matter.labels.watching-all', { count: watching?.of }),
    some: t('matter.labels.watching-some', { count: watching?.dids.length, of: watching?.of }),
    none,
  }[watching ? watching.kind : 'none'] ?? unknown;

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

  const revision = (number?: number | null) => (Number.isFinite(number)
    ? t('matter.labels.revision', { revision: number })
    : unknown);

  return (
    <div className="matter-detailsDevice">
      <h5 className="matter-detailsDeviceTitle">{title()}</h5>
      <Facts
        rows={[
          [label('device-name'), controller.name ?? t('matter.labels.device-nameless')],
          [label('device-mac'), controller.mac ?? unknown],
          [label('device-address'), controller.address ?? unknown],
          [label('subscriptions'), controller.subscriptions > 0 ? controller.subscriptions : none],
          [label('watching'), follows, followsOnlySome ? 'error' : undefined],
          ...(followsOnlySome
            ? [[label('not-watching'), missing(watching.missing_names ?? []), 'error'] as const]
            : []),
          [label('heard'), Number.isFinite(controller.heard_at) ? ago(controller.heard_at) : unknown],
          [label('matter'), matter ? matter.version ?? t('matter.labels.specification-old') : unknown],
          [label('data-model'), revision(matter?.data_model_revision)],
          [label('interaction-model'), revision(matter?.interaction_model_revision)],
        ]}
      />
      {followsOnlySome && (
        <span className="matter-detailsAdvice">
          <StatusLine status="error">{t('matter.labels.link-advice-partly')}</StatusLine>
        </span>
      )}
    </div>
  );
};
