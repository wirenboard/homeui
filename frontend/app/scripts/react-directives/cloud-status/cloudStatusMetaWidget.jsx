import React from 'react';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import CloudStatusWidget from './cloudStatusWidget';

const CloudStatusMetaWidget = observer(({ store }) => {
  const { t } = useTranslation();

  return Object.keys(store.stores).map((key) => (
    <CloudStatusWidget store={store.stores[key]} key={key} />
  ));
});

function CreateCloudStatusMetaWidget({ store }) {
  return <CloudStatusMetaWidget store={store} />;
}

export default CreateCloudStatusMetaWidget;
