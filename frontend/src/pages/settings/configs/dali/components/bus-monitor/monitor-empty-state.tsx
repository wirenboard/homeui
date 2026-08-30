import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/button';
import { daliGlobalStore } from '@/stores/dali';
import type { Gateway } from '@/stores/dali/types';
import './styles.css';

/**
 * What the console panel shows when it is open but no bus is being monitored —
 * the "Bus Monitor" header button opens the panel regardless, and an empty
 * drawer with no explanation read as a bug. Says why it is empty and enables
 * monitoring for a bus right here, the same action as the toggle at the
 * bottom of that bus's tab.
 */
export const DaliMonitorEmptyState = observer(() => {
  const { t } = useTranslation();
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [busyBusId, setBusyBusId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    daliGlobalStore.refresh().then(
      (list) => !cancelled && setGateways(list),
      () => {},
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const enable = async (busId: string, gatewayName: string, busIndex: number) => {
    setBusyBusId(busId);
    try {
      await daliGlobalStore.setBusMonitorEnabled(busId, true, { gatewayName, busIndex });
    } finally {
      setBusyBusId(null);
    }
  };

  return (
    <div className="daliMonitorEmpty">
      <p className="daliMonitorEmpty-hint">{t('dali.labels.monitor-empty-hint')}</p>
      <div className="daliMonitorEmpty-buses">
        {gateways.map((gateway) => gateway.buses.map((bus, index) => (
          <Button
            key={bus.id}
            variant="secondary"
            label={`${gateway.name} / ${t('dali.labels.bus', { num: index + 1 })}`}
            isLoading={busyBusId === bus.id}
            disabled={busyBusId !== null}
            onClick={() => enable(bus.id, gateway.name, index + 1)}
          />
        )))}
      </div>
    </div>
  );
});
