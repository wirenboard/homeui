import isEqual from 'lodash/isEqual';
import { observer } from 'mobx-react-lite';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { documentation } from '@/common/links';
import { Button } from '@/components/button';
import { JsonEditor } from '@/components/json-editor';
import { PageLayout } from '@/layouts/page';
import { authStore, UserRole } from '@/stores/auth';
import { configsStore } from '@/stores/configs';
import { devicesStore } from '@/stores/devices';
import { useAsyncAction } from '@/utils/async-action';
import { usePreventLeavePage } from '@/utils/prevent-page-leave';

const ConfigPage = observer(() => {
  const { t, i18n } = useTranslation();
  const params = useParams();
  const { isDirty, setIsDirty } = usePreventLeavePage();
  const [errors, setErrors] = useState([]);
  const [title, setTitle] = useState();
  const [isValid, setIsValid] = useState(true);

  const path = useMemo(() => {
    let path = params.id?.replace(/~2F/g, '/');
    if (!/^\//.test(path)) {
      path = '/' + path;
    }
    return path;
  }, [params.id]);

  const [loadConfig, isLoading] = useAsyncAction(async () => {
    return configsStore.getConfig(path).catch((err) => {
      setErrors([{ variant: 'danger', text: `${t('configurations.errors.load')}: ${err.message} ${err.data}` }]);
    });
  });

  useEffect(() => {
    if (params.id) {
      loadConfig();
    }

    return () => {
      configsStore.clearConfig();
    };
  }, [params.id]);

  useEffect(() => {
    if (!isLoading && document.querySelector('h3 label')) {
      setTitle(document.querySelector('h3 label')?.textContent as any);
      document.querySelector('h3 label')?.classList.add('sr-only');
    }
  }, [isLoading]);

  const onChange = (content, errors) => {
    if (path !== configsStore.path || !configsStore.config?.content) {
      return;
    }
    if (!isEqual(JSON.parse(JSON.stringify(configsStore.config?.content)), JSON.parse(JSON.stringify(content)))) {
      setIsDirty(true);
      configsStore.setContent(content);
    }
    setIsValid(!errors.length);
  };

  const [save, isSaving] = useAsyncAction(async () => {
    return configsStore.saveConfig()
      .then(() => {
        setIsDirty(false);
        setErrors([]);
      }).catch(() => {
        setIsDirty(true);
        setErrors([{
          variant: 'danger',
          text: t('configurations.errors.save', { name: configsStore.config?.configPath }),
        }]);
      });
  });

  return (
    <PageLayout
      title={title || configsStore.config?.configPath}
      infoLink={documentation[i18n.language]?.[configsStore?.config?.configPath]}
      hasRights={authStore.hasRights(UserRole.Admin)}
      isLoading={isLoading}
      errors={errors}
      actions={
        <Button
          label={t('configurations.buttons.save')}
          disabled={!isDirty || !isValid}
          isLoading={isSaving}
          onClick={save}
        />
      }
    >
      <JsonEditor
        schema={configsStore.config?.schema}
        data={configsStore.config?.content}
        cells={devicesStore.topicsWithoutSystem}
        onChange={onChange}
      />
    </PageLayout>
  );
});

export default ConfigPage;
