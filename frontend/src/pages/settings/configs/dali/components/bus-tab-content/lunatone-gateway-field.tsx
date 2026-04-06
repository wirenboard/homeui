import { observer } from 'mobx-react-lite';
import { useEffect, useState, useId } from 'react';
import { useTranslation } from 'react-i18next';
import { BooleanField } from '@/components/form';
import { FieldLabel } from '@/components/form/field-label';
import { FormField } from '@/components/form/form-field';
import { Input } from '@/components/input';
import { useAsyncAction } from '@/utils/async-action';
import type { BusStore } from '@/stores/dali';

export const LunatoneGatewayField = observer(({ store }: { store: BusStore }) => {
  const { t } = useTranslation();
  const { websocketEnabled, websocketPort } = store;
  const [portStr, setPortStr] = useState(websocketPort !== undefined ? String(websocketPort) : '');
  const [portError, setPortError] = useState<string | undefined>(undefined);
  const inputId = useId();

  useEffect(() => {
    setPortStr(websocketPort !== undefined ? String(websocketPort) : '');
  }, [websocketPort]);

  const [toggle, isToggling] = useAsyncAction(async () => {
    await store.setWebsocketEnabled(!websocketEnabled);
  });

  const isValid = (v: string) => {
    const num = Number(v);
    return !!v && Number.isInteger(num) && num >= 1 && num <= 65535;
  };

  const save = (v: string) => {
    if (isValid(v)) {
      store.setWebsocketPort(Number(v));
    }
  };

  return (
    <>
      <BooleanField
        title={t('dali.labels.websocket-enabled')}
        value={websocketEnabled}
        description={t('dali.labels.websocket-description')}
        isDisabled={isToggling}
        onChange={toggle}
      />
      <FormField error={portError}>
        <FieldLabel title={t('dali.labels.websocket-port')} inputId={inputId}/>
        <Input
          id={inputId}
          value={portStr}
          isDisabled={!websocketEnabled || isToggling}
          isInvalid={!!portError}
          onChange={v => {
            const str = String(v);
            setPortStr(str);
            setPortError(isValid(str) ? undefined : t('dali.labels.websocket-port-error'));
          }}
          onBlur={() => { setTimeout(() => save(portStr), 0); }}
          onEnter={() => save(portStr)}
        />
      </FormField>
    </>
  );
});
