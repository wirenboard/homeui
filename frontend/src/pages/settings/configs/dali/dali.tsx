import { observer } from 'mobx-react-lite';
import { useCallback, useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useMediaQuery } from 'react-responsive';
import { Alert } from '@/components/alert';
import { Button } from '@/components/button';
import { FormButtonGroup } from '@/components/form';
import { JsonSchemaEditor } from '@/components/json-schema-editor';
import { Loader } from '@/components/loader';
import { Tree } from '@/components/tree';
import { PageLayout } from '@/layouts/page';
import { Tooltip } from '@/components/tooltip';
import ClearIcon from '@/assets/icons/clear.svg';
import VisibilityOff from '@/assets/icons/visibility-off.svg';
import VisibilityOn from '@/assets/icons/visibility.svg';
import { authStore, UserRole } from '@/stores/auth';
import { type ItemStore, type MonitorStore } from '@/stores/dali';
import type { DaliPageProps } from './types';
import './styles.css';


const BusMonitor = observer(({ monitorStore } : { monitorStore: MonitorStore }) => {
  const { t } = useTranslation();
  const content = useRef<HTMLDivElement>(null);
  const [isStopAutoScroll, setIsStopAutoScroll] = useState(false);

  const handleScroll = useCallback(() => {
    const { scrollHeight, scrollTop, clientHeight } = content.current;

    const atBottom = scrollHeight - scrollTop - clientHeight < 5;
    setIsStopAutoScroll(!atBottom);
  }, [content.current]);


  useEffect(() => {
    if (content.current && !isStopAutoScroll) {
      content.current.scrollTo({ top: content.current.scrollHeight });
    }
  }, [isStopAutoScroll, monitorStore.logs.length, content.current]);

  return (
    <div>
      <div className="dali-busMonitorHeader">
        <Tooltip text={t('dali.buttons.clear-log')}>
          <button className="rulesConsole-button" onClick={() => monitorStore.clearLogs()}>
            <ClearIcon className="rulesConsole-icon"/>
          </button>
        </Tooltip>
        <Tooltip text={t(monitorStore.isOnPause ? 'dali.buttons.resume-log' : 'dali.buttons.pause-log')}>
          <button className="rulesConsole-button" onClick={() => monitorStore.toggleLogsReception()}>
            {monitorStore.isOnPause ? <VisibilityOn className="rulesConsole-icon"/> : <VisibilityOff className="rulesConsole-icon"/>}
          </button>
        </Tooltip>
      </div>
      <div
        className="dali-busMonitorContent"
        ref={content}
        onScroll={handleScroll}
      >
        {monitorStore.logs
          .map((log, i) => (
            <div key={i}>{log}</div>
          ))}
      </div>
    </div>
  );
});



const DaliPage = observer(({ store }: DaliPageProps) => {
  const { t } = useTranslation();
  const isMobile = useMediaQuery({ maxWidth: 991 });
  const [data, setData] = useState<any>();
  const [selectedItem, setSelectedItem] = useState<ItemStore | null>(null);

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

  const onItemClick = async (item: ItemStore | null) => {
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
                        onClick={async () => {
                          await selectedItem.scan();
                          setData(store.gateways);
                        }}
                      />
                    )}
                    {selectedItem?.type === 'device' && (
                      <Button
                        label={t('dali.buttons.reload')}
                        onClick={async () => {
                          await selectedItem.load(true);
                          setData(store.gateways);
                        }}
                      />
                    )}
                    <Button
                      label={t('common.buttons.save')}
                      disabled={!selectedItem?.objectStore?.isDirty}
                      onClick={async () => {
                        await selectedItem.save();
                        setData(store.gateways);
                      }}
                    />
                  </FormButtonGroup>
                  {selectedItem?.objectStore && (
                    <JsonSchemaEditor
                      store={selectedItem.objectStore}
                      translator={selectedItem.translator}
                    />
                  )}
                  {selectedItem?.busMonitor?.isEnabled && (
                    <BusMonitor monitorStore={selectedItem.busMonitor} />
                  )}
                </>
              )}
          </section>
        )}
      </div>
    </PageLayout>
  );
});

export default DaliPage;
