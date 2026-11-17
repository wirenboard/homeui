import { useTranslation } from 'react-i18next';
import { Confirm } from '@/components/confirm';
import { type WidgetDeleteProps } from './types';
import './styles.css';

export const WidgetDelete = ({ name, associatedDashboards, isOpened, onDelete, onClose }: WidgetDeleteProps) => {
  const { t } = useTranslation();

  return (
    <Confirm
      isOpened={isOpened}
      heading={t('widget.labels.delete')}
      variant="danger"
      closeCallback={onClose}
      confirmCallback={onDelete}
    >
      {!!associatedDashboards?.length && (
        <>
          <p>{t('widget.labels.warning')}</p>
          <ul className="widgetDelete-list">
            {associatedDashboards.map((dashboard) => (<li key={dashboard.id}>{dashboard.name}</li>))}
          </ul>
        </>
      )}
      <p>{t('widget.prompt.delete')} <b>{name}</b>?</p>
    </Confirm>
  );
};
