import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/card';
import { Switch } from '@/components/switch';
import type { SettingsCardProps } from '../types';

/**
 * Applied at once, without a restart of the bridge, so there is no button to press. The
 * switch shows what the bridge holds and not what was clicked: a change the bridge
 * refused springs back by itself.
 */
export const SettingsCard = ({
  settings, isSaving, hasFailed, onChange,
}: SettingsCardProps) => {
  const { t } = useTranslation();
  const labelId = useId();
  const hintId = useId();

  return (
    <Card className="matter-card" heading={t('matter.labels.settings')}>
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
      {hasFailed && <p className="matter-dialogError">{t('matter.labels.settings-failed')}</p>}
    </Card>
  );
};
