import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { Dropdown, type Option } from '@/components/dropdown';
import { Input } from '@/components/input';
import { Tooltip } from '@/components/tooltip';
import { Cell } from '@/stores/device';
import { copyToClipboard } from '@/utils/clipboard';
import { CellHistory } from './cell-history';
import './styles.css';

export const CellText = observer(({ cell }: { cell: Cell }) => {
  const { t } = useTranslation();

  return (
    <div
      className={classNames('deviceCell-textWrapper', {
        'deviceCell-withSelect': (!cell.readOnly && cell.isEnum),
      })}
    >
      <CellHistory cell={cell} />

      {cell.value && cell.readOnly && (
        <Tooltip
          text={<span><b>'{cell.value}'</b> {t('widgets.labels.copy')}</span>}
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
          size="small"
          ariaLabel={cell.name}
          isWithExplicitChanges
          onChange={(value) => cell.value = value}
        />
      )}
    </div>
  );
});
