import React from 'react';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import CloudStatusWidget from "./cloudStatusWidget";

const CloudStatusMetaWidget = observer(({ store }) => {
  const { t } = useTranslation();

  const rows = [];
  for (let i = 0; i < store.providers.length; i++) {
    rows.push(<CloudStatusWidget store={store.stores[store.providers[i]]} />);
  }
  return rows;
});

function CreateCloudStatusMetaWidget({ store }) {
  return <CloudStatusMetaWidget store={store} />;
}

export default CreateCloudStatusMetaWidget;
