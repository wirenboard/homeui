'use strict';

import { JSONEditor } from "../../../3rdparty/jsoneditor";

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
            const i = this.rows.length
            let editor
            if (this.row_cache[i]) {
              editor = this.rows[i] = this.row_cache[i]
              this.rows[i].setValue(this.rows[i].getDefault(), true)
              this.rows[i].container.style.display = ''
              if (this.rows[i].tab) this.rows[i].tab.style.display = ''
              this.rows[i].register()
            } else {
              editor = this.addRow()
            }
            if (editor.expandEditor) {
              editor.expandEditor()
              editor.container.scrollIntoView()
            }
            this.active_tab = this.rows[i].tab
            this.refreshTabs()
            this.refreshValue()
            this.onChange(true)
            this.jsoneditor.trigger('addRow', editor)
          })
          this.controls.appendChild(button)
          return button
        }

        _createDeleteButton (i, holder) {
          const button = this.getButton(this.getItemTitle(), 'delete', 'button_delete_row_title', [this.getItemTitle()])
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

            this.setValue(newval)

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

            this.onChange(true)
            this.jsoneditor.trigger('deleteRow', editor)
          })
      
          if (holder) {
            holder.appendChild(button)
          }
          return button
        }
    }
}

export default makeCollapsibleArrayEditor