import { useCallback, useEffect, useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Alert } from '@/components/alert';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Loader } from '@/components/loader';
import { diagnosticProxy, mqttClient } from '@/services';
import { copyToClipboard } from '@/utils/clipboard';
import { request } from '@/utils/request';
import './styles.css';

export const Diagnostic = ({ className }: { className?: string }) => {
  const { t } = useTranslation();
  const [isEnabled, setIsEnabled] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [isShowError, setIsShowError] = useState(false);
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

  const fileIsOk = (url: string, fileName: string, callback: (_header: string, _fileName: string) => void) => {
    request.head(url)
      .then((response: any) => {
        callback(response.headers.get('Content-Type'), fileName);
      }).catch((err) => {
        callback(err.response.headers.get('Content-Type'), fileName);
      });
  };

  const callbackFileIsOk = useCallback((contentType: string, fileName: string) => {
    isCollecting.current = false;
    if (contentType === 'application/zip') {
      setIsEnabled(true);
      setLabel('system.collector.buttons.download');
      setHref(`/diag/${fileName}`);
    } else {
      setIsVisible(false);
      setIsShowError(true);
    }
  }, []);

  useEffect(() => {
    mqttClient.whenConnected()
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
        let url = location.href;
        url = url.substring(url.indexOf('//') + 2);
        url = url.substring(0, url.indexOf('/'));
        fileIsOk(`${location.protocol}//${url}/diag/${data['basename']}`, data['basename'], callbackFileIsOk);
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
            <a className="button button-m button-primary diagnostic-downloadButton" href={href} download>
              {t(label)}
            </a>
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
