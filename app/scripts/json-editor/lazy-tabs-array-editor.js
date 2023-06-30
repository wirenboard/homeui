'use strict';

import { JSONEditor } from '../../3rdparty/jsoneditor';

function makeLazyTabsArrayEditor() {
  return class extends JSONEditor.defaults.editors['array'] {
    unregister() {
      if (this.jsoneditor) {
        this.jsoneditor.unregisterEditor(this);
      }
      if (this.rows) {
        this.rows.forEach(row => row && row.has_editor && row.unregister());
      }
    }

    register() {
      this.jsoneditor.registerEditor(this);
      this.onChange();
      if (this.rows) {
        this.rows.forEach(row => row && row.has_editor && row.register());
      }
    }

    enable() {
      if (!this.always_disabled) {
        this.setAvailability(this, false);

        if (this.rows) {
          this.rows.forEach(row => {
            if (row.has_editor) {
              row.enable();
              this.setAvailability(row, false);
            }
          });
        }
        this.disabled = false;
      }
    }

    disable(alwaysDisabled) {
      if (alwaysDisabled) this.always_disabled = true;
      this.setAvailability(this, true);

      if (this.rows) {
        this.rows.forEach(row => {
          if (row.has_editor) {
            row.disable(alwaysDisabled);
            this.setAvailability(row, true);
          }
        });
      }
      this.disabled = true;
    }

    preBuild() {
      this.valueToSet = [];
      super.preBuild();
    }

    build() {
      this.schema.format = 'tabs';
      super.build();
    }

    destroyRow(row, hard) {
      if (!row) {
        return;
      }
      const holder = row.container;
      if (hard) {
        if (row.has_editor) {
          row.destroy();
          if (holder.parentNode) holder.parentNode.removeChild(holder);
        }
        if (this.checkParent(row.tab)) row.tab.parentNode.removeChild(row.tab);
      } else {
        if (row.tab) row.tab.style.display = 'none';
        if (row.has_editor) {
          row.unregister();
          holder.style.display = 'none';
        }
      }
    }

    refreshTabs(refreshHeaders) {
      this.rows.forEach((row, i) => {
        if (!row.tab) {
          return;
        }

        if (!row.has_editor) {
          if (refreshHeaders) {
            this.updateTabTextContent(i, this.valueToSet[i]);
          }
          return;
        }

        if (refreshHeaders) {
          row.tab_text.textContent = row.getHeaderText();
        } else if (row.tab === this.active_tab) {
          this.theme.markTabActive(row);
        } else {
          this.theme.markTabInactive(row);
        }
      });
    }

    setValue(value = [], initial) {
      value = this.ensureArraySize(value);
      const serialized = JSON.stringify(value);
      if (serialized === this.serialized) return;
      this.valueToSet = value;
      value.forEach((val, i) => {
        if (this.rows[i]) {
          if (this.rows[i].has_editor) {
            this.rows[i].setValue(val, initial);
          }
        } else {
          const editor = this.addRow(val, initial);
          this.jsoneditor.trigger('addRow', editor);
        }
      });
      for (let j = value.length; j < this.rows.length; j++) {
        this.destroyRow(this.rows[j]);
        this.rows[j] = null;
      }
      this.rows = this.rows.slice(0, value.length);

      /* Set the active tab */
      const row = this.rows.find(row => row.tab === this.active_tab);
      let newActiveTab = typeof row !== 'undefined' ? row.tab : null;
      if (!newActiveTab && this.rows.length) newActiveTab = this.rows[0].tab;
      this.active_tab = newActiveTab;
      this.refreshValue(true);
      this.refreshTabs(true);
      this.refreshTabs();
      this.onChange();
    }

    refreshValue(force) {
      const oldi = this.value ? this.value.length : 0;

      /* Get the value for this editor */
      this.value = (this.valueToSet || []).map(i => i);
      this.rows.forEach((row, i) => {
        if (row.has_editor) {
          this.value[i] = row.getValue();
        }
      });

      if (oldi !== this.value.length || force) {
        /* If we currently have minItems items in the array */
        const minItems = this.schema.minItems && this.schema.minItems >= this.rows.length;

        this.rows.forEach((editor, i) => {
          if (editor.has_editor) {
            /* Hide the move down button for the last row */
            if (editor.movedown_button) {
              const display = i !== this.rows.length - 1;
              this.setVisibility(editor.movedown_button, display);
            }

            /* Hide the delete button if we have minItems items */
            if (editor.delete_button) {
              this.setVisibility(editor.delete_button, !minItems);
            }
          }
        });
        if (!this.collapsed && this.setupButtons(minItems)) {
          this.controls.style.display = 'inline-block';
        } else {
          this.controls.style.display = 'none';
        }
      }
      this.serialized = JSON.stringify(this.value);
    }

    renderRow(i, value, initial) {
      var tab_text = this.rows[i].tab_text;
      var tab = this.rows[i].tab;
      this.rows[i] = this.getElementEditor(i);
      this.row_cache[i] = this.rows[i];
      this.rows[i].tab = tab;
      this.rows[i].tab_text = tab_text;
      this.rows[i].register();
      if (typeof value !== 'undefined') {
        this.rows[i].setValue(value, initial);
      }
      this.rows[i].has_editor = true;

      if (!this.rows[i].title_controls) {
        this.rows[i].array_controls = this.theme.getButtonHolder();
        if (!this.hide_delete_buttons || this.show_copy_button || !this.hide_move_buttons) {
          this.rows[i].container.appendChild(this.rows[i].array_controls);
        }
      }

      const controlsHolder = this.rows[i].title_controls || this.rows[i].array_controls;

      /* Buttons to delete row, move row up, and move row down */
      if (!this.hide_delete_buttons) {
        this.rows[i].delete_button = this._createDeleteButton(i, controlsHolder);
      }

      /* Button to copy an array element and add it as last element */
      if (this.show_copy_button) {
        this.rows[i].copy_button = this._createCopyButton(i, controlsHolder);
      }

      if (i && !this.hide_move_buttons) {
        this.rows[i].moveup_button = this._createMoveUpButton(i, controlsHolder);
      }

      if (!this.hide_move_buttons) {
        this.rows[i].movedown_button = this._createMoveDownButton(i, controlsHolder);
      }
    }

    updateTabTextContent(i, value) {
      var schema = this.getItemSchema(i);
      schema = this.jsoneditor.expandRefs(schema);
      if (schema.headerTemplate) {
        var header_template = this.jsoneditor.compileTemplate(
          this.translateProperty(schema.headerTemplate),
          this.template_engine
        );
        this.rows[i].tab_text.textContent = header_template({ self: value, i0: i, i1: i + 1 });
      } else {
        this.rows[i].tab_text.textContent = 'tab';
      }
    }

    addRow(value, initial, force) {
      const i = this.rows.length;
      this.rows[i] = {};
      if (i == 0 || force) {
        this.renderRow(i, value, initial);
      }
      this.rows[i].tab_text = document.createElement('span');
      this.updateTabTextContent(i, value);
      this.rows[i].path = `${this.path}.${i}`;
      this.rows[i].tab = this.theme.getTab(
        this.rows[i].tab_text,
        this.getValidId(this.rows[i].path)
      );
      this.theme.addTab(this.tabs_holder, this.rows[i].tab);
      this.rows[i].tab.addEventListener('click', e => {
        if (!this.rows[i].has_editor) {
          this.renderRow(i, this.valueToSet[i], true);
        }
        this.active_tab = this.rows[i].tab;
        this.refreshTabs(true);
        this.refreshTabs();
        e.preventDefault();
        e.stopPropagation();
      });
      return this.rows[i];
    }

    _createAddRowButton() {
      const button = this.getButton(this.getItemTitle(), 'add', 'button_add_row_title', [
        this.getItemTitle(),
      ]);
      button.classList.add('json-editor-btntype-add');
      button.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        const i = this.rows.length;
        let editor;
        if (this.row_cache[i]) {
          editor = this.rows[i] = this.row_cache[i];
          this.rows[i].setValue(this.rows[i].getDefault(), true);
          this.rows[i].container.style.display = '';
          if (this.rows[i].tab) this.rows[i].tab.style.display = '';
          this.rows[i].register();
        } else {
          editor = this.addRow([], true, true);
        }
        this.active_tab = this.rows[i].tab;
        this.refreshTabs(true);
        this.refreshTabs();
        this.refreshValue();
        this.onChange(true);
        this.jsoneditor.trigger('addRow', editor);
      });
      this.controls.appendChild(button);
      return button;
    }

    _createMoveButton(i, holder, name, title, step) {
      const button = this.getButton('', name, title);
      button.classList.add(name, 'json-editor-btntype-move');
      button.setAttribute('data-i', i);
      button.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        const i = e.currentTarget.getAttribute('data-i') * 1;

        const rows = this.getValue();
        if (step == 0 || (step < 0 && i <= 0) || (step > 0 && i >= rows.length - 1)) return;
        const newIndex = i + step;
        const tmp = rows[newIndex];
        rows[newIndex] = rows[i];
        rows[i] = tmp;

        this.setValue(rows);
        this.active_tab = this.rows[newIndex].tab;
        if (!this.rows[newIndex].has_editor) {
          this.renderRow(newIndex, rows[newIndex], true);
          this.refreshTabs(true);
        }
        this.refreshTabs();
        this.onChange(true);
        this.jsoneditor.trigger('moveRow', this.rows[newIndex]);
      });

      if (holder) {
        holder.appendChild(button);
      }
      return button;
    }

    _createMoveUpButton(i, holder) {
      return this._createMoveButton(i, holder, 'moveup', 'button_move_up_title', -1);
    }

    _createMoveDownButton(i, holder) {
      return this._createMoveButton(i, holder, 'movedown', 'button_move_down_title', 1);
    }

    _createDeleteButton(i, holder) {
      const button = this.getButton(this.getItemTitle(), 'delete', 'button_delete_row_title', [
        this.getItemTitle(),
      ]);
      button.classList.add('delete', 'json-editor-btntype-delete');
      button.setAttribute('data-i', i);
      button.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();

        if (!this.askConfirmation()) {
          return false;
        }

        const i = e.currentTarget.getAttribute('data-i') * 1;
        const newval = this.getValue().filter((row, j) => j !== i);
        const editor = this.rows[i];

        var newTabIndex = -1;
        if (this.rows[i]) {
          newTabIndex = i;
        } else if (this.rows[i - 1]) {
          newTabIndex = i - 1;
        }

        if (newTabIndex >= 0) {
          this.active_tab = this.rows[newTabIndex].tab;
          if (!this.rows[newTabIndex].has_editor) {
            this.renderRow(newTabIndex, this.valueToSet[newTabIndex], true);
          }
          this.refreshTabs(true);
          this.refreshTabs();
        }
        this.setValue(newval);
        this.onChange(true);
        this.jsoneditor.trigger('deleteRow', editor);
      });

      if (holder) {
        holder.appendChild(button);
      }
      return button;
    }

    showValidationErrors(errors) {
      /* Get all the errors that pertain to this editor */
      const myErrors = [];
      const otherErrors = [];
      errors.forEach(error => {
        if (error.path === this.path) {
          myErrors.push(error);
        } else {
          otherErrors.push(error);
        }
      });

      /* Show errors for this editor */
      if (this.error_holder) {
        if (myErrors.length) {
          this.error_holder.innerHTML = '';
          this.error_holder.style.display = '';
          myErrors.forEach(error => {
            this.error_holder.appendChild(this.theme.getErrorMessage(error.message));
          });
          /* Hide error area */
        } else {
          this.error_holder.style.display = 'none';
        }
      }

      /* Show errors for child editors */
      this.rows.forEach(row => row.has_editor && row.showValidationErrors(otherErrors));
    }
  };
}

export default makeLazyTabsArrayEditor;
