import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FieldLabel } from '@/components/form/field-label';
import { FormField } from '@/components/form/form-field';
import { Input } from '@/components/input';
import type { BusStore } from '@/stores/dali';

export const PollingIntervalField = observer(({ store }: { store: BusStore }) => {
  const { t } = useTranslation();
  const { pollingInterval } = store;
  const [pollingStr, setPollingStr] = useState(String(pollingInterval));
  const [pollingError, setPollingError] = useState<string | undefined>(undefined);

  useEffect(() => {
    setPollingStr(String(pollingInterval));
  }, [pollingInterval]);

  const isValid = (v: string) => {
    const num = Number(v);
    return Number.isInteger(num) && num >= 1;
  };

  const save = (v: string) => {
    if (isValid(v)) {
      store.setPollingInterval(Number(v));
    }
  };

  return (
    <FormField error={pollingError}>
      <FieldLabel title={t('dali.labels.polling-interval')} />
      <Input
        value={pollingStr}
        isInvalid={!!pollingError}
        onChange={(v) => {
          const str = String(v);
          setPollingStr(str);
          setPollingError(isValid(str) ? undefined : t('dali.labels.polling-interval-error'));
        }}
        onBlur={() => {
          setTimeout(() => save(pollingStr), 0);
        }}
        onEnter={() => save(pollingStr)}
      />
    </FormField>
  );
});
