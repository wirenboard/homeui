import { observer } from 'mobx-react-lite';
import { useEffect, useState, type ReactNode } from 'react';
import { Trans, useTranslation } from 'react-i18next';
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
import { GatewayTabContent } from './components/gateway-tab-content';
import type { DaliPageProps } from './types';
import './styles.css';

const TabContent = ({
  store,
  onDeviceRemoved,
}: {
  store: ItemStore;
  onDeviceRemoved: (device: DeviceStore) => void;
}) => {
  if (store?.type === 'bus') {
    return <BusTabContent store={store as BusStore} />;
  }
  if (store?.type === 'group') {
    return <GroupTabContent store={store as GroupStore} />;
  }
  if (store?.type === 'device') {
    return (
      <DeviceTabContent
        store={store as DeviceStore}
        onDeviceRemoved={onDeviceRemoved}
      />
    );
  }
  if (store?.type === 'gateway') {
    return <GatewayTabContent store={store} />;
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
  const [selectedItem, setSelectedItem] = useState<ItemStore | null>(null);

  const itemStoreMap = new Map<string, ItemStore>();
  const data = buildTreeItems(store.gateways, itemStoreMap, t);

  useEffect(() => {
    const fetchData = async () => {
      await store.load();
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

  const onItemClick = (treeItem: TreeItem) => {
    const item = itemStoreMap.get(treeItem.id) ?? null;
    setSelectedItem(item);
    item?.load();
  };

  const onDeviceRemoved = (device: DeviceStore) => {
    const parentBus = device.parent;
    if (parentBus) {
      setSelectedItem(parentBus);
      parentBus.load();
    } else {
      setSelectedItem(null);
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
      {!store.isLoading && !store.errors?.length && !store.gateways.length ? (
        <Alert variant="warn">
          <Trans
            i18nKey="dali.labels.no-gateways"
            components={[<a href="#!/serial-config" />]}
          />
        </Alert>
      ) : (
        <div className="dali">
          {(!isMobile || !selectedItem) && (
            <aside className="dali-list">
              <Tree
                data={data}
                isDisabled={store.isLoading}
                onItemClick={onItemClick}
                activeId={selectedItem?.id}
              />
            </aside>
          )}
          {(!isMobile || selectedItem) && (
            <section className="dali-content">
              {!selectedItem?.isLoading && selectedItem?.error && (
                <Alert variant="danger">{selectedItem.error}</Alert>
              )}
              <TabContent
                store={selectedItem}
                onDeviceRemoved={onDeviceRemoved}
              />
            </section>
          )}
        </div>
      )}
    </PageLayout>
  );
});

export default DaliPage;
