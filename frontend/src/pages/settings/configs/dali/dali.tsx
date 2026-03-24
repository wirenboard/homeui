import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { type CSSProperties, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMediaQuery } from 'react-responsive';
import { Alert } from '@/components/alert';
import { Button } from '@/components/button';
import { FormButtonGroup } from '@/components/form';
import { JsonSchemaEditor } from '@/components/json-schema-editor';
import { Loader } from '@/components/loader';
import { Tree, type TreeItem } from '@/components/tree';
import { PageLayout } from '@/layouts/page';
import { authStore, UserRole } from '@/stores/auth';
import type { ItemStore, GroupStore, DeviceStore, BusStore } from '@/stores/dali';
import type { DaliPageProps } from './types';
import { BusMonitor } from './components/bus-monitor';
import './styles.css';

const MAX_SLOTS = 12;

const GroupTabContent = observer(({ store }: { store: GroupStore }) => {
  const { t, i18n } = useTranslation();
  const params = store.objectStore.params.filter(p => !p.hidden);

  const rows: (typeof params)[] = [];
  let currentRow: typeof params = [];
  let slotsInRow = 0;
  for (const param of params) {
    const gridColumns = param.store.schema.options?.grid_columns ?? MAX_SLOTS + 1;
    if (slotsInRow === 0 || slotsInRow + gridColumns <= MAX_SLOTS) {
      slotsInRow += gridColumns;
      currentRow.push(param);
    } else {
      rows.push(currentRow);
      currentRow = [param];
      slotsInRow = gridColumns;
    }
  }
  if (currentRow.length) {
    rows.push(currentRow);
  }

  return (
    <>
      {rows.map(rowParams => {
        const rowKey = rowParams.map(p => p.key).join('-');
        const items = rowParams.map(param => {
          const gridColumns = param.store.schema.options?.grid_columns;
          const style: CSSProperties = {};
          if (gridColumns) {
            style.flexGrow = 1;
            style.flexBasis = gridColumns === 12 ? '100%' : `${(gridColumns / 12) * 100 - 7}%`;
          }
          return (
            <div key={param.key} className="dali-groupParam" style={style}>
              <div className="dali-groupParam-header">
                <span>{store.translator.find(param.store.schema.title || param.key, i18n.language)}</span>
                <Button
                  label={t('dali.buttons.set')}
                  onClick={async () => {
                    await store.saveParam(param.key);
                  }}
                />
              </div>
              <div className={classNames('dali-groupParam-editor', { 'wb-jsonEditor-objectEditorWithBorder': param.store.storeType === 'object' })}>
                <JsonSchemaEditor
                  store={param.store}
                  translator={store.translator}
                />
              </div>
            </div>
          );
        });
        if (rowParams.length === 1) {
          return items[0];
        }
        return (
          <div key={rowKey} className="wb-jsonEditor-objectEditorRow">
            {items}
          </div>
        );
      })}
    </>
  );
});

const DeviceTabContent = observer(({ store, onSave }: { store: DeviceStore; onSave: () => void }) => {
  const { t } = useTranslation();
  return (
    <>
      <FormButtonGroup>
        <Button
          label={t('dali.buttons.reload')}
          onClick={async () => {
            await store.load(true);
            onSave();
          }}
        />
        <Button
          label={t('common.buttons.save')}
          disabled={!store.objectStore.isDirty || store.objectStore.hasErrors}
          onClick={async () => {
            await store.save();
            onSave();
          }}
        />
      </FormButtonGroup>
      <JsonSchemaEditor
        store={store.objectStore}
        translator={store.translator}
      />
    </>
  );
});

