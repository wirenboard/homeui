import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/button';
import type { BusCommandsStore } from '@/stores/dali';

interface CommandsToolbarProps {
  store: BusCommandsStore;
}

export const CommandsToolbar = observer(({ store }: CommandsToolbarProps) => {
  const { t } = useTranslation();

  return (
    <div className="dali-busCommands-toolbar">
      <Button
        className="dali-busCommands-catalogButton"
        label={t('dali.buttons.commands')}
        variant="secondary"
        isLoading={store.isCatalogLoading}
        disabled={store.isRunning || store.catalog === null}
        aria-haspopup="dialog"
        aria-expanded={store.isCatalogModalOpen}
        onClick={() => store.openCatalog()}
      />
      <Button
        label={t('dali.buttons.run')}
        isLoading={store.isRunning}
        disabled={!store.hasRunnableCommands || store.isRunning}
        onClick={() => store.run()}
      />
    </div>
  );
});
