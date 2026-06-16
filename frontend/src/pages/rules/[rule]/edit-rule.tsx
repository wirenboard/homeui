import { observer } from 'mobx-react-lite';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { documentation } from '@/common/links';
import { Button } from '@/components/button';
import { CodeEditor } from '@/components/code-editor';
import { Tag } from '@/components/tag';
import { PageLayout } from '@/layouts/page';
import { authStore, UserRole } from '@/stores/auth';
import { devicesStore } from '@/stores/devices';
import { rulesStore } from '@/stores/rules';
import { getExtensions } from '@/stores/rules/autocomplete';
import { useAsyncAction } from '@/utils/async-action';
import { usePreventLeavePage } from '@/utils/prevent-page-leave';
import './styles.css';

const EditRulePage = observer(() => {
  const { t, i18n } = useTranslation();
  const { rule } = rulesStore;
  const { setIsDirty } = usePreventLeavePage();
  const [isLoading, setIsLoading] = useState(true);
  const [pageLoadError, setPageLoadError] = useState(null);
  const params = useParams();
  const navigate = useNavigate();
  const [isEditingTitle, setIsEditingTitle] = useState(!params.id);

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
    if (!params.id) {
      rulesStore.resetRule();
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    rulesStore.load(params.id)
      .then(() => {
        setIsLoading(false);
      })
      .catch((err) => {
        if (err.data === 'EditorError') {
          setPageLoadError(404);
          setIsLoading(false);
        }
      });
  }, [params.id]);

  const [save, isSaving] = useAsyncAction(async () => {
    const initRuleName = rule.initName;
    if (rule.initName !== rule.name) {
      await rulesStore.checkIsNameUnique(rule.name);
    }
    const savedRuleName = await rulesStore.save(rule);

    setIsDirty(false);
    if (!params.id) {
      return navigate(`/rules/edit/${savedRuleName}`, { replace: true });
    } else if (initRuleName !== rule.name) {
      const path = await rulesStore.rename(initRuleName, rule.name);
      return navigate(`/rules/edit/${path}`, { replace: true });
    }
    setIsEditingTitle(false);
  });

  return (
    <PageLayout
      title={rule.name}
      infoLink={documentation[i18n.language]?.rule}
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
      onTitleEditEnable={() => setIsEditingTitle(!isEditingTitle)}
    >
      <div className="editRule-container">
        <CodeEditor
          text={rule.content}
          errorLines={rule.error?.errorLine ? [rule.error.errorLine] : null}
          autoFocus={!!params.id}
          extensions={getExtensions(devicesStore)}
          onChange={(value) => {
            setIsDirty(true);
            rulesStore.setRule(value);
          }}
          onSave={save}
        />
      </div>
    </PageLayout>
  );
});

export default EditRulePage;
