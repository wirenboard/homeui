import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMediaQuery } from 'react-responsive';
import { Button } from '@/components/button';
import { Loader } from '@/components/loader';
import { Tree } from '@/components/tree';
import { PageLayout } from '@/layouts/page';
import { authStore, UserRole } from '@/stores/auth';
import { Alert } from '@/components/alert';
import type { DaliPageProps } from './types';
import './styles.css';
import { GatewayStore, BusStore, DeviceStore } from '@/stores/dali';

const GatewayItemContent = observer(({store} : {store: GatewayStore}) => {
  return (
    <section className="dali-content">
      {store.isLoading
        ? (
          <div className="dali-contentLoader">
            <Loader />
          </div>
        ) : (
          <>
            {store.error && (
              <Alert variant="danger">{store.error}</Alert>
            )}
          </>
        )}
    </section>
  );
});

const BusItemContent = observer(({store} : {store: BusStore}) => {
  const { t } = useTranslation();
  return (
    <section className="dali-content">
      {store.isLoading
        ? (
          <div className="dali-contentLoader">
            <Loader />
          </div>
        ) : (
          <>
            {store.error && (
              <Alert variant="danger">{store.error}</Alert>
            )}
            <Button label={t('dali.buttons.rescan')} variant="secondary" onClick={() => store.scan()} />
          </>
        )}
    </section>
  );
});

const DeviceItemContent = observer(({store} : {store: DeviceStore}) => {
  return (
    <section className="dali-content">
      {store.isLoading
        ? (
          <div className="dali-contentLoader">
            <Loader />
          </div>
        ) : (
          <>
            {store.error && (
              <Alert variant="danger">{store.error}</Alert>
            )}
          </>
        )}
    </section>
  );
});

const ItemContent = ({store}: {store: GatewayStore | BusStore | DeviceStore}) => {
  if (!store) {
    return null;
  }
  switch (store.type) {
    case 'gateway':
      return <GatewayItemContent store={store as GatewayStore} />;
    case 'bus':
      return <BusItemContent store={store as BusStore} />;
    case 'device':
      return <DeviceItemContent store={store as DeviceStore} />;
    default:
      return null;
  }
}

const DaliPage = observer(({ store }: DaliPageProps) => {
  const { t } = useTranslation();
  const isMobile = useMediaQuery({ maxWidth: 991 });
  const [selectedItem, setSelectedItem] = useState<any>();

  useEffect(() => {
      store.load();
  }, []);

  const onItemClick = async (item) => {
    setSelectedItem(item);
    if (item) {
      item.load();
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
              data={store.gateways}
              isDisabled={store.isLoading}
              onItemClick={onItemClick}
            />
          </aside>
        )}
        {(!isMobile || selectedItem) && ( 
          <ItemContent store={selectedItem} />
        )}
      </div>
    </PageLayout>
  );
});

export default DaliPage;
