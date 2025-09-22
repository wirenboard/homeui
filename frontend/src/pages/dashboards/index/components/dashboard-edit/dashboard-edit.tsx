import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Confirm } from '@/components/confirm';
import { Input } from '@/components/input';
import { generateNextId } from '@/utils/id';
import type { DashboardEditProps } from './types';
import './styles.css';

export const DashboardEdit = ({ dashboard, dashboards, isOpened, onSave, onClose }: DashboardEditProps) => {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [id, setId] = useState('');
  const isNew = useMemo(() => !dashboard?.id, [dashboard?.id]);
  const isUniqueId = useMemo(() => !dashboards
    .filter((item) => item.id !== dashboard?.id)
    .some((dashboard) => dashboard?.id === id), [dashboards, id]);

  useEffect(() => {
    const dashboardId = isNew
      ? generateNextId(Array.from(dashboards).map((dashboard) => dashboard.id), 'dashboard')
      : dashboard.id;
    setId(dashboardId);
    setName(dashboard?.name ?? '');
  }, [dashboard?.id]);

  return (
    <Confirm
      isOpened={isOpened}
      heading={dashboard?.id ?
        `${t('dashboards.labels.edit', { name: dashboard.name })}`
        : t('dashboards.labels.create')}
      closeCallback={onClose}
      isDisabled={!name || !id || !isUniqueId}
      acceptLabel={t('dashboards.buttons.save')}
      confirmCallback={() => {
        onSave({ id, name }, isNew);
      }}
      isOverlayCloseDisabled
    >
      <div className="dashboardEdit-container">
        <label>
          <div>
            {t('dashboards.labels.name')}
          </div>
          <Input
            className="dashboardEdit-input"
            value={name}
            autoFocus
            isFullWidth
            onChange={(value: string) => setName(value)}
          />
        </label>

        <label>
          <div>
            {t('dashboards.labels.id')}
          </div>
          <Input
            className="dashboardEdit-input"
            value={id}
            isFullWidth
            onChange={(value: string) => setId(value)}
          />

          {!isUniqueId && (
            <p className="dashboardEdit-error">{t('dashboards.errors.duplicate')}</p>
          )}
        </label>
      </div>
    </Confirm>
  );
};
