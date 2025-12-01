import { observer } from 'mobx-react-lite';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMediaQuery } from 'react-responsive';
import { Button } from '@/components/button';
import { JsonSchemaEditor } from '@/components/json-schema-editor';
import { Loader } from '@/components/loader';
import { Tree } from '@/components/tree';
import { PageLayout } from '@/layouts/page';
import { authStore, UserRole } from '@/stores/auth';
import { Translator } from '@/stores/json-schema-editor';
import type { DaliPageProps } from './types';
import './styles.css';

const DaliPage = observer(({ store }: DaliPageProps) => {
  const { t } = useTranslation();
  const isMobile = useMediaQuery({ maxWidth: 991 });
  const [data, setData] = useState<any>();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>();
  const [errors, setErrors] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        await store.getGateways();
      } catch (error) {
        setErrors((prevErrors) => [
          ...prevErrors,
          { variant:'danger', text: `Failed to fetch gateways: ${error.message}` },
        ]);
        return;
      }

      if (!isMobile) {
        loadData({ type: 'gateway', id: store.gatewayList.at(0)?.id });
      }
    };

    fetchData();
  }, []);

  const treeData = useMemo(() =>
    store.gatewayList
      ?.map((gateway) => ({
        label: gateway.name, id: gateway.id, type: 'gateway', children: gateway.buses
          .map((bus) => ({
            label: bus.name, id: bus.id, type: 'bus', children: bus.devices
              .map((device) => ({
                label: device.name, id: device.id, type: 'device', children: device?.groups
                  .map((groupId) => ({
                    label: t('dali.labels.group', { name: bus.groups.find((item) => item.id === groupId).name }),
                    id: groupId, type: 'group',
                  })),
              })),
          })),
      }))
  , [store.gatewayList]);

  const translator = new Translator();

  const loadData = async (item) => {
    setSelectedItem(item);
    try {
      setIsLoading(true);
      if (item) {
        const methods = {
          gateway: 'getGateway',
          bus: 'getBus',
          device: 'getDevice',
          group: 'getGroup',
        };
        const res = await store[methods[item.type]](item.id);
        setData(res);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const save = async () => {
    const methods = {
      gateway: 'updateGateway',
      bus: 'updateBus',
      device: 'updateDevice',
      group: 'updateGroup',
    };
    await store[methods[selectedItem!.type]](data);
    //   TODO after save logic
  };

  return (
    <PageLayout
      title={t('dali.title')}
      hasRights={authStore.hasRights(UserRole.Admin)}
      isLoading={store.isLoading}
      errors={errors}
      actions={
        <>
          {isMobile && selectedItem && (
            <Button label={t('dali.buttons.return')} variant="secondary" onClick={() => setSelectedItem(null)} />
          )}
          {selectedItem?.type === 'bus' && (
            <Button label={t('dali.buttons.rescan')} variant="secondary" onClick={() => store.scanBus(data?.id)} />
          )}
          <Button label={t('dali.buttons.save')} variant="success" onClick={save} />
        </>
      }
      stickyHeader
    >
      <div className="dali">
        {(!isMobile || !selectedItem) && (
          <aside className="dali-list">
            <Tree
              data={treeData}
              isDisabled={isLoading}
              onItemClick={loadData}
            />
          </aside>
        )}
        {(!isMobile || selectedItem) && (
          <section className="dali-content">
            {isLoading
              ? (
                <div className="dali-contentLoader">
                  <Loader />
                </div>
              ) : (
                <>
                  {data && <JsonSchemaEditor store={data} translator={translator} />}
                </>
              )}
          </section>
        )}
      </div>
    </PageLayout>
  );
});

export default DaliPage;
