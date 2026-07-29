import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Confirm } from '@/components/confirm';
import { Dropdown, type Option } from '@/components/dropdown';
import { Input } from '@/components/input';
import { generateNextId } from '@/utils/id';
import type { DashboardEditProps } from './types';
import './styles.css';

const COLUMN_OPTIONS: Option<number | null>[] = [
  { label: '', value: null },
  { label: '1', value: 1 },
  { label: '2', value: 2 },
  { label: '3', value: 3 },
  { label: '4', value: 4 },
];

export const DashboardEdit = ({ dashboard, dashboards, isOpened, onSave, onClose }: DashboardEditProps) => {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [id, setId] = useState('');
  const [columns, setColumns] = useState<number | null>(null);
  const isNew = useMemo(() => !dashboard?.id, [dashboard?.id]);
  const isUniqueId = useMemo(() => !dashboards
    .filter((item) => item.id !== dashboard?.id)
    .some((dashboard) => dashboard?.id === id), [dashboards, id]);

  const columnOptions = useMemo(() => {
    const opts = [...COLUMN_OPTIONS];
    opts[0] = { ...opts[0], label: t('common.labels.columns-auto') };
    return opts;
  }, [t]);

  useEffect(() => {
    const dashboardId = isNew
      ? generateNextId(Array.from(dashboards).map((dashboard) => dashboard.id), 'dashboard')
      : dashboard.id;
    setId(dashboardId);
    setName(dashboard?.name ?? '');
    setColumns(dashboard?.options?.columns ?? null);
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
        onSave({ id, name, options: { ...dashboard?.options, columns: columns ?? undefined } }, isNew);
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

        <label>
          <div>
            {t('common.labels.columns')}
          </div>
          <Dropdown
            options={columnOptions}
            value={columns}
            minWidth="120px"
            onChange={(opt) => setColumns((opt as Option<number | null>).value)}
          />
        </label>
      </div>
    </Confirm>
  );
};
