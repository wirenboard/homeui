import { observer } from 'mobx-react-lite';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Alert } from '@/components/alert';
import { Switch } from '@/components/switch';
import { configuratorStore } from '@/stores/configurator';
import type { AdapterSwitchesProps } from '../types';
import { adapterLabel, isAdapterOn } from '../utils';

export const AdapterSwitches = observer(({ target }: AdapterSwitchesProps) => {
  const { t, i18n } = useTranslation();
  const labelId = useId();

  const shown = configuratorStore.adapters
    .map((adapter) => ({
      ...adapter,
      label: adapterLabel(adapter, i18n.language),
      isOn: isAdapterOn(target, adapter),
    }));

  if (!shown.length) {
    return null;
  }

  return (
    <section className="configurator-section">
      <h3 className="configurator-sectionTitle">{t('configurator.labels.show-in-apps')}</h3>
      <div className="configurator-switches">
        {shown.map(({ id, label, isOn }) => (
          <span key={id} className="configurator-switch">
            <Switch
              value={isOn}
              ariaLabelledby={`${labelId}-${id}`}
              onChange={(value) => configuratorStore.setAdapters(target, { [id]: value })}
            />
            <span id={`${labelId}-${id}`}>{label}</span>
          </span>
        ))}
      </div>
      {shown.filter(({ active }) => active === false).map(({ id, label, url }) => (
        <Alert key={id} variant="warn" size="small" className="configurator-alertInline">
          {t('configurator.labels.adapter-stopped', { title: label })}
          {url && (
            <>
              {' '}
              <Link to={`/${url}`}>{t('configurator.labels.adapter-page')}</Link>
            </>
          )}
        </Alert>
      ))}
      {shown.every(({ isOn }) => !isOn) && (
        <Alert variant="warn" size="small" className="configurator-alertInline">
          {t('configurator.labels.no-apps')}
        </Alert>
      )}
    </section>
  );
});
