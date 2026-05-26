import { observer } from 'mobx-react-lite';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import LocaleIcon from '@/assets/icons/locale.svg';
import LoaderIcon from '@/assets/icons/spinner.svg';
import { APP_NAME, LOGO } from '@/common/constants';
import { documentation } from '@/common/links';
import { Alert } from '@/components/alert';
import { Button, ButtonLink } from '@/components/button';
import { Dropdown, type Option } from '@/components/dropdown';
import { Input } from '@/components/input';
import { Password } from '@/components/password';
import { authStore } from '@/stores/auth';
import './styles.css';

const LoginPage = observer(() => {
  const { t, i18n } = useTranslation();
  const { isAutologin } = authStore;
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
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
      await authStore.login({ login, password });
      navigate(searchParams.get('returnState') ?? '/', { replace: true });
    } catch {
      setIsShowError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const onChangeLanguageHandler = async (lang: string) => {
    localStorage.setItem('language', lang);
    await i18n.changeLanguage(lang);
    setLanguage(lang);
  };

  const languageOptions: Option<string>[] = [
    { label: 'English', value: 'en' },
    { label: 'Русский', value: 'ru' },
  ];

  return (
    <section className="login">
      <img src={LOGO} className="login-logo" alt={APP_NAME}/>

      <h1
        className="login-title"
        aria-label={t('login.labels.authorization-title')}
        tabIndex={-1}
      >{t('login.title')}
      </h1>

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
                ariaLabel={t('login.labels.password')}
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
              <ButtonLink
                to="/"
                className="login-button"
                type="button"
                label={t('login.buttons.auto-login')}
              />
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
        <a href={documentation[i18n.language]?.main} target="_blank">{t('login.labels.documentation')}</a>

        <label htmlFor="language" className="login-languageWrapper">
          <LocaleIcon className="login-languageIcon" />
          <Dropdown
            id="language"
            ariaLabel={t('login.buttons.choose-language')}
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
