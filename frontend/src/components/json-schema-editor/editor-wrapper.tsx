import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { CSSProperties, PropsWithChildren } from 'react';
import { useTranslation } from 'react-i18next';
import { Checkbox } from '@/components/checkbox';
import { Input } from '@/components/input';
import { ParamDescription } from './param-description';
import { ParamError } from './param-error';
import type { EditorWrapperProps, EditorWrapperLabelProps } from './types';

const EditorWrapperLabel = ({ param, title, inputId }: EditorWrapperLabelProps) => {
  if (!param.store.schema.options?.wb?.show_editor && param.store.schema.options?.show_opt_in) {
    const checkHandler = (checked: boolean) => {
      if (checked) {
        param.enable();
      } else {
        param.disable();
      }
    };
    return (
      <Checkbox
        title={title}
        checked={!param.disabled}
        className="wb-jsonEditor-propertyCheckbox"
        onChange={checkHandler}
      />
    );
  }
  return (
    <label htmlFor={inputId} className="wb-jsonEditor-propertyLabel">
      {title}
    </label>
  );
};

const DisabledParamPlaceholder = () => {
  return <Input isDisabled={true} value="" onChange={() => {}} />;
};

export const EditorWrapper = observer(({
  children,
  param,
  translator,
  descriptionId,
  errorId,
  inputId,
}: PropsWithChildren<EditorWrapperProps>) => {
  const { i18n } = useTranslation();
  const currentLanguage = i18n.language;
  let style: CSSProperties = {};
  if (param.store.schema.options?.grid_columns) {
    const gridColumns = param.store.schema.options.grid_columns;
    style.flexGrow = 1;
    if (gridColumns === 12) {
      style.flexBasis = '100%';
    } else {
      style.flexBasis = `${(gridColumns / 12) * 100 - 7}%`;
    }
  }
  const showDefaultText = param.store.schema.options?.show_opt_in || param.store.schema.options?.wb?.allow_undefined;
  const defaultText = showDefaultText ? param.store.defaultText : '';
  const showError = param.store.hasErrors && !param.disabled;
  const showDescription = !!param.store.schema.description || showDefaultText;
  const title = translator.find(param.store.schema.title || param.key, currentLanguage);
  const showLabel = param.store.storeType !== 'boolean' && !param.store.schema.options?.compact;
  return (
    <div
      className={classNames('wb-jsonEditor-objectProperty', { 'wb-jsonEditor-propertyError': showError })}
      style={style}
    >
      {showLabel && <EditorWrapperLabel param={param} title={title} inputId={inputId} />}
      {param.disabled ? (
        <DisabledParamPlaceholder />
      ) : (
        children
      )}
      {showError && <ParamError id={errorId} error={param.store.error} translator={translator} />}
      {showDescription && (
        <ParamDescription
          id={descriptionId}
          description={translator.find(param.store.schema.description, currentLanguage)}
          defaultText={defaultText}
        />
      )}
    </div>
  );
});
