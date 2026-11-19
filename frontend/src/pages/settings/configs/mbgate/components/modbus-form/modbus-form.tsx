import { observer } from 'mobx-react-lite';
import { Dropdown, type Option } from '@/components/dropdown';
import { Form, ShowParamCaptionContext, type OneOfStore } from '@/components/json-editor/forms';

export const ModbusForm = observer(({ store }: { store: OneOfStore }) => {
  const { optionsStore, selectedForm } = store;
  return (
    <ShowParamCaptionContext.Provider value={false}>
      <fieldset>
        <legend className="form-header">
          <span className="form-caption">{optionsStore.name}</span>
          <div>
            <Dropdown
              value={optionsStore.selectedOption?.value}
              options={optionsStore.options}
              size="small"
              ariaLabel={optionsStore.name}
              isDisabled={optionsStore.readOnly}
              onChange={(option: Option<number>) => optionsStore.setSelectedOption(option)}
            />
          </div>
        </legend>
        {selectedForm && <Form store={selectedForm} />}
      </fieldset>
    </ShowParamCaptionContext.Provider>
  );
});
