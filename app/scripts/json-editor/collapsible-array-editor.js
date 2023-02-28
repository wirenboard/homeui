'use strict';

import { JSONEditor } from "../../3rdparty/jsoneditor";

// Editor for array.
// Expects list layout.
// Has additional "Collapse all items" button
// To get full functionality item editors must have expandEditor and collapseEditor functions
function makeCollapsibleArrayEditor () {
  JSONEditor.defaults.languages.en.collapse_all = 'Collapse all items'
  return class extends JSONEditor.defaults.editors["array"] {
        build () {
            super.build()
            this.collapse_all_button = this._createCollapseAllButton()
        }

        setupButtons (minItems) {
            if (this.value.length) {
              this.collapse_all_button.style.display = ''
            } else {
              this.collapse_all_button.style.display = 'none'
            }
            return super.setupButtons(minItems);
        }

        _createCollapseAllButton () {
            const button = this.getButton(this.translate('collapse_all'), 'expand', 'button_collapse')
            button.classList.add('json-editor-btntype-toggle')
            button.addEventListener('click', (e) => {
                e.preventDefault()
                e.stopPropagation()
                this.rows.forEach(row => {
                    if (row.collapseEditor) {
                        row.collapseEditor()
                    }
                })
            })

            this.controls.appendChild(button)
            return button
        }

        _createAddRowButton () {
          const button = this.getButton(this.getItemTitle(), 'add', 'button_add_row_title', [this.getItemTitle()])
          button.classList.add('json-editor-btntype-add')
          button.addEventListener('click', (e) => {
            e.preventDefault()
            e.stopPropagation()
            var value = this.getValue()
            const collapsedState = this.rows.map(ed => ed.collapsed)
            collapsedState.unshift(false);

            const i = this.rows.length
            if (this.row_cache[i]) {
              this.rows[i] = this.row_cache[i]
              this.rows[i].container.style.display = ''
              if (this.rows[i].tab) this.rows[i].tab.style.display = ''
              this.rows[i].register()
            } else {
              this.addRow()
            }
            value.unshift(this.rows[0].getDefault())
            this.active_tab = this.rows[0].tab
            this.setValue(value, true)
            this._restoreCollapsedState(collapsedState);
            this.jsoneditor.trigger('addRow', this.rows[0])
          })
          this.controls.appendChild(button)
          return button
        }

        _createDeleteButton (i, holder) {
          const button = this.getButton('', 'delete', 'button_delete_row_title', [this.getItemTitle()])
          button.classList.add('delete', 'json-editor-btntype-delete')
          button.setAttribute('data-i', i)
          button.addEventListener('click', e => {
            e.preventDefault()
            e.stopPropagation()
      
            if (!this.askConfirmation()) {
              return false
            }
      
            const i = e.currentTarget.getAttribute('data-i') * 1
            const collapsedState = this.rows.map(ed => ed.collapsed).filter((ed, j) => j !== i)
            const newval = this.getValue().filter((row, j) => j !== i)

            const editor = this.rows[i]

            this.setValue(newval)
            this._restoreCollapsedState(collapsedState);
            this.onChange(true)
            this.jsoneditor.trigger('deleteRow', editor)
          })
      
          if (holder) {
            holder.appendChild(button)
          }
          return button
        }

        _createCopyButton (i, holder) {
          const button = this.getButton('', 'copy', 'button_copy_row_title', [this.getItemTitle()])
          button.classList.add('copy', 'json-editor-btntype-copy')
          button.setAttribute('data-i', i)
          button.addEventListener('click', e => {
            var value = this.getValue()
            e.preventDefault()
            e.stopPropagation()
            const i = e.currentTarget.getAttribute('data-i') * 1

            const collapsedState = this.rows.map(ed => ed.collapsed)
            collapsedState.splice(i, 0, collapsedState[i])
            value.splice(i, 0, value[i])
      
            this.setValue(value)
            this._restoreCollapsedState(collapsedState);
            this.refreshValue(true)
            this.onChange(true)
          })
      
          holder.appendChild(button)
          return button
        }

        _restoreCollapsedState(collapsedState) {
          this.rows.forEach((ed, i) => {
            if (collapsedState[i]) {
              if (ed.collapseEditor) {
                ed.collapseEditor()
              }
            } else {
              if (ed.expandEditor) {
                ed.expandEditor()
              }
            }
          })
        }
    }
}

export default makeCollapsibleArrayEditor