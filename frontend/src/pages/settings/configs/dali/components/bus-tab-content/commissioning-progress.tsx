import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/button';
import { Progress } from '@/components/progress';
import type { BusStore } from '@/stores/dali';

export const CommissioningProgress = observer(({ store }: { store: BusStore }) => {
  const { t } = useTranslation();
  const { progress, status, device_count } = store.commissioningState;
  const caption = status ? t(`dali.labels.scan-stage-${status}`, { count: device_count }) : '';

  return (
    <div className="dali-commissioningProgress">
      <Progress value={progress} caption={caption}/>
      <Button
        label={t('dali.buttons.stop-scan')}
        variant="secondary"
        isLoading={store.scanStopRequested}
        disabled={store.scanStopRequested}
        onClick={() => store.stopScan()}
      />
    </div>
  );
});
