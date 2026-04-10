import { observer } from 'mobx-react-lite';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useMediaQuery } from 'react-responsive';
import { Alert } from '@/components/alert';
import { Button } from '@/components/button';
import { Tree, type TreeItem } from '@/components/tree';
import { PageLayout } from '@/layouts/page';
import { authStore, UserRole } from '@/stores/auth';
import type { ItemStore, GroupStore, DeviceStore, BusStore } from '@/stores/dali';
import { BusTabContent } from './components/bus-tab-content';
import { DeviceTabContent } from './components/device-tab-content';
import { GroupTabContent } from './components/group-tab-content';
import type { DaliPageProps } from './types';
import './styles.css';

const TabContent = ({ store, onRefresh }: { store: ItemStore; onRefresh: () => void }) => {
  if (store.type === 'bus') {
    return <BusTabContent store={store as BusStore} onScan={onRefresh} />;
  }
  if (store.type === 'group') {
    return <GroupTabContent store={store as GroupStore} />;
  }
  if (store.type === 'device') {
    return <DeviceTabContent store={store as DeviceStore} onSave={onRefresh} />;
  }
  return null;
};

const buildTreeItems = (
  items: ItemStore[],
  storeMap: Map<string, ItemStore>,
  t: (key: string, options?: object) => string,
): TreeItem[] =>
  items.map((item) => {
    storeMap.set(item.id, item);
    let label: string | ReactNode = item.label;
    if (item.type === 'group') {
      label = t('dali.labels.group', { name: item.label });
    } else if (item.type === 'device' && item.groups.length) {
      label = <>{item.label} <strong>{item.groups.map((g) => `G${g}`).join(' ')}</strong></>;
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
            {!selectedItem?.isLoading && selectedItem?.error && (
              <Alert variant="danger">{selectedItem.error}</Alert>
            )}
            <TabContent store={selectedItem} onRefresh={refreshData} />
          </section>
        )}
      </div>
    </PageLayout>
  );
});

export default DaliPage;
