import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { NumberEditor, ParamDescription, ParamError } from '@/components/json-schema-editor';
import { type WbDeviceParameterEditor } from '@/stores/device-manager';
import { type Translator, type NumberStore } from '@/stores/json-schema-editor';

export const ParamSimpleLabel = (
  { title, inputId, className }:
  { title: string; inputId: string; className?: string }
) => {
  return (
    <label htmlFor={inputId} className={classNames('wb-jsonEditor-propertyLabel', className)}>
      {title}
    </label>
  );
};

const BadValueFromRegisterWarningText = ({ store, translator }: { store: NumberStore; translator: Translator }) => {
  const { t, i18n } = useTranslation();
  if (store.schema.enum) {
    return t('device-manager.errors.bad-value-from-registers', { value: JSON.stringify(store.value) });
  }
  const currentLanguage = i18n.language;
  const text = store.error.key ? t(store.error.key, store.error.data) : translator.find(store.error.msg, currentLanguage);
  return (
    <>
      {t('device-manager.errors.bad-value-from-registers', { value: JSON.stringify(store.value) })}
      <br/>
      {text}
    </>
  );
}

export const BadValueFromRegisterWarning = ({ id, store, translator }: { id: string; store: NumberStore; translator: Translator }) => {
  return (
    <p 
      id={id}
      className='deviceSettingsEditor-parameterWithBadValueFromRegisters-warning'
    >
      <BadValueFromRegisterWarningText store={store} translator={translator} />
    </p>
  );
};

export const ParamEditor = observer((
  { param, translator }:
  { param: WbDeviceParameterEditor; translator: Translator }
) => {
  const descriptionId = useId();
  const errorId = useId();
  const inputId = useId();
  const { i18n, t } = useTranslation();
  const currentLanguage = i18n.language;
  const hasBadValueFromRegisters = param.hasBadValueFromRegisters;
  const showError = param.hasErrors && !hasBadValueFromRegisters;
  const activeVariant = param.variants[param.activeVariantIndex];
  let descriptionLines = [];
  if (activeVariant.store.schema.description) {
    descriptionLines.push(translator.find(activeVariant.store.schema.description, currentLanguage));
  }
  if (!param.isSupportedByFirmware) {
    descriptionLines.push(t('device-manager.errors.supported-since', { fw: param.supportedFirmware }));
  }
  const description = descriptionLines.join('<br/>');
  const title = translator.find(activeVariant.store.schema.title || param.id, currentLanguage);
  return (
    <div
      className={classNames('deviceSettingsEditor-parameter', {
        'wb-jsonEditor-propertyError': showError,
        'deviceSettingsEditor-shouldStoreInConfig': param.shouldStoreInConfig,
        'deviceSettingsEditor-hasBadValueFromRegisters': hasBadValueFromRegisters,
      })}
    >
      <ParamSimpleLabel title={title} inputId={inputId} />
      <NumberEditor
        key={param.id}
        store={activeVariant.store}
        translator={translator}
        isDisabled={!param.isSupportedByFirmware}
      />
      {showError && (
        <ParamError id={errorId} error={activeVariant.store.error} translator={translator} />
      )}
      {hasBadValueFromRegisters && (
         <BadValueFromRegisterWarning id={errorId} store={activeVariant.store} translator={translator} />
      )}
      {description && (
        <ParamDescription id={descriptionId} description={description} />
      )}
    </div>
  );
});

export const MakeEditors = (parameters: WbDeviceParameterEditor[], translator: Translator) => {
  return parameters.map((param) => {
    if (param.isEnabledByCondition) {
      return <ParamEditor key={param.id} param={param} translator={translator} />;
    }
    return null;
  });
};
