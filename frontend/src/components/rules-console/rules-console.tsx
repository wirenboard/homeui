import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMediaQuery } from 'react-responsive';
import BugIcon from '@/assets/icons/bug.svg';
import ClearIcon from '@/assets/icons/clear.svg';
import CloseIcon from '@/assets/icons/close.svg';
import LayoutBottomIcon from '@/assets/icons/layout-bottom.svg';
import LayoutRightIcon from '@/assets/icons/layout-right.svg';
import { Dropdown, Option } from '@/components/dropdown';
import { Tooltip } from '@/components/tooltip';
import type { RulesConsoleProps } from './types';
import './styles.css';

export const RulesConsole = observer(({ toggleConsole, changeConsoleView, rulesStore }: RulesConsoleProps) => {
  const { t } = useTranslation();
  const isMobile = useMediaQuery({ maxWidth: 768 });
  const { isRuleDebugEnabled, logs } = rulesStore;
  const container = useRef<HTMLDivElement>(null);
  const resizer = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(localStorage.getItem('rules-console-position') || 'bottom');
  const positionRef = useRef(position);
  const [height, setHeight] = useState(localStorage.getItem('rules-console-height') || '220px');
  const [width, setWidth] = useState(localStorage.getItem('rules-console-width') || '300px');
  const [isStopAutoScroll, setIsStopAutoScroll] = useState(false);
  const [filter, setFilter] = useState('all');
  const filters: Option[] = [
    { value: 'all', label: t('rules-console.labels.filter-all') },
    { value: 'info', label: 'Info' },
    { value: 'warning', label: 'Warning' },
    { value: 'error', label: 'Error' },
    { value: 'debug', label: 'Debug' },
  ];

  const handleResizerDown = useCallback((ev: PointerEvent) => {
    const target = ev.target as HTMLElement;
    if (resizer.current && target.id === 'resizer') {
      resizer.current.setPointerCapture(ev.pointerId);
    }
  }, [resizer]);

  const handleResizerMove = useCallback((ev: PointerEvent) => {
    if (!resizer.current || !resizer.current.hasPointerCapture(ev.pointerId)) {
      return;
    }

    if (positionRef.current === 'bottom') {
      const maxHeight = window.innerHeight * 0.7;
      const newHeight = container.current.getBoundingClientRect().height - ev.movementY;
      const clampedHeight = Math.min(Math.max(newHeight, 50), maxHeight);
      setHeight(`${clampedHeight}px`);
      localStorage.setItem('rules-console-height', `${clampedHeight}px`);
    } else {
      const maxWidth = 780;
      const newWidth = container.current.getBoundingClientRect().width - ev.movementX;
      const clampedWidth = Math.min(Math.max(newWidth, 50), maxWidth);
      setWidth(`${clampedWidth}px`);
      localStorage.setItem('rules-console-width', `${clampedWidth}px`);
    }
  }, [resizer, container]);

  const changePosition = (pos: 'bottom' | 'right', isWithSave = true) => {
    changeConsoleView(pos);
    setPosition(pos);
    if (isWithSave) {
      localStorage.setItem('rules-console-position', pos);
    }
  };

  const handleScroll = useCallback(() => {
    const { scrollHeight, scrollTop, clientHeight } = content.current;

    const atBottom = scrollHeight - scrollTop - clientHeight < 5;
    setIsStopAutoScroll(!atBottom);
  }, [content.current]);

  useEffect(() => {
    addEventListener('pointerdown', handleResizerDown);
    addEventListener('pointermove', handleResizerMove);

    return () => {
      document.removeEventListener('pointerdown', handleResizerDown, true);
      document.removeEventListener('pointermove', handleResizerMove, true);
    };
  }, []);

  useEffect(() => {
    if (content.current && !isStopAutoScroll) {
      content.current.scrollTo({ top: content.current.scrollHeight });
    }
  }, [isStopAutoScroll, logs.length, content.current]);

  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  useEffect(() => {
    if (isMobile && position === 'right') {
      changePosition('bottom', false);
    } else if (!isMobile && localStorage.getItem('rules-console-position') === 'right') {
      changePosition('right', false);
    }
  }, [isMobile]);

  return (
    <div
      className={classNames('rulesConsole', {
        'rulesConsole-bottom': position === 'bottom',
        'rulesConsole-right': position === 'right',
      })}
      ref={container}
      style={{ height: position === 'bottom' ? height : '100%', width: position === 'right' ? width : '100%' }}
    >
      <div className="rulesConsole-resizer" id="resizer" ref={resizer}></div>
      <div className="rulesConsole-header">
        <div className="rulesConsole-headerActions">
          <div className="rulesConsole-separatorRight">
            <Tooltip text={t('rules-console.buttons.clear')}>
              <button className="rulesConsole-button" onClick={() => rulesStore.clearLogs()}>
                <ClearIcon className="rulesConsole-icon"/>
              </button>
            </Tooltip>
          </div>

          <Tooltip text={t('rules-console.buttons.debug')}>
            <button className="rulesConsole-button" onClick={() => rulesStore.toggleRuleDebugging()}>
              <BugIcon
                className={classNames('rulesConsole-icon', {
                  'rulesConsole-iconActive': isRuleDebugEnabled,
                })}
              />
            </button>
          </Tooltip>

          <Dropdown
            className="rulesConsole-filter"
            options={filters}
            value={filter}
            size="small"
            onChange={({ value }: Option<string>) => setFilter(value)}
          />
        </div>

        <div className="rulesConsole-headerActions rulesConsole-separatorLeft">
          <Tooltip text={t('rules-console.buttons.dock-bottom')}>
            <button className="rulesConsole-button" onClick={() => changePosition('bottom')}>
              <LayoutBottomIcon
                className={classNames('rulesConsole-icon', {
                  'rulesConsole-iconActive': position === 'bottom',
                })}
              />
            </button>
          </Tooltip>

          <Tooltip text={t('rules-console.buttons.dock-right')}>
            <button className="rulesConsole-button" disabled={isMobile} onClick={() => changePosition('right')}>
              <LayoutRightIcon
                className={classNames('rulesConsole-icon', {
                  'rulesConsole-iconActive': position === 'right',
                })}
              />
            </button>
          </Tooltip>

          <Tooltip text={t('rules-console.buttons.close')}>
            <button className="rulesConsole-button rulesConsole-close" onClick={toggleConsole}>
              <CloseIcon className="rulesConsole-icon" />
            </button>
          </Tooltip>
        </div>
      </div>
      <div
        className="rulesConsole-content"
        ref={content}
        onScroll={handleScroll}
      >
        {logs
          .filter((log) => filter === 'all' || filter === log.level)
          .map((log, i) => (
            <div
              className={classNames('rulesConsole-log', {
                'rulesConsole-logWarn': log.level === 'warning',
                'rulesConsole-logError': log.level === 'error',
                'rulesConsole-logDebug': log.level === 'debug',
              })}
              key={i + log.time}
            >
              <div className="rulesConsole-logDate">
                {new Date(log.time).toISOString().slice(0, 19).replace('T', ' ')}
              </div>
              <div>{log.payload}</div>
            </div>
          ))}
      </div>
    </div>
  );
});
