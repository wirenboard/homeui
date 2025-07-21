import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Checkbox } from '@/components/checkbox';
import { Input } from '@/components/input';
import { NumberEditor, ParamDescription, ParamError } from '@/components/json-schema-editor';
import { WbDeviceParameterEditor } from '@/stores/device-manager';
import { Translator } from '@/stores/json-schema-editor';

const DisabledParamPlaceholder = () => {
  const { t } = useTranslation();
  return <Input isDisabled={true} value="" onChange={() => {}} placeholder={t('device-manager.labels.unknown')} />;
};

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

const ParamLabel = ({ param, title, inputId }: { param: WbDeviceParameterEditor; title: string; inputId: string }) => {
  if (param.required) {
    return <ParamSimpleLabel title={title} inputId={inputId} />;
  }
  const checkHandler = (checked: boolean) => {
    if (checked) {
      param.enableByUser();
    } else {
      param.disableByUser();
    }
  };
  return (
    <Checkbox
      title={title}
      checked={param.isEnabledByUser}
      className="wb-jsonEditor-propertyCheckbox"
      onChange={checkHandler}
    />
  );
};

export const ParamEditor = observer((
  { param, translator }:
  { param: WbDeviceParameterEditor; translator: Translator }
) => {
  const descriptionId = useId();
  const errorId = useId();
  const inputId = useId();
  const { i18n } = useTranslation();
  const currentLanguage = i18n.language;
  const showError = param.hasErrors && param.isEnabledByUser;
  const activeVariant = param.variants[param.activeVariantIndex];
  const showDescription = !!activeVariant.store.schema.description;
  const title = translator.find(activeVariant.store.schema.title || param.id, currentLanguage);
  return (
    <div className={classNames('device-settings__parameter', { 'wb-jsonEditor-propertyError': showError })} >
      <ParamLabel param={param} title={title} inputId={inputId} />
      {param.isEnabledByUser ? (
        <NumberEditor key={param.id} store={activeVariant.store} translator={translator} />
      ) : (
        <DisabledParamPlaceholder />
      )}
      {showError && <ParamError id={errorId} error={activeVariant.store.error} translator={translator} />}
      {showDescription && (
        <ParamDescription
          id={descriptionId}
          description={translator.find(activeVariant.store.schema.description, currentLanguage)}
        />
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
