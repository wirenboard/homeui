import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { Dropdown, type Option } from '@/components/dropdown';
import { Input } from '@/components/input';
import { Tooltip } from '@/components/tooltip';
import { type Cell } from '@/stores/device';
import { copyToClipboard } from '@/utils/clipboard';
import { CellHistory } from './cell-history';
import './styles.css';

export const CellText = observer(({ cell, isCompact }: { cell: Cell; isCompact: boolean }) => {
  const { t } = useTranslation();

  return (
    <div
      className={classNames('deviceCell-textWrapper', {
        'deviceCell-withSelect': (!cell.readOnly && cell.isEnum),
        'deviceCell-isCompact': isCompact,
        'deviceCell-isEmpty': isCompact && !cell.value,
      })}
    >
      {!isCompact && <CellHistory cell={cell} />}

      {cell.value && cell.readOnly && (
        <Tooltip
          text={<span><b>'{cell.value}'</b> {t('widget.labels.copy')}</span>}
          placement="top-end"
          trigger="click"
        >
          <div className="deviceCell-text" onClick={() => copyToClipboard(cell.value as string)}>
            {cell.getEnumName(cell.value as string)}
          </div>
        </Tooltip>
      )}
      {(!cell.readOnly && cell.isEnum) && (
        <Dropdown
          size="small"
          isInvalid={!!cell.error}
          options={cell.enumValues.map(({ name, value }) => ({ label: name, value }))}
          value={cell.value as string | number}
          onChange={(option: Option<string>) => cell.value = option.value}
        />
      )}
      {(!cell.readOnly && !cell.isEnum) && (
        <Input
          id={cell.id}
          value={cell.value as string}
          isDisabled={cell.readOnly}
          isInvalid={!!cell.error}
          size="small"
          ariaLabel={cell.name}
          isWithExplicitChanges
          onChange={(value) => cell.value = value}
        />
      )}

      {isCompact && <CellHistory cell={cell} />}
    </div>
  );
});
