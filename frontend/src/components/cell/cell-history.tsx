import { compressToEncodedURIComponent } from 'lz-string';
import { observer } from 'mobx-react-lite';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import StatsIcon from '@/assets/icons/stats.svg';
import { Tooltip } from '@/components/tooltip';
import { type Cell } from '@/stores/device';
import './styles.css';

export const CellHistory = observer(({ cell }: { cell: Cell }) => {
  const { t } = useTranslation();

  const getChartUrl = useMemo(() => {
    const data = { c: [{ d: cell.deviceId, c: cell.controlId }] };
    const encodedUrl = encodeURIComponent(compressToEncodedURIComponent(JSON.stringify(data)));
    return `#!/history/${encodedUrl}`;
  }, [cell]);

  return (
    <a href={getChartUrl} aria-label={`${t('widget.labels.graph')} ${cell.name}`}>
      <Tooltip text={t('widget.labels.graph')} placement="top-end">
        <span>
          <StatsIcon className="deviceCell-historyLink" />
        </span>
      </Tooltip>
    </a>
  );
});
