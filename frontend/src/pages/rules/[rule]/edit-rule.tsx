import { observer } from 'mobx-react-lite';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/button';
import { CodeEditor } from '@/components/code-editor';
import { Tag } from '@/components/tag';
import { PageLayout } from '@/layouts/page';
import { authStore, UserRole } from '@/stores/auth';
import { getExtensions } from '@/stores/rules/autocomplete';
import { useAsyncAction } from '@/utils/async-action';
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

  const [save, isSaving] = useAsyncAction(async () => {
    const initRuleName = rule.initName;
    if (rule.initName !== rule.name) {
      await rulesStore.checkIsNameUnique(rule.name);
    }
    const savedRuleName = await rulesStore.save(rule);

    if (pathName === 'new') {
      return location.replace(`/#!/rules/edit/${savedRuleName}`);
    } else if (initRuleName !== rule.name) {
      const path = await rulesStore.rename(initRuleName, rule.name);
      return location.replace(`/#!/rules/edit/${path}`);
    }
    setIsEditingTitle(false);
  });

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
          label={t('rules.buttons.save')}
          disabled={!rule.name}
          isLoading={isSaving}
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
