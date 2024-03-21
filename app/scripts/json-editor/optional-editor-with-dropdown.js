'use strict';

import { JSONEditor } from '../../3rdparty/jsoneditor';

// Editor for not required properties
// Must be used with show_opt_in option
// Editor has select to switch between undefined and value editor
// When set to undefined customizable message is shown
// Additional editor options:
// "wb": {
//     "editor_title": "title in select to show value's editor",
//     "undefined_title": "title in select to set undefined",
//     "undefined_message": "additional message when undefined"
// }
function makeOptionalEditorWithDropDown() {
  return class extends JSONEditor.AbstractEditor {
    activate() {
      this._switchToEditor();
      this.switcher.value = 'editor';
      this.change();
    }

    deactivate() {
      if (!this.isRequired()) {
        this._switchToUndefined();
        this.switcher.value = 'undefined';
        this.change();
      }
    }

    preBuild() {
      delete this.schema.format;
      super.preBuild();
    }

    build() {
      // Dummy checkbox for json-editor logic
      this.optInCheckbox = document.createElement('input');

      this.header = this.label = this.theme.getFormInputLabel(this.getTitle(), this.isRequired());
      this.container.appendChild(this.header);

      var options = ['editor', 'undefined'];
      var titles = ['editor', 'undefined'];
      if (this.options && this.options.wb) {
        if (this.options.wb.editor_title) {
          titles[0] = this.translateProperty(this.options.wb.editor_title);
        }
        if (this.options.wb.undefined_title) {
          titles[1] = this.translateProperty(this.options.wb.undefined_title);
        }
      }
      this.switcher = this.theme.getSwitcher();
      this.theme.setSelectOptions(this.switcher, options, titles);
      this.container.appendChild(this.switcher);
      this.switcher.addEventListener('change', e => {
        e.preventDefault();
        e.stopPropagation();
        if (this._editorIsEnabled()) {
          this._switchToUndefined();
        } else {
          this._switchToEditor();
        }
        this.onChange(true);
      });

      this.editor_holder = document.createElement('div');
      this.container.appendChild(this.editor_holder);
      const holder = this.theme.getChildEditorHolder();
      this.editor_holder.appendChild(holder);

      const editor = this.jsoneditor.getEditorClass(this.schema);

      this.editor = this.jsoneditor.createEditor(editor, {
        jsoneditor: this.jsoneditor,
        schema: this.schema,
        container: holder,
        path: this.path,
        parent: this,
        required: true,
        compact: true,
      });
      this.editor.preBuild();
      this.editor.build();
      this.editor.postBuild();

      this.label = this.theme.getFormInputField('text');
      var undefined_message = options[1];
      if (this.options && this.options.wb && this.options.wb.undefined_message) {
        undefined_message = this.translateProperty(this.options.wb.undefined_message);
      }
      this.label.value = undefined_message;
      this.label.disabled = true;
      this.editor_holder.appendChild(this.label);
      this.editor_holder.style.marginBottom = '9px';
    }

    enable() {
      this.switcher.enabled = true;
      this.editor.enabled = true;
      super.enable();
    }

    disable() {
      this.switcher.enabled = false;
      this.editor.enabled = false;
      super.disable();
    }

    setValue(val, initial) {
      this._switchToEditor();
      this.editor.setValue(val, initial);
      this.refreshValue();
      this.onChange();
    }

    destroy() {
      if (this.editor) this.editor.destroy();
      if (this.editor_holder && this.editor_holder.parentNode)
        this.editor_holder.parentNode.removeChild(this.editor_holder);
      if (this.switcher && this.switcher.parentNode)
        this.switcher.parentNode.removeChild(this.switcher);
      super.destroy();
    }

    showValidationErrors(errors) {
      if (this.editor) {
        this.editor.showValidationErrors(errors);
      }
    }

    getDefault() {
      if (this.editor) {
        return this.editor.getDefault();
      }
      return super.getDefault();
    }

    onChildEditorChange(editor) {
      if (this._editorIsEnabled()) {
        this.value = this.editor.getValue();
      } else {
        this.value = undefined;
      }
      super.onChildEditorChange(editor);
    }

    setOptInCheckbox() {
      // clear base class realization
    }

    _switchToUndefined() {
      this.editor.container.style.display = 'none';
      this.label.style.display = '';
      this.value = undefined;
      this.active = false;
    }

    _switchToEditor() {
      this.editor.container.style.display = '';
      this.label.style.display = 'none';
      this.value = this.editor.getValue();
      this.active = true;
    }

    _editorIsEnabled() {
      return this.editor.container.style.display !== 'none';
    }
  };
}

export default makeOptionalEditorWithDropDown;
