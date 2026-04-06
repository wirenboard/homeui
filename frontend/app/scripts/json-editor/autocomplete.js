import { JSONEditor } from '@wirenboard/json-editor';
import { createRoot } from 'react-dom/client';
import { createElement } from 'react';
import { Dropdown } from '@/components/dropdown';

export function makeAutocompleteEditor(devices) {
  return class extends JSONEditor.AbstractEditor {
    build() {
      this.control = document.createElement('div');
      this.control.style.minWidth = '180px';
      this.container.appendChild(this.control);

      this.render();
    }

    render() {
      if (!this.reactRoot) {
        this.reactRoot = createRoot(this.control);
      }

      const options = devices?.map(topic => ({
        label: topic,
        value: topic,
      })) || [];

      this.reactRoot.render(
        createElement(Dropdown, {
          options,
          value: this.value,
          isSearchable: true,
          isClearable: true,
          onChange: (option) => {
            this.setValue(option?.value || '');
            this.onChange(true);
          },
        })
      );
    }

    setValue(value) {
      if (this.value === value){
        return;
      }
      this.value = value;
      this.render();
    }

    getValue() {
      return this.value;
    }

    refresh() {
      this.render();
    }

    destroy() {
      if (this.reactRoot) {
        this.reactRoot.unmount();
      }
      super.destroy();
    }
  };
}
