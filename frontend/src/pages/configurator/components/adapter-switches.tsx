import { observer } from 'mobx-react-lite';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from '@/components/alert';
import { Switch } from '@/components/switch';
import { configuratorStore } from '@/stores/configurator';
import type { AdapterSwitchesProps } from '../types';

export const AdapterSwitches = observer(({ target }: AdapterSwitchesProps) => {
  const { t } = useTranslation();
  const matterId = useId();
  const aliceId = useId();

  return (
    <section className="configurator-section">
      <h3 className="configurator-sectionTitle">{t('configurator.labels.show-in-apps')}</h3>
      <div className="configurator-switches">
        <span className="configurator-switch">
          <Switch
            value={target.matter}
            ariaLabelledby={matterId}
            onChange={(matter) => configuratorStore.setAdapters(target, { matter })}
          />
          <span id={matterId}>Matter</span>
        </span>
        <span className="configurator-switch">
          <Switch
            value={target.alice}
            ariaLabelledby={aliceId}
            onChange={(alice) => configuratorStore.setAdapters(target, { alice })}
          />
          <span id={aliceId}>{t('navigation.labels.alice')}</span>
        </span>
      </div>
      {!target.matter && !target.alice && (
        <Alert variant="warn" size="small" className="configurator-alertInline">
          {t('configurator.labels.no-apps')}
        </Alert>
      )}
    </section>
  );
});
