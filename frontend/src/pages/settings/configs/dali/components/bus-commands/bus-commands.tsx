import { observer } from 'mobx-react-lite';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from '@/components/alert';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import type { ListCommandsEntry } from '@/stores/dali/types';
import { CatalogModal } from './catalog-modal';
import { CommandsEditor } from './commands-editor';
import { CommandsResults } from './commands-results';
import { CommandsToolbar } from './commands-toolbar';
import type { BusCommandsProps } from './types';
import './styles.css';

type InsertSnippet = (_template: string) => void;

export const BusCommands = observer(({ store }: BusCommandsProps) => {
  const { t } = useTranslation();
  const [isBodyVisible, setIsBodyVisible] = useState(false);
  const [insertSnippet, setInsertSnippet] = useState<InsertSnippet | null>(null);

  const toggleBody = useCallback(() => {
    setIsBodyVisible((prev) => {
      const next = !prev;
      if (next) {
        store.loadCatalog();
      }
      return next;
    });
  }, [store]);

  const onEditorReady = useCallback((insert: InsertSnippet) => {
    setInsertSnippet(() => insert);
  }, []);

  const onCatalogSelect = useCallback((entry: ListCommandsEntry) => {
    insertSnippet?.(entry.snippet);
    store.closeCatalog();
  }, [insertSnippet, store]);

  return (
    <Card
      className="dali-busCommands"
      variant="tertiary"
      heading={t('dali.labels.commands')}
      isBodyVisible={isBodyVisible}
      toggleBody={toggleBody}
    >
      <CommandsEditor store={store} onEditorReady={onEditorReady} />
      <CommandsToolbar store={store} />
      {store.catalogError && (
        <Alert variant="danger" className="alert-withButton">
          <span>{t('dali.labels.commands-catalog-error')}</span>
          <Button
            label={t('dali.buttons.retry')}
            variant="danger"
            onClick={() => store.loadCatalog()}
          />
        </Alert>
      )}
      {store.runError && (
        <Alert variant="danger">{store.runError}</Alert>
      )}
      {store.truncated && (
        <Alert variant="warn">{t('dali.labels.commands-truncated-warning')}</Alert>
      )}
      <CommandsResults store={store} />
      {store.catalog && (
        <CatalogModal
          isOpen={store.isCatalogModalOpen}
          catalog={store.catalog}
          onClose={() => store.closeCatalog()}
          onSelect={onCatalogSelect}
        />
      )}
    </Card>
  );
});
