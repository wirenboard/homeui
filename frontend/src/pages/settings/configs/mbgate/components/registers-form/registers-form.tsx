import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { Alert } from '@/components/alert';
import { Dropdown, type Option } from '@/components/dropdown';
import { MakeFormFields, ShowParamCaptionContext, type FormStore } from '@/components/json-editor/forms';
import {
  REGISTER_TYPE_SELECTIONS,
  type RegisterTypeSelection,
} from '@/pages/settings/configs/mbgate/stores/types';

interface RegistersFormProps {
  store: FormStore;
  isAllConfigured: boolean;
  onAdd: (_registerType: RegisterTypeSelection) => void;
}

export const RegistersForm = observer(({ store, isAllConfigured, onAdd }: RegistersFormProps) => {
  const { t } = useTranslation();

  const addMenuOptions: Option<RegisterTypeSelection>[] = REGISTER_TYPE_SELECTIONS.map((value) => ({
    value,
    label: t(`mbgate.labels.register-types.${value}`),
  }));

  return (
    <fieldset>
      <legend className="mbgate-registersHeader">
        <span className="mbgate-registerName">{store.name}</span>
        <Dropdown
          className="mbgate-addMenu"
          value={null}
          options={addMenuOptions}
          placeholder={t('mbgate.buttons.add')}
          ariaLabel={t('mbgate.buttons.add')}
          isDisabled={isAllConfigured}
          isButton
          onChange={(option: Option<RegisterTypeSelection>) => option?.value && onAdd(option.value)}
        />
        {isAllConfigured && (
          <Alert variant="info" size="small" withIcon={false}>
            {t('mbgate.labels.no-controls')}
          </Alert>
        )}
      </legend>
      <div className="mbgate-registerContent">
        <ShowParamCaptionContext.Provider value={true}>
          {MakeFormFields(Object.entries(store.params))}
        </ShowParamCaptionContext.Provider>
      </div>
    </fieldset>
  );
});
