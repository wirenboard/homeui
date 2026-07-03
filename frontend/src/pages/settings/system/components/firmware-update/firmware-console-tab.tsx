import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import ClearIcon from '@/assets/icons/clear.svg';
import { ConsoleIconButton } from '@/components/console-panel/console-icon-button';
import { ConsoleLogScroller } from '@/components/console-panel/console-log-scroller';
import type { FirmwareUpdateStore } from './store';

export const FirmwareConsoleToolbar = observer(({ store }: { store: FirmwareUpdateStore }) => {
  const { t } = useTranslation();
  return (
    <ConsoleIconButton
      icon={ClearIcon}
      tooltip={t('console-panel.buttons.clear')}
      onClick={() => store.clearLog()}
    />
  );
});

export const FirmwareConsoleContent = observer(({ store }: { store: FirmwareUpdateStore }) => (
  <ConsoleLogScroller scrollKey={store.logRows.length}>
    {store.logRows.map((line, i) => (
      <div className="consolePanel-logPlain" key={i}>
        {line}
      </div>
    ))}
  </ConsoleLogScroller>
));
