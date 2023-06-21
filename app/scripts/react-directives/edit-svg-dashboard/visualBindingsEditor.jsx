import React from 'react';
import { BootstrapRow } from '../common';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { FormSelect, FormStringEdit, FormCheckbox, MakeFormFields } from '../forms/forms';

export const WriteBindingForm = observer(({ store }) => {
  if (!store || !store.hasProperties) {
    return null;
  }
  return (
    <div>
      <FormCheckbox key={store.params.enable.id} store={store.params.enable} />
      {store.params.enable.value && (
        <>
          <FormSelect store={store.params.channel} />
          <BootstrapRow>
            <div className="col-md-6">
              <FormStringEdit store={store.params.value.params.on} />
            </div>
            <div className="col-md-6">
              <FormStringEdit store={store.params.value.params.off} />
            </div>
          </BootstrapRow>
        </>
      )}
    </div>
  );
});

export const VisibleBindingForm = observer(({ store }) => {
  if (!store || !store.hasProperties) {
    return null;
  }
  return (
    <div>
      <FormCheckbox key={store.params.enable.id} store={store.params.enable} />
      {store.params.enable.value && (
        <>
          <FormSelect store={store.params.channel} />
          <BootstrapRow>
            <div className="col-xs-6 col-sm-3 col-md-2 col-lg-2">
              <FormSelect store={store.params.condition} />
            </div>
            <div className="col-sx-6 col-sm-9 col-md-10 col-lg-10">
              <FormStringEdit store={store.params.value} />
            </div>
          </BootstrapRow>
        </>
      )}
    </div>
  );
});

export const LongPressBindingForm = observer(({ store }) => {
  if (!store || !store.hasProperties) {
    return null;
  }
  return (
    <div>
      <FormCheckbox key={store.params.enable.id} store={store.params.enable} />
      {store.params.enable.value && <FormSelect store={store.params.dashboard} />}
    </div>
  );
});

export const ParamBindingForm = observer(({ store }) => {
  if (!store || !store.hasProperties) {
    return null;
  }
  return (
    <div>
      <FormCheckbox key={store.params.enable.id} store={store.params.enable} />
      {store.params.enable.value &&
        MakeFormFields(Object.entries(store.params).filter(([key, value]) => key !== 'enable'))}
    </div>
  );
});

const VisualBindingsEditor = observer(({ store }) => {
  const { t } = useTranslation();
  if (!store.isSelected) {
    return null;
  }
  return (
    <>
      <h6>
        {t('edit-svg-dashboard.labels.tag-name', {
          tag: store.tagName,
        })}
      </h6>
      <ParamBindingForm store={store.params.params.read} />
      <WriteBindingForm store={store.params.params.write} />
      <VisibleBindingForm store={store.params.params.visible} />
      <ParamBindingForm store={store.params.params.style} />
      <LongPressBindingForm store={store.params.params['long-press']} />
    </>
  );
});

export default VisualBindingsEditor;
