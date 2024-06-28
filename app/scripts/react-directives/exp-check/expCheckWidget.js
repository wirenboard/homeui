import React from 'react';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';

function ResultItem({ item }) {
  const { t } = useTranslation();

  if (item[2] === 'ssh')
    return (
      <li>{item[0]}:{item[1]} &mdash; {t('exp-check.ssh_desc')}</li>
    );
  if (item[2] === 'mqtt')
    return (
      <li>{item[0]}:{item[1]} &mdash; {t('exp-check.mqtt_desc')}</li>
    );
  return (
    <li>{item[0]}:{item[1]} &mdash; {t('exp-check.http_desc')}</li>
  );

}

const ExpStatusWidget = observer(({ store }) => {
  const { t } = useTranslation();

  if (store.result === 'found') {
    return (
      <div className="alert alert-danger" role="alert">
        <h4 className="alert-heading">{t('exp-check.found_title')}</h4>

        <hr />
          <p>{t('exp-check.details_text')}</p>
          <br />
          <ul>
            {store.details.map(item => <ResultItem item={item}/>)}
          </ul>
          <br />
          <p className="mb-0">

              {t('exp-check.found_instructions')}: <a href={t('exp-check.support_url')} style={{textDecoration: "underline", color: 'white'}} target={"_blank"}>
              {t('exp-check.support_url')}
            </a>
          </p>
      </div>
    );
  }
});

function CreateExpCheckWidget({ store }) {
  return <ExpStatusWidget store={store} />;
}

export default CreateExpCheckWidget;
