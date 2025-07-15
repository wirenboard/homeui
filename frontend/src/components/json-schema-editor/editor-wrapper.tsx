import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { CSSProperties, PropsWithChildren } from 'react';
import { useTranslation } from 'react-i18next';
import { ParamDescription } from './param-description';
import { ParamError } from './param-error';
import type { EditorWrapperProps } from './types';

export const EditorWrapperLabel = ({ title, inputId }: { title: string; inputId: string }) => {
  return (
    <label htmlFor={inputId} style={{ whiteSpace: 'nowrap' }}>
      {title}
    </label>
  );
};

export const EditorWrapper = observer(({
  children,
  descriptionId,
  errorId,
  store,
  translator,
}: PropsWithChildren<EditorWrapperProps>) => {
  const { i18n } = useTranslation();
  const currentLanguage = i18n.language;
  let style: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
  };
  if (store.schema.options?.grid_columns) {
    const gridColumns = store.schema.options.grid_columns;
    style.flexGrow = 1;
    if (gridColumns === 12) {
      style.flexBasis = '100%';
    } else {
      style.flexBasis = `${(gridColumns / 12) * 100 - 7}%`;
    }
  }
  const showDefaultText = store.schema.options?.show_opt_in;
  const defaultText = showDefaultText ? store.defaultText : '';
  const showError = !!store.error;
  const showDescription = !!store.schema.description || showDefaultText;
  return (
    <div
      className={classNames({ 'wb-jsonEditor-propertyError': store.hasErrors })}
      style={style}
    >
      {children}
      {showError && <ParamError id={errorId} error={store.error} translator={translator} />}
      {showDescription && (
        <ParamDescription
          id={descriptionId}
          description={translator.find(store.schema.description, currentLanguage)}
          defaultText={defaultText}
        />
      )}
    </div>
  );
});
