import isEqual from 'lodash/isEqual';
import { observer } from 'mobx-react-lite';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/button';
import { JsonEditor } from '@/components/json-editor';
import { PageLayout } from '@/layouts/page';
import { authStore, UserRole } from '@/stores/auth';
import { useAsyncAction } from '@/utils/async-action';
import { usePreventLeavePage } from '@/utils/prevent-page-leave';
import { useParseHash } from '@/utils/url';
import { type ConfigPageProps } from './types';

const ConfigPage = observer(({ store, transitions, devicesStore }: ConfigPageProps) => {
  const { t } = useTranslation();
  const { id } = useParseHash();
  const { isDirty, setIsDirty } = usePreventLeavePage(transitions);
  const [errors, setErrors] = useState([]);
  const [isValid, setIsValid] = useState(true);

  const path = useMemo(() => {
    let path = id?.replace(/~2F/g, '/');
    if (!/^\//.test(path)) {
      path = '/' + path;
    }
    return path;
  }, [id]);

  const [loadConfig, isLoading] = useAsyncAction(async () => {
    if (path === store.path && store.config) {
      return;
    } else {
      store.clearConfig();
    }

    return store.getConfig(path).catch((err) => {
      setErrors([{ variant: 'danger', text: `${t('configurations.errors.load')}: ${err.message} ${err.data}` }]);
    });
  });

  useEffect(() => {
    if (id) {
      loadConfig();
    }
  }, [id]);

  const onChange = (content, errors) => {
    if (path !== store.path) {
      return;
    }
    if (!isEqual(JSON.parse(JSON.stringify(store.config?.content)), JSON.parse(JSON.stringify(content)))) {
      setIsDirty(true);
      store.setContent(content);
    }
    setIsValid(!errors.length);
  };

  const [save, isSaving] = useAsyncAction(async () => {
    return store.saveConfig()
      .then(() => {
        setIsDirty(false);
        setErrors([]);
      }).catch(() => {
        setIsDirty(true);
        setErrors([{ variant: 'danger', text: t('configurations.errors.save', { name: store.config?.configPath }) }]);
      });
  });

  return (
    <PageLayout
      title={store.config?.configPath}
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
        schema={store.config?.schema}
        data={store.config?.content}
        cells={Array.from(devicesStore.cells.keys()).filter((t) => !t.startsWith('system__'))}
        onChange={onChange}
      />
    </PageLayout>
  );
});

export default ConfigPage;
