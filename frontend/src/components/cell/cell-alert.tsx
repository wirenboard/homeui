import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { Alert } from '@/components/alert';
import { Tooltip } from '@/components/tooltip';
import { Cell } from '@/stores/device';
import { copyToClipboard } from '@/utils/clipboard';
import './styles.css';

export const CellAlert = observer(({ cell }: { cell: Cell }) => {
  const { t } = useTranslation();

  return (
    <Tooltip
      text={<span><b>'{cell.id}'</b> {t('widgets.labels.copy')}</span>}
      placement="top-start"
      trigger="click"
    >
      <Alert
        size="small"
        variant={cell.value ? 'danger' : 'gray'}
        className="deviceCell-alert"
        onClick={() => copyToClipboard(cell.id)}
      >
        {cell.name}
      </Alert>
    </Tooltip>
  );
});
