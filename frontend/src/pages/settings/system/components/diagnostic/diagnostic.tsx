import { useEffect, useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Alert } from '@/components/alert';
import { Button, ButtonLink } from '@/components/button';
import { Card } from '@/components/card';
import { Loader } from '@/components/loader';
import { copyToClipboard } from '@/utils/clipboard';
import { request } from '@/utils/request';

export const Diagnostic = ({ className, whenMqttReady, mqttClient, diagnosticProxy }) => {
  const { t } = useTranslation();
  const [isEnabled, setIsEnabled] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [isShowError, setIsShowError] = useState(false);
  const [baseName, setBaseName] = useState('');
  const [href, setHref] = useState('');
  const isCollecting = useRef(false);
  const [label, setLabel] = useState('');
  const [path, setPath] = useState('');

  const startCollectiong = () => {
    setIsEnabled(false);
    setLabel('system.collector.states.collecting');
    diagnosticProxy.diag().then(
      () => {
        isCollecting.current = true;
      },
      () => {
        isCollecting.current = false;
        setLabel('system.collector.errors.checkLogs');
      },
    );
  };

  let fileIsOk = function httpGet(url: string, callback: (_header: string) => void) {
    request.head(url)
      .then((response: any) => {
        callback(response.headers.get('Content-Type'));
      }).catch((err) => {
        callback(err.response.headers.get('Content-Type'));
      });
  };

  let callbackFileIsOk = function callbackFileIsOk(contentType: string) {
    isCollecting.current = false;
    if (contentType === 'application/zip') {
      setIsEnabled(true);
      setLabel('system.collector.buttons.download');
      setHref(`diag/${baseName}`);
    } else {
      setIsVisible(false);
      setIsShowError(true);
    }
  };

  useEffect(() => {
    whenMqttReady()
      .then(() => diagnosticProxy.hasMethod('diag'))
      .then((result: boolean) => result ? diagnosticProxy.status() : '-1')
      .then((payload: string) => {
        if (payload !== '1') {
          setLabel('system.collector.errors.unavailable');
          setIsEnabled(false);
        } else {
          setLabel('system.collector.buttons.collect');
          setIsStarted(true);
        }
        setIsVisible(true);
      });

    mqttClient.addStickySubscription('/wb-diag-collect/artifact', ({ payload }) => {
      if (isCollecting.current && payload) {
        const data = JSON.parse(payload);
        setPath(data['fullname']);
        setBaseName(data['basename']);
        let url = window.location.href;
        url = url.substring(url.indexOf('//') + 2);
        url = url.substring(0, url.indexOf('/'));
        fileIsOk(`${location.protocol}//${url}/diag/${baseName}`, callbackFileIsOk);
      }
    });
  }, []);

  return (
    <Card
      heading={t('system.collector.title')}
      variant="secondary"
      className={className}
    >
      {!isVisible && !isStarted && (
        <Loader caption={t('system.collector.states.checking')} size="small" />
      )}

      {isVisible && (
        <>
          {href ? (
            <ButtonLink
              variant="primary"
              label={t(label)}
              href={href}
              download
            />
          ) : (
            <Button
              type="button"
              variant="secondary"
              label={t(label)}
              disabled={!isEnabled}
              onClick={startCollectiong}
            />
          )}
        </>
      )}

      {isCollecting.current && (
        <Loader />
      )}

      {isShowError && (
        <Alert variant="warn" className="diagnostic-alert" size="small">
          <Trans
            i18nKey="system.collector.errors.unavailableToDownload"
            values={{ path }}
            components={[<b onClick={() => copyToClipboard(path)} />]}
            shouldUnescape
          />
        </Alert>
      )}
    </Card>
  );
};
