import classNames from 'classnames';
import { format } from 'date-fns';
import { observer } from 'mobx-react-lite';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import InfiniteScroll from 'react-infinite-scroll-component';
import DownloadIcon from '@/assets/icons/download.svg';
import { Button } from '@/components/button';
import { Tooltip } from '@/components/tooltip';
import { PageLayout } from '@/layouts/page';
import { LogsFilters } from '@/pages/logs/filters';
import { LogsStore, LogLevel, Log } from '@/stores/logs';
import { downloadFile } from '@/utils/download';
import './styles.css';

const LogsPage = observer(({ store, hasRights }: { store: LogsStore; hasRights: boolean }) => {
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

  useEffect(() => {
    store.loadServicesAndBoots().catch(() => {
      setErrors([{ variant: 'danger', text: t('logs.errors.services') }]);
    });
  }, []);

  useEffect(() => {
    store.loadLogs(filter, true).then((isThereMoreLogs) => {
      setHasMore(isThereMoreLogs);
      if (filter.time) {
        const container = document.getElementById('logs-container');

        requestAnimationFrame(() => {
          container.scrollTop = -(container.clientHeight / 2);
        });
      }
    }).catch(() => {
      setErrors([{ variant: 'danger', text: t('logs.errors.unavailable') }]);
    });
  }, [filter]);

  const fetchLogs = useCallback((direction: 'forward' | 'backward' = 'backward') => {
    const container = document.getElementById('logs-container');
    const oldScrollTop = direction === 'forward'
      ? document.querySelector('.infinite-scroll-component').clientHeight
      : container.scrollTop;
    const id = direction === 'forward' ? store.logs.at(-1)?.cursor : store.logs.at(0)?.cursor;

    store.loadLogs({ ...filter, cursor: { direction, id } })
      .then((isThereMoreLogs) => {
        if (direction === 'backward') {
          setHasMore(isThereMoreLogs);
        }
        requestAnimationFrame(() => {
          container.scrollTop = direction === 'forward'
            ? oldScrollTop - document.querySelector('.infinite-scroll-component').clientHeight
            : oldScrollTop;
        });
      }).catch(() => {
        setErrors([{ variant: 'danger', text: t('logs.errors.unavailable') }]);
      });
  }, [filter]);

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
      { type: 'text/txt' }
    );
    const fileName = `${format(store.logs[0].time, 'yyyyMMdd')}T${format(store.logs[0].time, 'HHmmss')}`;
    downloadFile(`${filter.service?.split('.')[0] || 'log'}_${fileName}.log`, file);
  };

  return (
    <PageLayout
      title={t('logs.title')}
      hasRights={hasRights}
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
        <div className="logs-filters">
          <LogsFilters
            store={store}
            filter={filter}
            onFilterChange={(value) => {
              setHasMore(true);
              setFilter(value);
            }}
          />
        </div>
      )}

      <div
        className="logs-container"
        id="logs-container"
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
            if ((ev.target as HTMLDivElement).scrollTop >= 0) {
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
