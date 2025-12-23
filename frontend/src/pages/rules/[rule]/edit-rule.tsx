import { observer } from 'mobx-react-lite';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/button';
import { CodeEditor } from '@/components/code-editor';
import { Tag } from '@/components/tag';
import { PageLayout } from '@/layouts/page';
import { authStore, UserRole } from '@/stores/auth';
import { notificationsStore } from '@/stores/notifications';
import { getExtensions } from '@/stores/rules/autocomplete';
import { getPathname } from '@/utils/url';
import type { RulePageProps } from './types';
import './styles.css';

const EditRulePage = observer(({ rulesStore, devicesStore }: RulePageProps) => {
  const { t } = useTranslation();
  const { rule } = rulesStore;
  const [isLoading, setIsLoading] = useState(true);
  const [pageLoadError, setPageLoadError] = useState(null);
  const pathName = getPathname();
  const [isEditingTitle, setIsEditingTitle] = useState(pathName === 'new');

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
      rulesStore.resetRule();
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
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
    try {
      const initRuleName = rule.initName;
      if (rule.initName !== rule.name) {
        await rulesStore.checkIsNameUnique(rule.name);
      }
      const savedRuleName = await rulesStore.save(rule);
      const isWithErrors = !!rule.error?.message;
      notificationsStore.showNotification({
        variant: isWithErrors ? 'warn' : 'success',
        text: isWithErrors ? t('rules.labels.success-errors') : t('rules.labels.success'),
      });

      if (pathName === 'new') {
        return location.replace(`/#!/rules/edit/${savedRuleName}`);
      } else if (initRuleName !== rule.name) {
        const path = await rulesStore.rename(initRuleName, rule.name);
        return location.replace(`/#!/rules/edit/${path}`);
      }
      setIsEditingTitle(false);
    } catch (err) {
      let message = err.message;
      if (err.data === 'MqttConnectionError') {
        message = t('rules.errors.mqtt-connection');
      } else if (err.message === 'file-exists') {
        message = t('rules.errors.exists');
      }
      notificationsStore.showNotification({ variant: 'danger', text: message });
    }
  };

  return (
    <PageLayout
      title={rule.name}
      hasRights={authStore.hasRights(UserRole.Admin)}
      isLoading={isLoading}
      isEditingTitle={isEditingTitle}
      editingTitlePlaceholder={t('rules.labels.title-placeholder')}
      errors={errors}
      titleArea={!rule.enabled && <Tag variant="gray">{t('rules.labels.inactive')}</Tag>}
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
      onTitleEditEnable={() => setIsEditingTitle(true)}
    >
      <div className="editRule-container">
        <CodeEditor
          text={rule.content}
          errorLines={rule.error?.errorLine ? [rule.error.errorLine] : null}
          autoFocus={pathName !== 'new'}
          extensions={getExtensions(devicesStore)}
          onChange={(value) => rulesStore.setRule(value)}
          onSave={save}
        />
      </div>
    </PageLayout>
  );
});

export default EditRulePage;
