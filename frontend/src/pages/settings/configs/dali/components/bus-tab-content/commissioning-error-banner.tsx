import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { Alert } from '@/components/alert';
import type { BusStore } from '@/stores/dali';

const formatFinishedAt = (iso: string | null, locale: string): string => {
  if (!iso) {
    return '';
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  }).format(date);
};

export const CommissioningErrorBanner = observer(({ store }: { store: BusStore }) => {
  const { t, i18n } = useTranslation();
  const { status, error, finished_at: finishedAt } = store.commissioningState;
  if (status !== 'failed') {
    return null;
  }
  const when = formatFinishedAt(finishedAt, i18n.language);
  return (
    <Alert variant="danger">
      {t('dali.labels.scan-error', { when, error: error ?? '' })}
    </Alert>
  );
});
