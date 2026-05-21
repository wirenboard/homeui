import classNames from 'classnames';
import { format } from 'date-fns';
import { observer } from 'mobx-react-lite';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import InfiniteScroll from 'react-infinite-scroll-component';
import DownloadIcon from '@/assets/icons/download.svg';
import { Button } from '@/components/button';
import { Tooltip } from '@/components/tooltip';
import { PageLayout } from '@/layouts/page';
import { authStore, UserRole } from '@/stores/auth';
import { LogLevel, type LogsStore, type Log } from '@/stores/logs';
import { downloadFile } from '@/utils/download';
import { LogsFilters } from './components/filters';
import './styles.css';

const LogsPage = observer(({ store }: { store: LogsStore }) => {
  const { t } = useTranslation();
  const [filter, setFilter] = useState({
    levels: null,
    boot: null,
    service: null,
    time: null,
    regex: false,
    pattern: '',
    'case-sensitive': true,
  });
  const [hasMore, setHasMore] = useState(true);
  const [errors, setErrors] = useState([]);
  const [liveUpdate, setLiveUpdate] = useState(false);
  const fetchLogsRef = useRef<(direction?: 'forward' | 'backward') => void>(null);
  const [showLoading, setShowLoading] = useState(false);

  useEffect(() => {
    if (!store.isLoading) {
      setShowLoading(false);
      return;
    }
    const timeout = setTimeout(() => setShowLoading(true), 1000);
    return () => clearTimeout(timeout);
  }, [store.isLoading]);

  useEffect(() => {
    store.loadServicesAndBoots().catch(() => {
      setErrors([{ variant: 'danger', text: t('logs.errors.services') }]);
    });
  }, []);

  useEffect(() => {
    let stale = false;
    store.loadLogs(filter, true).then((isThereMoreLogs) => {
      if (stale) return;
      setErrors([]);
      setHasMore(isThereMoreLogs);
      if (filter.time) {
        const container = document.getElementById('logs-container');

        requestAnimationFrame(() => {
          container.scrollTop = -(container.clientHeight / 2);
        });
      }
    }).catch(() => {
      if (stale) return;
      setErrors([{ variant: 'danger', text: t('logs.errors.unavailable') }]);
    });
    return () => {
      stale = true;
    };
  }, [filter]);

  const fetchLogs = useCallback((direction: 'forward' | 'backward' = 'backward') => {
    const container = document.getElementById('logs-container');
    const oldScrollTop = direction === 'forward'
      ? document.querySelector('.infinite-scroll-component').clientHeight
      : container.scrollTop;
    const id = direction === 'forward' ? store.logs.at(-1)?.cursor : store.logs.at(0)?.cursor;

    const logsCountBefore = store.logs.length;
    store.loadLogs({ ...filter, cursor: { direction, id } })
      .then((isThereMoreLogs) => {
        setErrors([]);
        if (direction === 'backward') {
          setHasMore(isThereMoreLogs);
        }
        const hasNewLogs = store.logs.length > logsCountBefore && store.logs.at(-1)?.msg !== undefined;
        requestAnimationFrame(() => {
          if (liveUpdate && direction === 'forward') {
            if (hasNewLogs) {
              // -1 instead of 0 so smooth scroll always has distance to animate
              container.scrollTo({ top: -1, behavior: 'smooth' });
            }
          } else {
            container.scrollTop = direction === 'forward'
              ? oldScrollTop - document.querySelector('.infinite-scroll-component').clientHeight
              : oldScrollTop;
          }
        });
      }).catch(() => {
        setErrors([{ variant: 'danger', text: t('logs.errors.unavailable') }]);
      });
  }, [filter, liveUpdate]);

  fetchLogsRef.current = fetchLogs;

  useEffect(() => {
    if (!liveUpdate) return;
    const intervalId = setInterval(() => {
      if (!store.isLoading && store.logs.length) {
        fetchLogsRef.current?.('forward');
      }
    }, 5000);
    return () => clearInterval(intervalId);
  }, [liveUpdate]);

  const downloadLogs = () => {
    const getDate = (time: number) => new Date(time).toISOString();

    const formatLogRow = (log: Log, service: string) => (
      `${getDate(log.time)} [${service?.split('.')[0] || log.service}] ${log.msg}`
    );

    const makeLogHeader = () => {
      const service = filter.service || 'All services';
      let header = `(${service}) (${getDate(store.logs[0].time)} - ${getDate(store.logs.at(-1).time)})`;
      if (filter.pattern) {
        if (filter.regex) {
          header += `, regular expression "${filter.pattern}"`;
        } else {
          header += `, pattern "${filter.pattern}"`;
        }
        if (filter['case-sensitive']) {
          header += ', match case';
        }
      }
      return header + '\n\n';
    };

    const file = new Blob(
      [makeLogHeader(), store.logs.filter((log) => log?.msg).map((l) => formatLogRow(l, filter.service)).join('\n')],
      { type: 'text/txt' },
    );
    const fileName = `${format(store.logs[0].time, 'yyyyMMdd')}T${format(store.logs[0].time, 'HHmmss')}`;
    downloadFile(`${filter.service?.split('.')[0] || 'log'}_${fileName}.log`, file);
  };

  return (
    <PageLayout
      title={t('logs.title')}
      hasRights={authStore.hasRights(UserRole.Operator)}
      errors={errors}
      actions={
        <Tooltip text={t('logs.buttons.save')} placement="bottom">
          <Button
            variant="secondary"
            icon={<DownloadIcon />}
            disabled={!store.logs.length}
            onClick={downloadLogs}
          />
        </Tooltip>
      }
      stickyHeader
    >
      {!errors.length && (
        <LogsFilters
          store={store}
          filter={filter}
          liveUpdate={liveUpdate}
          onLiveUpdateChange={setLiveUpdate}
          onFilterChange={(value) => {
            setHasMore(true);
            setFilter(value);
          }}
        />
      )}
      <div
        className={classNames('logs-container', {
          'logs-loading': showLoading,
        })}
        id="logs-container"
        onWheel={() => {
          if (liveUpdate) {
            setLiveUpdate(false);
          }
        }}
        onTouchMove={() => {
          if (liveUpdate) {
            setLiveUpdate(false);
          }
        }}
      >
        <InfiniteScroll
          dataLength={store.logs.length}
          next={fetchLogs}
          loader=""
          style={{ display: 'flex', flexDirection: 'column-reverse' }}
          scrollableTarget="logs-container"
          endMessage={store.logs.length ? '' : t('logs.labels.no-logs-with-filter')}
          hasMore={hasMore}
          initialScrollY={332}
          inverse
          onScroll={(ev: MouseEvent) => {
            if (!liveUpdate && (ev.target as HTMLDivElement).scrollTop >= 0) {
              fetchLogs('forward');
            }
          }}
        >
          <div className="logs-grid">
            {store.logs.map((log, i) => (
              <div
                className={classNames('logs-item', {
                  'logs-itemWarn': log.level === LogLevel.Warning,
                  'logs-itemError': log.level === LogLevel.Error,
                  'logs-itemDebug': log.level === LogLevel.Debug,
                })}
                key={log.time.toString() + i}
              >
                <div className="logs-itemInfo logs-cell">
                  <div className="logs-itemDate">{format(log.time, 'dd-MM-yyyy HH:mm:ss.SSS')}</div>
                  <div className="logs-itemService">{log.service ? `[${log.service}]` : ''}</div>
                </div>
                <div className="logs-itemText logs-cell">{log.msg}</div>
              </div>
            ))}
          </div>
        </InfiniteScroll>
      </div>
    </PageLayout>
  );
});

export default LogsPage;
