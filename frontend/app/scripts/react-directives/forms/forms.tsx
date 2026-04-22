import { observer } from 'mobx-react-lite';
import { useContext, createContext, useState } from 'react';
import { useTranslation } from 'react-i18next';
import TrashIcon from '@/assets/icons/trash.svg';
import { Button } from '@/components/button';
import { CollapsiblePanel } from '@/components/collapsible-panel';
import { Confirm } from '@/components/confirm';
import { BooleanField, OptionsField, PasswordField, StringField } from '@/components/form';
import { Table, TableRow, TableCell } from '@/components/table';
import { Tooltip } from '@/components/tooltip';
import './styles.css';

export const ShowParamCaptionContext = createContext(true);
export const CustomEditorBuilderContext = createContext(null);

const makeFlexItemStyle = (columns: number) => {
  const MAX_COLUMNS = 12;
  const columnsCount = columns || MAX_COLUMNS;
  return {
    flexGrow: columnsCount / MAX_COLUMNS,
    flexBasis: `${(columnsCount / MAX_COLUMNS) * 100 * 0.9}%`,
  };
};

export const FormStringEdit = observer(({ store }) => {
  const showCaption = useContext(ShowParamCaptionContext);

  if (store.editType === 'password') {
    return (
      <PasswordField
        title={showCaption && store.name}
        view={store.editType === 'textarea' ? 'textarea' : 'input'}
        value={store.value === undefined ? '' : store.value}
        placeholder={store.placeholder}
        isDisabled={store.readOnly}
        required={store.required}
        autoComplete={store.autocomplete}
        error={store.error}
        showIndicator={store.showIndicator}
        formStyle={makeFlexItemStyle(store?.formColumns)}
        onChange={(value: string) => store.setValue(value)}
      />
    );
  }

  return (
    <StringField
      title={showCaption && store.name}
      description={store.description}
      view={store.editType === 'textarea' ? 'textarea' : 'input'}
      value={store.value === undefined ? '' : store.value}
      placeholder={store.placeholder}
      isDisabled={store.readOnly}
      required={store.required}
      error={store.error}
      autoComplete={store.autocomplete}
      formStyle={makeFlexItemStyle(store?.formColumns)}
      onChange={(value: string) => store.setValue(value)}
    />
  );
},
);

export const FormCheckbox = observer(({ store }) => {
  const showCaption = useContext(ShowParamCaptionContext);
  return (
    <BooleanField
      title={showCaption && store.name}
      description={store.description}
      view="checkbox"
      value={store.value}
      isDisabled={store.readOnly}
      error={store.error}
      formStyle={makeFlexItemStyle(store?.formColumns)}
      onChange={(value: boolean) => store.setValue(value)}
    />
  );
});

export const FormSelect = observer(({ store, isClearable }) => {
  const showCaption = useContext(ShowParamCaptionContext);

  const findOption = (options, value) => {
    for (const option of options) {
      if (option.value === value) return option;
      if (option.children) {
        const found = findOption(option.children, value);
        if (found) return found;
      }
    }
    return null;
  };

  return (
    <OptionsField
      formStyle={makeFlexItemStyle(store?.formColumns)}
      description={store.description}
      title={showCaption && store.name}
      value={store.selectedOption?.value}
      options={store.options}
      isClearable={isClearable}
      error={store.error}
      placeholder={store.placeholder}
      isDisabled={store.readOnly}
      isSearchable
      onChange={(value) => {
        store.setSelectedOption(findOption(store.options, value));
      }}
    />
  );
});

export const FormOneOf = observer(({ store }) => (
  <ShowParamCaptionContext.Provider value={false}>
    <fieldset style={makeFlexItemStyle(store?.formColumns)}>
      <legend className="form-header">
        <span className="form-caption">{store.optionsStore.name}</span>
        <div>
          <FormSelect store={store.optionsStore} isClearable={false} />
        </div>
      </legend>
      {store.selectedForm && <FormEditor param={store.selectedForm} paramName={store.name} />}
    </fieldset>
  </ShowParamCaptionContext.Provider>
));

export const FormCollapsibleTable = observer(({ store }) => {
  const { t } = useTranslation();
  const [removeIndex, setRemoveIndex] = useState<number | null>(null);

  return (
    <CollapsiblePanel title={store.name}>
      <Table isWithoutGap>
        <TableRow isHeading>
          {store.headers.map((header: string) => (
            <TableCell key={header}>{header}</TableCell>
          ))}
          <TableCell width={40} />
        </TableRow>
        <ShowParamCaptionContext.Provider value={false}>
          {store.items.map((item, index: number) => (
            <TableRow key={index}>
              {Object.entries(item.params).map(([key, param]) => (
                <TableCell key={key + index}>
                  <FormEditor param={param} paramName={key + index} />
                </TableCell>
              ))}
              <TableCell width={40} align="center">
                <Tooltip
                  text={t('forms.remove')}
                  placement="left"
                >
                  <Button
                    aria-label={t('forms.remove')}
                    variant="danger"
                    aria-haspopup="dialog"
                    icon={<TrashIcon />}
                    onClick={() => setRemoveIndex(index)}
                  />
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
        </ShowParamCaptionContext.Provider>
      </Table>
      <Confirm
        isOpened={removeIndex !== null}
        heading={t('forms.confirm-remove')}
        variant="danger"
        acceptLabel={t('forms.remove')}
        closeCallback={() => setRemoveIndex(null)}
        confirmCallback={() => {
          store.remove(removeIndex);
          setRemoveIndex(null);
        }}
      />
    </CollapsiblePanel>
  );
});

export const FormEditor = ({ param, paramName }) => {
  const customEditorBuilder = useContext(CustomEditorBuilderContext);
  if (customEditorBuilder) {
    const customEditor = customEditorBuilder(param, paramName);
    if (customEditor) {
      return customEditor;
    }
  }
  if (['string', 'integer', 'number'].includes(param.type)) {
    return <FormStringEdit store={param} />;
  }
  if (param.type === 'boolean') {
    return <FormCheckbox store={param} />;
  }
  if (param.type === 'options') {
    return <FormSelect store={param} />;
  }
  if (param.type === 'object') {
    return <Form store={param} />;
  }
  if (param.type === 'array') {
    return <FormCollapsibleTable store={param} />;
  }
  if (param.type === 'oneOf') {
    return <FormOneOf store={param} />;
  }
  return null;
};

export const MakeFormFields = (params) => params.map(([name, param]) => (
  <FormEditor param={param} paramName={name} key={name} />
));

export const Form = observer(({ store, children }) => {
  const { t } = useTranslation();
  const showCaption = useContext(ShowParamCaptionContext);
  if (!store) {
    return null;
  }
  return (
    <fieldset style={makeFlexItemStyle(store?.formColumns)}>
      {showCaption && (
        <legend className="form-header">
          <span className="form-caption">{t(store.name)}</span>
        </legend>
      )}
      <div className="form-content">
        <ShowParamCaptionContext.Provider value={true}>
          {MakeFormFields(Object.entries(store.params))}
        </ShowParamCaptionContext.Provider>
      </div>
      {children}
    </fieldset>
  );
});
