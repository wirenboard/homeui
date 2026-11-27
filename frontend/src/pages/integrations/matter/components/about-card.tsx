import { useTranslation } from 'react-i18next';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { useTimes } from '../hooks';
import type { AboutCardProps } from '../types';

/**
 * What the bridge is, as an app is told it, and the one act that makes it another bridge
 * to every app: the reset. Each value is the bridge's own; what it did not say is
 * "unknown" and the line stays, so the card looks one way on any bridge.
 *
 * The last line says when the Matter node was made, a parameter like the ones above it,
 * and the reset stands in that very line: making the node anew is what a reset does. The
 * button is red - it cannot be taken back. It is the factory reset of the Matter side,
 * not of the controller.
 */
export const AboutCard = ({
  about, version, isBusy, onReset,
}: AboutCardProps) => {
  const { t } = useTranslation();
  const times = useTimes(Date.now());
  const lines: [string, string | null | undefined][] = [
    ['about-name', about?.name],
    ['about-version', version],
    ['about-matter', about?.matter_version],
  ];

  return (
    <Card className="matter-card" heading={t('matter.labels.about')}>
      <dl className="matter-about">
        {lines.map(([key, value]) => (
          <div key={key} className="matter-aboutLine">
            <dt>{t(`matter.labels.${key}`)}</dt>
            <dd>{value || t('matter.labels.about-unknown')}</dd>
          </div>
        ))}
        <div className="matter-aboutLine matter-aboutNode">
          <dt>{t('matter.labels.node-created')}</dt>
          <dd className="matter-aboutAction">
            <div className="matter-settingText">
              <span>
                {about?.identity_since ? times.minute(about.identity_since) : t('matter.labels.about-unknown')}
              </span>
              <p className="matter-settingHint">{t('matter.labels.reset-hint')}</p>
            </div>
            <Button
              size="small"
              variant="danger"
              label={t('matter.buttons.reset')}
              disabled={isBusy}
              onClick={onReset}
            />
          </dd>
        </div>
      </dl>
    </Card>
  );
};
