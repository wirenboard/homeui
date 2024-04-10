import React from 'react';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import CloudStatusWidget from "./cloudStatusWidget";

const CloudStatusMetaWidget = observer(({ store }) => {
  const { t } = useTranslation();

  return Object.values(store.stores).map((storeItem) => (
    <CloudStatusWidget store={storeItem} />
  ));

});

function CreateCloudStatusMetaWidget({ store }) {
  return <CloudStatusMetaWidget store={store} />;
}

export default CreateCloudStatusMetaWidget;
