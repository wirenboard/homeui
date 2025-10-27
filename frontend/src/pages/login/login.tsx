import { observer } from 'mobx-react-lite';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import LocaleIcon from '@/assets/icons/locale.svg';
import LoaderIcon from '@/assets/icons/spinner.svg';
import { APP_NAME, LOGO } from '@/common/constants';
import { Alert } from '@/components/alert';
import { Button } from '@/components/button';
import { Dropdown, Option } from '@/components/dropdown';
import { Input } from '@/components/input';
import { Password } from '@/components/password';
import type { LoginPageProps } from '@/pages/login/types';
import { authStore } from '@/stores/auth';
import './styles.css';

const LoginPage = observer(({ onSuccessLogin, onChangeLocale }: LoginPageProps) => {
  const { t } = useTranslation();
  const { isAutologin } = authStore;
  const [login, setLogin] = useState('');
  const [isShowError, setIsShowError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [language, setLanguage] = useState(localStorage.getItem('language') || 'en');

  const onSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    try {
      setIsShowError(false);
      setIsLoading(true);
      const data = await authStore.login({ login, password });
      onSuccessLogin(data.user_type);
    } catch {
      setIsShowError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const onChangeLanguageHandler = (lang: string) => {
    localStorage.setItem('language', lang);
    onChangeLocale(lang);
    setLanguage(lang);
  };

  const languageOptions: Option<string>[] = [
    { label: 'English', value: 'en' },
    { label: 'Русский', value: 'ru' },
  ];

  return (
    <section className="login">
      <img src={LOGO} className="login-logo" alt={APP_NAME}/>

      <div className="login-title">{t('login.title')}</div>

      <fieldset className="login-wrapper">
        <form className="login-form" onSubmit={onSubmit}>
          <div className="login-fields">

            <label className="login-label" htmlFor="username">
              {t('login.labels.login')}
              <Input
                id="username"
                name="username"
                autoComplete="username"
                value={login}
                required
                autoFocus
                onChange={(val: string) => setLogin(val)}
              />
            </label>

            <label className="login-label" htmlFor="password">
              {t('login.labels.password')}
              <Password
                id="password"
                v-model="data.pass"
                name="pass"
                autoComplete="current-password"
                value={password}
                required
                onChange={(val: string) => setPassword(val)}
              />
            </label>

            {!!isShowError && (
              <Alert variant="danger" withIcon={false}>{t('login.errors.failed')}</Alert>
            )}
          </div>

          <div className="login-actions">
            {isAutologin && (
              <a href="/">
                <Button
                  className="login-button"
                  type="button"
                  label={t('login.buttons.auto-login')}
                />
              </a>
            )}

            <Button
              className="login-button"
              type="submit"
              disabled={isLoading || !login || !password}
              icon={isLoading && <LoaderIcon className="login-loader" />}
              label={t('login.buttons.login')}
            />
          </div>
        </form>
      </fieldset>

      <nav className="login-links">
        <a href="https://wiki.wirenboard.com/wiki/Documentation" target="_blank">{t('login.labels.documentation')}</a>

        <label htmlFor="language" className="login-languageWrapper">
          <LocaleIcon className="login-languageIcon" />
          <Dropdown
            id="language"
            className="login-language"
            options={languageOptions}
            value={language}
            onChange={(option: Option<string>) => onChangeLanguageHandler(option.value)}
          />
        </label>
      </nav>
    </section>
  );
});

export default LoginPage;
