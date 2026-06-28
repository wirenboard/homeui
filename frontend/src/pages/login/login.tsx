import { observer } from 'mobx-react-lite';
import { useState, type SubmitEvent } from 'react';
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

// A reverse-proxied sub-app (e.g. Node-RED at /node-red/) sends the user to the
// login page with an `externalReturn` query param on the real URL (not the hash
// router's, which the SPA clobbers on boot). Such targets live outside this SPA,
// so they need a full-page navigation rather than an in-app route. Only
// same-origin targets are honoured — never a full URL or a protocol-relative
// `//host` — to avoid an open redirect.
const getSafeExternalReturn = (): string | null => {
  const raw = new URLSearchParams(window.location.search).get('externalReturn');
  if (!raw) {
    return null;
  }
  // Resolve against our origin and require it to stay same-origin. A prefix
  // check (reject `//`, `/\`) is not enough: browsers strip tab/newline/CR
  // before parsing a URL, so `/\t/evil.com` collapses to a protocol-relative
  // `//evil.com`. new URL() applies that same normalisation, so a cross-origin
  // target is reliably caught here.
  try {
    const url = new URL(raw, window.location.origin);
    if (url.origin !== window.location.origin) {
      return null;
    }
    return url.pathname + url.search + url.hash;
  } catch {
    return null;
  }
};

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

  const onSubmit = async (ev: SubmitEvent<HTMLFormElement>) => {
    ev.preventDefault();
    try {
      setIsShowError(false);
      setIsLoading(true);
      await authStore.login({ login, password });
      const externalReturn = getSafeExternalReturn();
      if (externalReturn) {
        window.location.assign(externalReturn);
        return;
      }
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
            <a
              className="login-link login-passwordLink"
              href={documentation[i18n.language]?.usersUtility}
              target="_blank"
            >
              {t('login.buttons.forgot-password')}
            </a>
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
        <a
          className="login-link"
          href={documentation[i18n.language]?.main}
          target="_blank"
        >
          {t('login.labels.documentation')}
        </a>

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
