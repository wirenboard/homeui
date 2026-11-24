import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Switch } from '@/components/switch';
import type { SettingsCardProps } from '../types';

/**
 * Applied at once, without a restart of the bridge, so there is no button to press. The
 * switch shows what the bridge holds and not what was clicked: a change the bridge
 * refused springs back by itself.
 *
 * The pairing code lives here and not beside the button that adds a fabric: changing it
 * is rare and has a cost, and next to the main action it looked like a part of adding.
 */
export const SettingsCard = ({
  settings, isSaving, hasFailed, onChange, canChangeCode, isCodeBusy, onNewCode,
}: SettingsCardProps) => {
  const { t } = useTranslation();
  const labelId = useId();
  const hintId = useId();

  return (
    <Card className="matter-card" heading={t('matter.labels.settings')}>
      {/* A bridge older than this page has no settings, and then there is no switch. */}
      {settings && (
        <div className="matter-setting">
          <div className="matter-settingText">
            <span id={labelId} className="matter-settingLabel">{t('matter.labels.name-in-model')}</span>
            <p id={hintId} className="matter-settingHint">{t('matter.labels.name-in-model-hint')}</p>
          </div>
          <Switch
            value={settings.name_in_model}
            isDisabled={isSaving}
            ariaLabelledby={labelId}
            ariaDescribedby={hintId}
            onChange={(value) => onChange({ name_in_model: value })}
          />
        </div>
      )}
      {hasFailed && <p className="matter-dialogError">{t('matter.labels.settings-failed')}</p>}
      {onNewCode && (
        <div className="matter-setting">
          <div className="matter-settingText">
            <span className="matter-settingLabel">{t('matter.labels.pairing-code')}</span>
            <p className="matter-settingHint">
              {t(canChangeCode ? 'matter.labels.pairing-code-hint' : 'matter.labels.pairing-code-busy')}
            </p>
          </div>
          {/* Only while nobody is being added: the bridge refuses to change the code it
              is waiting on. Offering the button then would be offering a refusal. */}
          {canChangeCode && (
            <Button
              size="small"
              variant="secondary"
              label={t('matter.buttons.new-code')}
              disabled={isCodeBusy}
              onClick={onNewCode}
            />
          )}
        </div>
      )}
    </Card>
  );
};
