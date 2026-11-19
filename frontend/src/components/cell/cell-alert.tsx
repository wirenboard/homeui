import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { Alert } from '@/components/alert';
import { Tooltip } from '@/components/tooltip';
import { CellError } from '@/stores/devices/cell-type';
import { copyToClipboard } from '@/utils/clipboard';
import { CellHistory } from './cell-history';
import { topicCopyPolicy } from './topic-copy-policy';
import { type CellAlertProps } from './types';
import './styles.css';

export const CellAlert = observer(({ cell, name, hideHistory, hideCopy }: CellAlertProps) => {
  const { t } = useTranslation();

  const variant = cell.error?.includes(CellError.Read)
    ? 'gray'
    : cell.value ? 'danger' : 'success';

  // A host without a broker switches topic copying off for every cell, on top
  // of the per-use hideCopy — see topicCopyPolicy.
  const canCopyTopic = !hideCopy && topicCopyPolicy.enabled;

  return (
    <>
      {canCopyTopic ? (
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
      ) : (
        <Alert
          size="small"
          variant={variant}
          className="deviceCell-alert deviceCell-noClick"
        >
          {name || cell.name}
        </Alert>
      )}

      {!hideHistory && <CellHistory cell={cell} />}
    </>
  );
});
