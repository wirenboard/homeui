import { javascript } from '@codemirror/lang-javascript';
import { observer } from 'mobx-react-lite';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/button';
import { CodeEditor } from '@/components/code-editor';
import { PageLayout } from '@/layouts/page';
import { notificationsStore } from '@/stores/notifications';
import { RulesStore } from '@/stores/rules';
import { getPathname } from '@/utils/url';
import './styles.css';

const EditRulePage = observer(({ rulesStore, hasRights }: { rulesStore: RulesStore; hasRights: boolean }) => {
  const { t } = useTranslation();
  const { rule } = rulesStore;
  const [isLoading, setIsLoading] = useState(true);
  const [pageLoadError, setPageLoadError] = useState(null);
  const pathName = getPathname();

  const errors = useMemo(() => {
    if (pageLoadError) {
      return [{ code: 404 }];
    } else if (rule.error) {
      return [{ variant: 'danger', text: rule.error.message }];
    } else {
      return [];
    }
  }, [pageLoadError, rule.error]);

  useEffect(() => {
    if (pathName === 'new') {
      setIsLoading(false);
      return;
    }
    rulesStore.load(pathName)
      .then(() => {
        setIsLoading(false);
      })
      .catch((err) => {
        if (err.data === 'EditorError') {
          setPageLoadError(404);
          setIsLoading(false);
        }
      });
  }, []);

  const save = async () => {
    if (rule.name) {
      setIsLoading(true);
      try {
        const savedRuleName = await rulesStore.save(rule);
        const isWithErrors = !!rule.error?.message;
        notificationsStore.showNotification({
          variant: isWithErrors ? 'warn' : 'success',
          text: isWithErrors ? t('rules.labels.success-errors') : t('rules.labels.success'),
        });

        if (pathName === 'new') {
          return location.replace('/#!/rules/edit/' + savedRuleName);
        } else if (rule.initName !== savedRuleName) {
          await rulesStore.deleteRule(rule.initName);
          return location.replace('/#!/rules/edit/' + savedRuleName);
        }
      } catch (err) {
        let message = err.message;
        if (err.data === 'MqttConnectionError') {
          message = t('rules.errors.mqtt-connection');
        } else if (err.message === 'file-exists') {
          message = t('rules.errors.exists');
        }
        notificationsStore.showNotification({ variant: 'danger', text: message });
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <PageLayout
      title={rule.name}
      hasRights={hasRights}
      isLoading={isLoading}
      isEditingTitle={pathName === 'new'}
      editingTitlePlaceholder={t('rules.labels.title-placeholder')}
      errors={errors}
      actions={
        <Button
          variant="success"
          label={t('rules.buttons.save')}
          disabled={!rule.name}
          onClick={save}
        />
      }
      stickyHeader
      onTitleChange={(title) => rulesStore.setRuleName(title)}
    >
      {!isLoading && (
        <div className="editRule-container" style={{ display: isLoading ? 'none' : 'block' }}>
          <CodeEditor
            text={rule.content}
            errorLines={rule.error?.errorLine ? [rule.error.errorLine] : null}
            autoFocus={pathName !== 'new'}
            extensions={[javascript({ jsx: false })]}
            onChange={(value) => rulesStore.setRule(value)}
            onSave={save}
          />
        </div>
      )}
    </PageLayout>
  );
});

export default EditRulePage;
