import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Alert } from '@/components/alert';
import { Switch } from '@/components/switch';
import { configuratorStore, type AdapterId } from '@/stores/configurator';
import type { AdapterSwitchesProps } from '../types';

const ADAPTER_IDS: string[] = ['matter', 'alice'] satisfies AdapterId[];

export const AdapterSwitches = observer(({ target }: AdapterSwitchesProps) => {
  const { t, i18n } = useTranslation();
  const labelId = useId();

  const shown = configuratorStore.adapters
    .filter(({ id, languages }) => ADAPTER_IDS.includes(id) && (!languages || languages.includes(i18n.language)))
    .map((adapter) => ({
      ...adapter,
      id: adapter.id as AdapterId,
      label: adapter.title?.[i18n.language as 'ru' | 'en'] || adapter.title?.en || adapter.id,
    }));

  return (
    <section className="configurator-section">
      <h3 className="configurator-sectionTitle">{t('configurator.labels.show-in-apps')}</h3>
      <div className="configurator-switches">
        {shown.map(({ id, label, installed }) => (
          <span
            key={id}
            className={classNames('configurator-switch', { 'configurator-switchInactive': !installed })}
          >
            <Switch
              value={target[id]}
              isDisabled={!installed && !target[id]}
              ariaLabelledby={`${labelId}-${id}`}
              onChange={(value) => configuratorStore.setAdapters(target, { [id]: value })}
            />
            <span id={`${labelId}-${id}`}>{label}</span>
          </span>
        ))}
      </div>
      {shown.filter(({ installed }) => !installed).map(({ id, label, package: packageName }) => (
        <p key={id} className="configurator-adapterNote">
          {t('configurator.labels.adapter-not-installed', { title: label, package: packageName || id })}
        </p>
      ))}
      {shown.filter(({ installed, active }) => installed && !active).map(({ id, label, url }) => (
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
      {!target.matter && !target.alice && (
        <Alert variant="warn" size="small" className="configurator-alertInline">
          {t('configurator.labels.no-apps')}
        </Alert>
      )}
    </section>
  );
});
