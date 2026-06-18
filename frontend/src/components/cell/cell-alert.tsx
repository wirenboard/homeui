import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { Alert } from '@/components/alert';
import { Tooltip } from '@/components/tooltip';
import { CellError } from '@/stores/devices/cell-type';
import { copyToClipboard } from '@/utils/clipboard';
import { CellHistory } from './cell-history';
import { type CellAlertProps } from './types';
import './styles.css';

export const CellAlert = observer(({ cell, name, hideHistory }: CellAlertProps) => {
  const { t } = useTranslation();

  const variant = cell.error?.includes(CellError.Read)
    ? 'gray'
    : cell.value ? 'danger' : 'success';

  return (
    <>
      <Tooltip
        text={<span><b>'{cell.id}'</b> {t('widget.labels.copy')}</span>}
        placement="top-start"
        trigger="click"
      >
        <Alert
          size="small"
          variant={variant}
          className="deviceCell-alert"
          onClick={() => copyToClipboard(cell.id)}
        >
          {name || cell.name}
        </Alert>
      </Tooltip>

      {!hideHistory && <CellHistory cell={cell} />}
    </>
  );
});
