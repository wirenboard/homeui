import { observer } from 'mobx-react-lite';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import CheckIcon from '@/assets/icons/check.svg';
import CopyIcon from '@/assets/icons/copy.svg';
import EditIcon from '@/assets/icons/edit.svg';
import TrashIcon from '@/assets/icons/trash.svg';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Cell } from '@/components/cell';
import { Confirm } from '@/components/confirm';
import { Dialog } from '@/components/dialog';
import { Dropdown, type Option } from '@/components/dropdown';
import { TabContent, Tabs, useTabs } from '@/components/tabs';
import { Tooltip } from '@/components/tooltip';
import { WidgetEdit } from '../widget-edit';
import type { WidgetAddProps } from './types';
import './styles.css';

export const WidgetAdd = observer(({ widgets, dashboard, cells, controls, isOpened, onClose }: WidgetAddProps) => {
  const { t } = useTranslation();
  const [widgetId, setWidgetId] = useState(Array.from(widgets.keys()).at(0));
  const [isEditing, setIsEditing] = useState<boolean | 'new'>(false);
  const [isConfirmDelete, setIsConfirmDelete] = useState(false);

  const widgetList = useMemo(() => {
    return Array.from(widgets.values()).map((widget) => ({ id: widget.id, label: widget.name }));
  }, [widgets.keys()]);

  const { activeTab, onTabChange } = useTabs({
    defaultTab: widgetId,
    items: widgetList,
    onAfterTabChange: (id) => {
      setWidgetId(id);
    },
  });

  useEffect(() => {
    if (widgetId !== 'new') {
      setIsEditing(false);
    }
  }, [widgetId]);

  const deleteWidget = (() => {
    setWidgetId(Array.from(widgets.keys()).at(0));
    widgets.get(widgetId).delete(widgetId);
    setIsConfirmDelete(false);
  });

  const copyWidget = () => {
    const copiedWidgetId = widgets.get(widgetId).copy();
    setWidgetId(copiedWidgetId);
  };

  const createWidget = () => {
    setIsEditing('new');
  };

  return (
    <>
      <Dialog
        className="widgetAdd"
        isOpened={isOpened}
        heading={t('widget.labels.add')}
        onClose={onClose}
      >
        <div className="widgetAdd-container">
          <aside className="widgetAdd-aside">
            <Button
              className="widgetAdd-createButton"
              label={t('widget.buttons.create-widget')}
              onClick={createWidget}
            />

            <h4 className="widgetAdd-heading">{t('widget.labels.available')}</h4>
            <Tabs
              className="widgetAdd-tabs"
              activeTab={activeTab}
              items={widgetList}
              onTabChange={onTabChange}
            />
            <Dropdown
              value={widgetList.find((widget) => widget.id === widgetId)}
              className="widgetAdd-dropdown"
              placeholder={t('widget.labels.available')}
              options={widgetList.map((widget) => ({ label: widget.label, value: widget.id }))}
              isSearchable
              onChange={(option: Option<string>) => {
                setWidgetId(option.value);
              }}
            />
          </aside>

          <div>

            {Array.from(widgets.values()).map((widget) => (
              <TabContent className="widgetAdd-preview" tabId={widget.id} activeTab={activeTab} key={widget.id}>
                <div className="widgetAdd-previewHeader">
                  <h4 className="widgetAdd-headingPreview">{t('widget.labels.preview')}</h4>
                  <div className="widgetAdd-actions">
                    <Tooltip text={t('widget.buttons.delete')} placement="bottom">
                      <Button
                        variant="secondary"
                        size="small"
                        icon={<TrashIcon />}
                        onClick={() => setIsConfirmDelete(true)}
                      />
                    </Tooltip>
                    <Tooltip text={t('widget.buttons.copy')} placement="bottom">
                      <Button
                        variant="secondary"
                        size="small"
                        icon={<CopyIcon />}
                        onClick={copyWidget}
                      />
                    </Tooltip>
                    <Tooltip text={t('widget.buttons.edit')} placement="bottom">
                      <Button
                        variant="secondary"
                        size="small"
                        icon={<EditIcon />}
                        onClick={() => setIsEditing(!isEditing)}
                      />
                    </Tooltip>
                    <Button
                      label={dashboard.hasWidget(widget.id)
                        ? t('widget.buttons.exists-on-dashboard')
                        : t('widget.buttons.add')}
                      icon={dashboard.hasWidget(widget.id) && <CheckIcon />}
                      size="small"
                      disabled={dashboard.hasWidget(widget.id)}
                      onClick={() => dashboard.addWidget(widget.id)}
                    />
                  </div>
                </div>

                <div className="widgetAdd-content">
                  <Card
                    className="widgetAdd-card"
                    heading={widget.name}
                    key={widget.id}
                    isBodyVisible
                  >
                    {widget.cells.map((cell) => (
                      cells.has(cell.id) && (
                        <Cell
                          cell={cells.get(cell.id)}
                          name={cell.name}
                          key={cell.id}
                          extra={cell.extra}
                        />
                      )
                    ))}
                  </Card>
                </div>

                {!!widget.description && (
                  <div className="widgetAdd-description">{widget.description}</div>
                )}
              </TabContent>
            ))}
          </div>
        </div>
      </Dialog>

      {isEditing && (
        <WidgetEdit
          widget={isEditing === 'new'
            ? { id: '', name: '', description: '', cells: [], compact: false } as any
            : widgets.get(widgetId)}
          cells={cells}
          dashboard={dashboard}
          controls={controls}
          isOpened={!!isEditing}
          onClose={() => {
            setIsEditing(false);
          }}
          onSave={(data) => {
            widgets.get(widgetId).save(data);
            setIsEditing(false);
            setWidgetId(data.id);
          }}
        />
      )}

      {isConfirmDelete && widgets.get(widgetId) && (
        <Confirm
          isOpened={isConfirmDelete}
          heading={t('widget.labels.delete')}
          variant="danger"
          closeCallback={() => setIsConfirmDelete(false)}
          confirmCallback={deleteWidget}
        >
          {!!widgets.get(widgetId).associatedDashboards?.length && (
            <>
              {t('widget.labels.warning')}
              {widgets.get(widgetId).associatedDashboards
                .map((dashboard) => (<li key={dashboard.id}>{dashboard.name}</li>))}
            </>
          )}
          <p>{t('widget.prompt.delete')} <b>{widgets.get(widgetId).name}</b>?</p>
        </Confirm>
      )}
    </>
  );
});
