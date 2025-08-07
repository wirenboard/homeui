import { observer } from 'mobx-react-lite';
import { useRef, useEffect } from 'react';
import FocusLock from 'react-focus-lock';
import { useTranslation } from 'react-i18next';
import { ErrorBar, Button } from '../common';
import { PageWrapper, PageTitle, PageBody } from '../components/page-wrapper/pageWrapper';
import { MakeFormFields } from '../forms/forms';

const LoginPage = observer(({ store }) => {
  const { t } = useTranslation();
  const ref = useRef(null);
  useEffect(() => {
    if (store.error) {
      ref.current?.focus();
    }
  });

  const onSubmit = (e) => {
    e.preventDefault();
    store.postLogin();
  };

  return (
    <PageWrapper className="login-page" error={store.error}>
      <PageTitle title={t('login.title')}/>
      <PageBody loading={store.loading}>
        <FocusLock>
          <div style={{ display: 'flex', alignItems: 'center', maxWidth: '300px', margin: '0 auto' }}>
            <form style={{ width: '100%' }} onSubmit={onSubmit}>
              {MakeFormFields(Object.entries(store.formStore.params || {}), ref)}
              <div className="pull-right" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Button
                  label={t('login.buttons.login')}
                  type="success"
                  submit={true}
                />
                {store.cancelCallback && (
                  <Button
                    label={t('modal.labels.cancel')}
                    type="secondary"
                    onClick={store.cancelCallback}
                  />)}
              </div>
            </form>
          </div>
        </FocusLock>
      </PageBody>
    </PageWrapper>
  );
});

function CreateLoginPage({ store }) {
  return <LoginPage store={store} />;
}

export default CreateLoginPage;
