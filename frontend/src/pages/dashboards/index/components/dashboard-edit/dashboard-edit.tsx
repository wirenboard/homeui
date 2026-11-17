import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Confirm } from '@/components/confirm';
import { Input } from '@/components/input';
import { Switch } from '@/components/switch';
import { generateNextId } from '@/utils/id';
import type { DashboardEditProps } from './types';
import './styles.css';

export const DashboardEdit = ({ dashboard, dashboards, isOpened, onSave, onClose }: DashboardEditProps) => {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [id, setId] = useState('');
  const [columns, setColumns] = useState<number | null>(null);
  const [showHistory, setShowHistory] = useState(true);
  const isNew = useMemo(() => !dashboard?.id, [dashboard?.id]);
  const isUniqueId = useMemo(() => !dashboards
    .filter((item) => item.id !== dashboard?.id)
    .some((dashboard) => dashboard?.id === id), [dashboards, id]);
  const isValidIdChars = useMemo(() => !/[#/]/.test(id), [id]);

  useEffect(() => {
    const dashboardId = isNew
      ? generateNextId(Array.from(dashboards).map((dashboard) => dashboard.id), 'dashboard')
      : dashboard.id;
    setId(dashboardId);
    setName(dashboard?.name ?? '');
    setColumns(dashboard?.options?.columns ?? null);
    setShowHistory(dashboard?.options?.showHistory !== false);
  }, [dashboard?.id]);

  return (
    <Confirm
      isOpened={isOpened}
      heading={dashboard?.id ?
        `${t('dashboards.labels.edit', { name: dashboard.name })}`
        : t('dashboards.labels.create')}
      closeCallback={onClose}
      isDisabled={!name || !id || !isUniqueId || !isValidIdChars}
      acceptLabel={t('dashboards.buttons.save')}
      confirmCallback={() => {
        onSave({
          id,
          name,
          options: {
            ...dashboard?.options,
            columns: columns ?? undefined,
            showHistory: showHistory ? undefined : false,
          },
        }, isNew);
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

          {!isValidIdChars && (
            <p className="dashboardEdit-error">{t('dashboards.errors.invalid-id-chars')}</p>
          )}
          {isValidIdChars && !isUniqueId && (
            <p className="dashboardEdit-error">{t('dashboards.errors.duplicate')}</p>
          )}
        </label>

        <label className="dashboardEdit-switch">
          <div>{t('dashboards.labels.show-history')}</div>
          <Switch
            id="showHistory"
            value={showHistory}
            onChange={setShowHistory}
          />
        </label>
      </div>
    </Confirm>
  );
};
