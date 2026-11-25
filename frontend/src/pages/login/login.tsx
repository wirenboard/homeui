import { observer } from 'mobx-react-lite';
import { useEffect, useState, type SubmitEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import KeyIcon from '@/assets/icons/key.svg';
import LocaleIcon from '@/assets/icons/locale.svg';
import LoaderIcon from '@/assets/icons/spinner.svg';
import { APP_NAME, LOGO } from '@/common/constants';
import { documentation } from '@/common/links';
import { Alert } from '@/components/alert';
import { Button, ButtonLink } from '@/components/button';
import { Dropdown, type Option } from '@/components/dropdown';
import { Input } from '@/components/input';
import { Password } from '@/components/password';
import { Tooltip } from '@/components/tooltip';
import { canUseWebAuthn, classifyWebAuthnError, getWebAuthnConfig } from '@/services/webauthn';
import { authStore } from '@/stores/auth';
import type { LoginAction } from './types';
import './styles.css';

// Origin-checked full-page return target — prevents an open redirect.
const getSafeExternalReturn = (): string | null => {
  const raw = new URLSearchParams(window.location.search).get('externalReturn');
  if (!raw) {
    return null;
  }
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<LoginAction | null>(null);
  const [password, setPassword] = useState('');
  const [language, setLanguage] = useState(localStorage.getItem('language') || 'en');
  const [isPasskeyLoginAvailable, setIsPasskeyLoginAvailable] = useState(false);

  useEffect(() => {
    if (!canUseWebAuthn()) {
      return;
    }
    getWebAuthnConfig()
      .then((config) => setIsPasskeyLoginAvailable(config.enabled && config.has_credentials))
      .catch(() => {});
  }, []);

  const finishLogin = async (
    action: LoginAction, authenticate: () => Promise<unknown>,
  ) => {
    try {
      setErrorMessage(null);
      setLoadingAction(action);
      await authenticate();
      const externalReturn = getSafeExternalReturn();
      if (externalReturn) {
        window.location.assign(externalReturn);
        return;
      }
      navigate(searchParams.get('returnState') ?? '/', { replace: true });
    } catch (err) {
      if (action === 'passkey') {
        switch (classifyWebAuthnError(err)) {
          case 'cancelled':
            setErrorMessage(t('login.errors.passkey-cancelled'));
            break;
          case 'unsupported-origin':
            setErrorMessage(t('login.errors.passkey-unsupported-origin'));
            break;
          case 'unknown-credential':
            setErrorMessage(t('login.errors.passkey-unknown-credential'));
            break;
          default:
            setErrorMessage(t('login.errors.passkey-failed'));
        }
      } else {
        setErrorMessage(t('login.errors.failed'));
      }
    } finally {
      setLoadingAction(null);
    }
  };

  const onSubmit = async (ev: SubmitEvent<HTMLFormElement>) => {
    ev.preventDefault();
    await finishLogin('password', () => authStore.login({ login, password }));
  };

  const onChangeLanguageHandler = async (lang: string) => {
    localStorage.setItem('language', lang);
    await i18n.changeLanguage(lang);
    setLanguage(lang);
  };

  const onPasskeyLogin = async () => {
    await finishLogin('passkey', () => authStore.loginWithPasskey());
  };

  const languageOptions: Option<string>[] = [
    { label: 'English', value: 'en' },
    { label: 'Русский', value: 'ru' },
  ];

  const isPasswordLoading = loadingAction === 'password';
  const isPasskeyLoading = loadingAction === 'passkey';
  const isAnyLoading = loadingAction !== null;

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

            {!!errorMessage && (
              <Alert variant="danger" withIcon={false}>{errorMessage}</Alert>
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

            {isPasskeyLoginAvailable && (
              <Tooltip text={t('login.buttons.passkey')}>
                <Button
                  className="login-passkeyButton"
                  type="button"
                  variant="secondary"
                  aria-label={t('login.buttons.passkey')}
                  disabled={isAnyLoading}
                  isLoading={isPasskeyLoading}
                  icon={<KeyIcon />}
                  onClick={onPasskeyLogin}
                />
              </Tooltip>
            )}

            <Button
              className="login-button"
              type="submit"
              disabled={isAnyLoading || !login || !password}
              icon={isPasswordLoading && <LoaderIcon className="login-loader" />}
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
