import React from 'react';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';

const ExpStatusWidget = observer(({ store }) => {
  const { t } = useTranslation();

  if (store.result === 'found') {
    return (
      <div className="alert alert-danger" role="alert">
        <h4 className="alert-heading">{t('exp_check.found_title')}</h4>
        <p>{t('exp_check.details_text')}</p>
        <hr />
        <p className="mb-0">{t('exp_found.found_instructions')}</p>
          <br />
          <ul>
          {store.details.map(item => <li>{item[0]}:{item[1]} ({item[2]})</li>)}
          </ul>
      </div>
    );
  } else {
      return (
          <div style={{ backgroundColor: "lightgreen" }}>
              <span>all clear</span>
              {store.result}
          </div>
      )
  }
});

function CreateExpCheckWidget({ store }) {
  return <ExpStatusWidget store={store} />;
}

export default CreateExpCheckWidget;
