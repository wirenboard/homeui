import { format } from 'date-fns';
import { observer } from 'mobx-react-lite';
import { useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import ClearIcon from '@/assets/icons/clear.svg';
import DownloadIcon from '@/assets/icons/download.svg';
import VisibilityOffIcon from '@/assets/icons/visibility-off.svg';
import VisibilityOnIcon from '@/assets/icons/visibility.svg';
import { ConsoleIconButton } from '@/components/console-panel/console-icon-button';
import { ConsoleLogScroller } from '@/components/console-panel/console-log-scroller';
import { Dropdown, type Option } from '@/components/dropdown';
import type { MonitorStore } from '@/stores/dali/monitor-store';
import { frameFilterKey, frameFilterValue } from '@/stores/dali/parse-bus-monitor-frame';
import { parseBusMonitorLine } from '@/stores/dali/parse-bus-monitor-line';
import type { ParsedBusMonitorLine } from '@/stores/dali/types';
import { downloadFile } from '@/utils/download';
import { BusMonitorHeader, BusMonitorRow } from './bus-monitor-row';
import { ConsoleMenu } from './console-menu';
import type { BusMonitorTabProps } from './types';
import './styles.css';

const ADDRESSES = Array.from({ length: 64 }, (_, i) => i);

const FF16_ADDRESS_OPTIONS = ADDRESSES.map((a) => ({ label: `A${a}`, value: frameFilterValue('FF16', a) }));
const FF24_ADDRESS_OPTIONS = ADDRESSES.map((a) => ({ label: `FF24.A${a}`, value: frameFilterValue('FF24', a) }));

const saveLogsToFile = (monitorStore: MonitorStore, label: string) => {
  if (!monitorStore.logs.length) {
    return;
  }
  const file = new Blob([monitorStore.logs.join('\n')], { type: 'text/plain' });
  const safeLabel = label.replace(/[^\w.-]+/g, '_');
  downloadFile(`${safeLabel}-${format(new Date(), 'yyyyMMdd-HHmmss')}.log`, file);
};

/**
 * Own observer component so the filter chips stay in sync with the store: the
 * menu body is rendered by the non-observer ConsoleMenu, so a mobx read inlined
 * there would not be tracked and the selected tag would not appear until the
 * menu is reopened.
 */
const AddressFilter = observer(({ monitorStore }: { monitorStore: MonitorStore }) => {
  const { t } = useTranslation();

  const broadcast = t('dali.labels.monitor-broadcast');
  const options = useMemo<Option[]>(() => [
    {
      label: 'FF16',
      options: [{ label: broadcast, value: frameFilterValue('FF16', 'broadcast') }, ...FF16_ADDRESS_OPTIONS],
    },
    {
      label: 'FF24',
      options: [{ label: `FF24.${broadcast}`, value: frameFilterValue('FF24', 'broadcast') }, ...FF24_ADDRESS_OPTIONS],
    },
  ], [broadcast]);

  return (
    <Dropdown
      className="daliMonitor-logFilter"
      options={options}
      value={monitorStore.filterValues}
      placeholder={t('dali.placeholders.address-filter')}
      size="small"
      menuPortal={false}
      captureMenuScroll={false}
      multiselect
      isSearchable
      isClearable
      onChange={(opts) => monitorStore.setFilterValues(
        (Array.isArray(opts) ? opts : [opts]).map((opt) => String(opt.value)),
      )}
    />
  );
});

export const DaliBusMonitorToolbar = observer(({ monitorStore, getLabel }: BusMonitorTabProps) => {
  const { t } = useTranslation();

  return (
    <>
      <ConsoleIconButton
        icon={monitorStore.isOnPause ? VisibilityOnIcon : VisibilityOffIcon}
        tooltip={t(monitorStore.isOnPause ? 'dali.buttons.resume-log' : 'dali.buttons.pause-log')}
        active={monitorStore.isOnPause}
        onClick={() => monitorStore.toggleLogsReception()}
      />
      <ConsoleIconButton
        icon={ClearIcon}
        tooltip={t('dali.buttons.clear-log')}
        onClick={() => monitorStore.clearLogs()}
      />
      <ConsoleMenu
        renderContent={(close) => (
          <>
            <AddressFilter monitorStore={monitorStore} />
            <ul className="daliMonitor-menuList">
              <li>
                <button
                  type="button"
                  className="daliMonitor-menuItem"
                  onClick={() => {
                    saveLogsToFile(monitorStore, getLabel()); close();
                  }}
                >
                  <DownloadIcon className="consolePanel-icon" />
                  <span>{t('dali.buttons.save-log')}</span>
                </button>
              </li>
            </ul>
          </>
        )}
      />
    </>
  );
});

export const DaliBusMonitorContent = observer(({ monitorStore }: { monitorStore: MonitorStore }) => {
  const { filterValues, logs } = monitorStore;

  // Parse each line once and reuse the result for both filtering and rendering.
  // A line -> frame cache rebuilt every render keeps only the currently-shown
  // lines, so in steady state only the newly-arrived lines are parsed.
  const cacheRef = useRef<Map<string, ParsedBusMonitorLine>>(new Map());
  const prevCache = cacheRef.current;
  const cache = new Map<string, ParsedBusMonitorLine>();
  const frames = logs.map((line) => {
    const frame = cache.get(line) ?? prevCache.get(line) ?? parseBusMonitorLine(line);
    cache.set(line, frame);
    return frame;
  });
  cacheRef.current = cache;

  const visible = filterValues.length
    ? frames.filter((frame) => {
      const key = frameFilterKey(frame);
      return key !== null && filterValues.includes(key);
    })
    : frames;

  return (
    <ConsoleLogScroller scrollKey={visible.length}>
      <BusMonitorHeader />
      {visible.map((frame, i) => <BusMonitorRow key={i} frame={frame} />)}
    </ConsoleLogScroller>
  );
});
