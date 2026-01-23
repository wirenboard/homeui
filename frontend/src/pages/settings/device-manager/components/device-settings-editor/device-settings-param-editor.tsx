import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { NumberEditor, ParamDescription, ParamError } from '@/components/json-schema-editor';
import { type WbDeviceParameterEditor } from '@/stores/device-manager';
import { type Translator } from '@/stores/json-schema-editor';

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

export const ParamEditor = observer((
  { param, translator }:
  { param: WbDeviceParameterEditor; translator: Translator }
) => {
  const descriptionId = useId();
  const errorId = useId();
  const inputId = useId();
  const { i18n, t } = useTranslation();
  const currentLanguage = i18n.language;
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
        'deviceSettingsEditor-parameterChangedByUser': param.isChangedByUser || param.required,
      })}
    >
      <ParamSimpleLabel title={title} inputId={inputId} />
      <NumberEditor
        key={param.id}
        store={activeVariant.store}
        translator={translator}
        isDisabled={!param.isSupportedByFirmware}
      />
      {param.hasErrors && <ParamError id={errorId} error={activeVariant.store.error} translator={translator} />}
      {description && <ParamDescription id={descriptionId} description={description} />}
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
