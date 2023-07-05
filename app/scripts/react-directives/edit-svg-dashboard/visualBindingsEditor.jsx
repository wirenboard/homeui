import React from 'react';
import { BootstrapRow, Radio, Checkbox } from '../common';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { FormSelect, FormStringEdit, FormCheckbox, MakeFormFields } from '../forms/forms';

const WriteBindingFormContent = observer(({ store }) => {
  if (!store?.params?.enable?.value) {
    return null;
  }
  return (
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
  );
});

const MoveToBindingFormContent = observer(({ store }) => {
  if (!store?.params?.enable?.value) {
    return null;
  }
  return <FormSelect store={store.params.dashboard} />;
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

export const ClickBindingForm = observer(({ title, clickStore, writeStore, writeDefault }) => {
  if (!clickStore || !clickStore.hasProperties || !writeStore || !writeStore.hasProperties) {
    return null;
  }
  const enabled = !!(clickStore.params.enable.value || writeStore.params.enable.value);
  return (
    <div>
      <div className="form-group">
        <Checkbox
          id={clickStore.params.enable.id + writeStore.params.enable.id}
          label={title}
          value={enabled}
          onChange={e => {
            if (e.target.checked) {
              clickStore.params.enable.setValue(!writeDefault);
              writeStore.params.enable.setValue(!!writeDefault);
            } else {
              clickStore.params.enable.setValue(false);
              writeStore.params.enable.setValue(false);
            }
          }}
        />
      </div>
      {enabled && (
        <div className="radios">
          <Radio
            id={writeStore.params.enable.id}
            label={writeStore.params.enable.name}
            value={writeStore.params.enable.value}
            onChange={checked => {
              writeStore.params.enable.setValue(checked);
              clickStore.params.enable.setValue(!checked);
            }}
          />
          <Radio
            id={clickStore.params.enable.id}
            label={clickStore.params.enable.name}
            value={clickStore.params.enable.value}
            onChange={checked => {
              clickStore.params.enable.setValue(checked);
              writeStore.params.enable.setValue(!checked);
            }}
          />
        </div>
      )}
      <MoveToBindingFormContent store={clickStore} />
      <WriteBindingFormContent store={writeStore} />
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
      <ClickBindingForm
        title={t('edit-svg-dashboard.labels.click')}
        clickStore={store.params.params.click}
        writeStore={store.params.params.write}
        writeDefault={true}
      />
      <VisibleBindingForm store={store.params.params.visible} />
      <ParamBindingForm store={store.params.params.style} />
      <ClickBindingForm
        title={t('edit-svg-dashboard.labels.long-press')}
        clickStore={store.params.params['long-press']}
        writeStore={store.params.params['long-press-write']}
      />
    </>
  );
});

export default VisualBindingsEditor;
