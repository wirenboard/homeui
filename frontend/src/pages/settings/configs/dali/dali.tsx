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
import { FormButtonGroup } from '@/components/form';
import type { DaliPageProps } from './types';
import './styles.css';

const DaliPage = observer(({ store }: DaliPageProps) => {
  const { t } = useTranslation();
  const isMobile = useMediaQuery({ maxWidth: 991 });
  const [data, setData] = useState<any>();
  const [selectedItem, setSelectedItem] = useState<any>();

  useEffect(() => {
      const fetchData = async () => {
        await store.load();
          setData(store.gateways);
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
                  <FormButtonGroup>
                    {selectedItem?.type === 'bus' && (
                      <Button 
                        label={t('dali.buttons.rescan')} 
                        variant="success" 
                        disabled={selectedItem?.scanInProgress}
                        onClick={async () => {
                          await selectedItem.scan();
                          setData(store.gateways);
                        }} 
                      />
                    )}
                  </FormButtonGroup>
                </>
              )}
          </section>
        )}
      </div>
    </PageLayout>
  );
});

export default DaliPage;
