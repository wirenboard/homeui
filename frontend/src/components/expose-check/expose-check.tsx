import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { Alert } from '@/components/alert';
import { type ExposeCheckProps, ExposeCheckStatus } from './types';
import './styles.css';

export const ExposeCheck = observer(({ store }: ExposeCheckProps) => {
  const { t } = useTranslation();

  if (store.result === ExposeCheckStatus.Found) {
    return (
      <Alert variant="danger" withIcon={false}>
        <h4 className="exposeCheck-title">{t('exp-check.found_title')}</h4>
        <div>{t('exp-check.details_text')}</div>
        <ul className="exposeCheck-problems">
          {store.details.map((item, index) => (
            <li key={index}>
              {item[0]}:{item[1]} — {t(`exp-check.${item[2]}_desc`)}
            </li>
          ))}
        </ul>
        <div>
          <span>{t('exp-check.found_instructions')}</span>
          <a href={t('exp-check.support_url')} target="_blank">
            {t('exp-check.support_url')}
          </a>
        </div>
      </Alert>
    );
  }
});
