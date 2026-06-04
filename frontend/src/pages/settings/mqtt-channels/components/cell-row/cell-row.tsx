import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { errorsConvention } from '@/common/links';
import { TableCell, TableRow } from '@/components/table';
import { Tag } from '@/components/tag';
import { type Cell } from '@/stores/devices';

export const CellRow = observer(({ cell }: { cell: Cell }) => {
  const { t } = useTranslation();

  return (
    <TableRow tabIndex={0}>
      <TableCell verticalAlign="top">
        {cell.id}
      </TableCell>
      <TableCell verticalAlign="top">
        {cell.type}
      </TableCell>
      <TableCell verticalAlign="top">
        {`/devices/${cell.deviceId}/controls/${cell.controlId}`}
      </TableCell>
      <TableCell verticalAlign="top">
        <div className="mqtt-value">
          {String(cell.value)}
        </div>
      </TableCell>
      <TableCell align="right" verticalAlign="top">
        {cell.error ? (
          <a href={errorsConvention} target="_blank">
            <Tag variant="danger">
              {t('mqtt.labels.error', { error: cell.error.at(0) })}
            </Tag>
          </a>
        ) : (
          <Tag variant="success">OK</Tag>
        )}
      </TableCell>
    </TableRow>
  );
});
