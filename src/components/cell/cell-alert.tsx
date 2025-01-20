import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { Alert } from '@/components/alert';
import { Cell } from '@/stores/device';
import { notificationsStore } from '@/stores/notifications';
import './styles.css';

export const CellAlert = observer(({ cell }: { cell: Cell }) => {
  const { t } = useTranslation();
  const { showNotification } = notificationsStore;

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(cell.id);
    showNotification({ text: `'${cell.id}' ${t('widgets.labels.copy')}` });
  };

  return (
    <Alert size="small" variant={cell.value ? 'danger' : 'gray'} className="deviceCell-alert" onClick={copyToClipboard}>
      {cell.name}
    </Alert>
  );
});