const BusTabContent = observer(({ store, onScan }: { store: BusStore; onScan: () => void }) => {
  const { t } = useTranslation();
  return (
    <>
      <FormButtonGroup>
        <Button
          label={t('dali.buttons.rescan')}
          onClick={async () => {
            await store.scan();
            onScan();
          }}
        />
        <Button
          label={t('common.buttons.save')}
          disabled={!store.objectStore.isDirty || store.objectStore?.hasErrors}
          onClick={async () => {
            await store.save();
          }}
        />
      </FormButtonGroup>
      <JsonSchemaEditor
        store={store.objectStore}
        translator={store.translator}
      />
      {store.busMonitor?.isEnabled && (
        <BusMonitor monitorStore={store.busMonitor} />
      )}
    </>
  );
});

const TabContent = ({ store, onRefresh }: { store: ItemStore; onRefresh: () => void }) => {
  if (!store.objectStore || !store.translator) {
    return null;
  }
  if (store.type === 'group') {
    return <GroupTabContent store={store as GroupStore} />;
  }
  if (store.type === 'device') {
    return <DeviceTabContent store={store as DeviceStore} onSave={onRefresh} />;
  }
  if (store.type === 'bus') {
    return <BusTabContent store={store as BusStore} onScan={onRefresh} />;
  }
  return null;
};

const buildTreeItems = (items: ItemStore[], storeMap: Map<string, ItemStore>, t: (key: string, options?: object) => string): TreeItem[] =>
  items.map(item => {
    storeMap.set(item.id, item);
    let label: string | React.ReactNode = item.label;
    if (item.type === 'group') {
      label = t('dali.labels.group', { name: item.label });
    } else if (item.type === 'device' && item.groups.length) {
      label = <>{item.label} <strong>{item.groups.map(g => `G${g}`).join(' ')}</strong></>;
    }
    const children = 'children' in item ? item.children : [];
    return {
      id: item.id,
      label,
      children: children.length ? buildTreeItems(children, storeMap, t) : undefined,
    };
  });

const DaliPage = observer(({ store }: DaliPageProps) => {
  const { t } = useTranslation();
  const isMobile = useMediaQuery({ maxWidth: 991 });
  const [data, setData] = useState<TreeItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<ItemStore | null>(null);
  const itemStoreMap = useRef<Map<string, ItemStore>>(new Map());

  const refreshData = () => {
    itemStoreMap.current.clear();
    setData(buildTreeItems(store.gateways, itemStoreMap.current, t));
  };

  useEffect(() => {
    const fetchData = async () => {
      await store.load();
      refreshData();
      if (!isMobile) {
        const firstGateway = store.gateways.at(0);
        if (firstGateway) {
          setSelectedItem(firstGateway);
          firstGateway.load();
        }
      }
    };
    fetchData();
  }, []);

  const onItemClick = async (treeItem: TreeItem) => {
    const item = itemStoreMap.current.get(treeItem.id) ?? null;
    setSelectedItem(item);
    if (item) {
      item.load().then(() => refreshData());
    }
  };

  return (
    <PageLayout
      title={t('dali.title')}
      hasRights={authStore.hasRights(UserRole.Admin)}
      isLoading={store.isLoading}
      errors={store.errors}
      actions={
        <>
          {isMobile && selectedItem && (
            <Button label={t('dali.buttons.return')} variant="secondary" onClick={() => setSelectedItem(null)} />
          )}
        </>
      }
      stickyHeader
    >
      <div className="dali">
        {(!isMobile || !selectedItem) && (
          <aside className="dali-list">
            <Tree
              data={data}
              isDisabled={store.isLoading}
              onItemClick={onItemClick}
            />
          </aside>
        )}
        {(!isMobile || selectedItem) && (
          <section className="dali-content">
            {selectedItem?.isLoading
              ? (
                <div className="dali-contentLoader">
                  <Loader />
                </div>
              ) : (
                <>
                  {selectedItem?.error && (
                    <Alert variant="danger">{selectedItem.error}</Alert>
                  )}
                  <TabContent store={selectedItem} onRefresh={refreshData} />
                </>
              )}
          </section>
        )}
      </div>
    </PageLayout>
  );
});

export default DaliPage;
