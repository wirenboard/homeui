import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { Dropdown } from '@/components/dropdown';
import { Input } from '@/components/input';
import { Cell } from '@/stores/device';
import { notificationsStore } from '@/stores/notifications';
import './styles.css';

export const CellText = observer(({ cell }: { cell: Cell }) => {
  const { t } = useTranslation();
  const { showNotification } = notificationsStore;

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(cell.value);
    showNotification({ text: `'${cell.value}' ${t('widgets.labels.copy')}` });
  };

  return (
    <div onClick={copyToClipboard}>
      {cell.readOnly && (<div className="deviceCell-text">{cell.getEnumName(cell.value)}</div>)}
      {(!cell.readOnly && cell.isEnum) && (
        <Dropdown
          className="deviceCell-select"
          size="small"
          options={cell.enumValues.map(({ name, value }) => ({ label: name, value }))}
          value={cell.value}
          onChange={(option) => cell.value = option.value}
        />
      )}
      {(!cell.readOnly && !cell.isEnum) && (
        <Input
          id={cell.id}
          value={cell.value}
          isDisabled={cell.readOnly}
          size="small"
          ariaLabel={cell.name}
          onChange={(value) => cell.value = value}
        />
      )}
    </div>
  );
});
