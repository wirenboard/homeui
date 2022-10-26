'use strict';

import { JSONEditor } from "../../../3rdparty/jsoneditor";

// Editor for array.
// Extends tabs layout with icons fo every tab.
// "Add row" button spawn select dialog with item types.
// Can sort items.

// Additional editor options:
// "wb": {
//     "sort_by_property": "PROPERTY_NAME",  // item's property to sort array by
//     "select_label": "TEXT" // text for label in add row dialog
// }
//
// Additional item options:
// "wb": {
//     "icon": "ICON_NAME" // item's icon name
// }

function makeWbArrayEditor () {
  JSONEditor.defaults.languages.en.select_type = 'Select type'
  return class extends JSONEditor.defaults.editors["array"] {
        constructor (options, defaults) {
          super(options, defaults)
          this.schema.format = "tabs"
        }

        getItemsOptions () {
          const inc = {}
          var res = []
          this.schema.items.oneOf.forEach((el, i) => {
              var schema = this.jsoneditor.expandRefs(el)
              var title = 'Item'
              if (schema.title) {
                  title = this.translateProperty(schema.title)
              }
              if (inc[title]) {
                  title = `${title} ${inc[title]}`
                  inc[title]++
              } else {
                  inc[title] = 2
              }
              if (!this._isHidden(schema)) {
                var d = {}
                if (schema.default) {
                  d = schema.default
                } else {
                  if (this._hasOneValueRequiredStringProperty(schema)) {
                    d[schema.required[0]] = schema.properties[schema.required[0]].enum[0]
                  }
                }
                res.push({
                  'title': title,
                  'value': i,
                  'default': d
                })
              }
          })
          return res
        }

        buildAddRowDialog() {
          this.addrow_holder = this.theme.getModal()

          var row = this.theme.getGridRow()
          var column = this.theme.getGridColumn()
          this.theme.setGridColumnSize(column, 12)
          var addrow_label_text = this.translate('select_type')
          if (this._hasWbOptions(this.schema) && this.schema.options.wb.select_label) {
            addrow_label_text = this.translateProperty(this.schema.options.wb.select_label)
          }
          this.addrow_label = this.theme.getFormInputLabel(addrow_label_text, true)
          this.addrow_select = this.theme.getSelectInput(this.enum_options, false)
          this.addrow_options = this.getItemsOptions()
          this.theme.setSelectOptions(this.addrow_select, this.addrow_options.map( el => el.value), this.addrow_options.map(el => el.title))
          this.addrow_control = this.theme.getFormControl(this.addrow_label, this.addrow_select)
          column.appendChild(this.addrow_control)
          row.appendChild(column)
          this.addrow_holder.appendChild(row)

          row = this.theme.getGridRow()
          column = this.theme.getGridColumn()
          this.theme.setGridColumnSize(column, 12)
          this.addrow_dialog_controls = this.theme.getFormButtonHolder('right')
          this.addrow_save = this.getButton('button_add', 'add', 'button_add')
          this.addrow_save.classList.add('pull-right')
          this.addrow_save.classList.add('json-editor-btntype-save')
          this.addrow_save.addEventListener('click', (e) => {
            e.preventDefault()
            e.stopPropagation()
            this._addRowByType(this.addrow_options[this.addrow_select.selectedOptions[0].index].default)
            this._hideAddRowDialog()
          })
          this.addrow_cancel = this.getButton('button_cancel', 'cancel', 'button_cancel')
          this.addrow_cancel.classList.add('pull-right')
          this.addrow_cancel.classList.add('json-editor-btntype-cancel')
          this.addrow_cancel.addEventListener('click', (e) => {
            e.preventDefault()
            e.stopPropagation()
            this._hideAddRowDialog()
          })
          this.addrow_dialog_controls.appendChild(this.addrow_save)
          this.addrow_dialog_controls.appendChild(this.addrow_cancel)
          this.addrow_holder.appendChild(this.addrow_dialog_controls)
          column.appendChild(this.addrow_dialog_controls)
          row.appendChild(column)
          this.addrow_holder.appendChild(row)

          this.controls.insertBefore(this.addrow_holder, this.controls.childNodes[0])
        }

        build () {
          super.build()
          if (this.schema.items.oneOf) {
            this.buildAddRowDialog()
          }
        }

        _hideAddRowDialog () {
          this.addrow_holder.style.display = 'none'
          this.enable()
        }

        _showAddRowDialog () {
          this.addrow_holder.style.left = `${this.add_row_button.offsetLeft}px`
          this.addrow_holder.style.top = `${this.add_row_button.offsetTop + this.add_row_button.offsetHeight}px`
          this.addrow_holder.style.display = ''
          this.disable()
        }

        _createAddRowButton () {
          if (this.schema.items.oneOf) {
            const button = this.getButton(this.getItemTitle(), 'add', 'button_add_row_title', [this.getItemTitle()])
            button.classList.add('json-editor-btntype-add')
            button.addEventListener('click', (e) => {
              e.preventDefault()
              e.stopPropagation()
              this._showAddRowDialog()
            })
            this.controls.appendChild(button)
            return button
          }
          return super._createAddRowButton()
        }

        _hasWbOptions (schema) {
          return schema.options && schema.options.wb
        }

        _isHidden (item_schema) {
          return this._hasWbOptions(item_schema) && item_schema.options.wb.hide_from_selection
        }

        _hasOneValueRequiredStringProperty(schema) {
          return schema.required &&
              schema.properties &&
              schema.properties[schema.required[0]] &&
              schema.properties[schema.required[0]].enum &&
              (schema.properties[schema.required[0]].enum.length == 1)
        }

        _stableSort (arr, compare) {
          return arr.map((item, index) => ({item, index}))
                    .sort((a, b) => compare(a.item, b.item) || a.index - b.index)
                    .map(({item}) => item)
        }

        _compareBySortProp(item1, item2, prop) {
          const v1 = item1[prop] || ''
          const v2 = item2[prop] || ''
          if(v1 > v2) return 1;
          if(v1 < v2) return -1;
          return 0;
        }

        _sortArray(v) {
          if (this._hasWbOptions(this.schema) && this.schema.options.wb.sort_by_property) {
            const prop = this.schema.options.wb.sort_by_property
            v = this._stableSort(v, (item1 , item2) => {
              return this._compareBySortProp(item1, item2, prop)
            })
          }
          return v
        }

        _addRowByType (value) {
          const i = this.rows.length
          let editor
          if (this.row_cache[i]) {
            editor = this.rows[i] = this.row_cache[i]
            this.rows[i].setValue(value, true)
            this.rows[i].container.style.display = ''
            if (this.rows[i].tab) this.rows[i].tab.style.display = ''
            this.rows[i].register()
          } else {
            editor = this.addRow(value, true)
          }
          this.refreshValue()
          if (this._hasWbOptions(this.schema) && this.schema.options.wb.sort_by_property) {
            var v = this.getValue()
            const valueToReplace = v[this.rows.length - 1]
            const prop = this.schema.options.wb.sort_by_property
            var index = v.findIndex(item => this._compareBySortProp(item, valueToReplace, prop) == 1)
            if (index != -1) {
              v.splice(index, 0, valueToReplace)
              v.pop()
              this.setValue(v)
            } else {
              index = this.rows.length - 1
            }
            this.active_tab = this.rows[index].tab
            this.refreshTabs()
          } else {
            this.active_tab = this.rows[i].tab
            this.refreshTabs()
            this.onChange(true)
            this.jsoneditor.trigger('addRow', editor)
          }
        }

        setValue(value, initial) {
          super.setValue(this._sortArray(value), initial)
        }

        addRow (value, initial) {
          const i = this.rows.length
          var row = super.addRow(value, initial)
          if (this.tabs_holder && this.theme.setTabIcon && this.schema.items.oneOf) {
            const item_schema = this.rows[i].editors[this.rows[i].type].schema
            this.rows[i].icon = document.createElement('i')
            if (this._hasWbOptions(item_schema) && item_schema.options.wb.icon) {
              const iconclass = this.iconlib.getIconClass(item_schema.options.wb.icon)
              if (!iconclass) {
                this.rows[i].icon.style.display = 'none'
              } else {
                this.rows[i].icon.classList.add(...iconclass.split(' '))
              }
            } else {
              this.rows[i].icon.style.display = 'none'
            }
            this.theme.setTabIcon(this.rows[i].tab, this.rows[i].icon)
          }
          return row
        }

        refreshTabs (refreshHeaders) {
          this.rows.forEach(row => {
            if (!row.tab) return
      
            if (refreshHeaders) {
              row.tab_text.textContent = row.getHeaderText()
              if (row.icon && this.schema.items.oneOf) {
                const item_schema = row.editors[row.type].schema
                if (item_schema.options && item_schema.options.wb && item_schema.options.wb.icon) {
                  const iconclass = this.iconlib.getIconClass(item_schema.options.wb.icon)
                  if (!iconclass) {
                    row.icon.style.display = 'none'
                  } else {
                    row.icon.removeAttribute('class')
                    row.icon.classList.add(...iconclass.split(' '))
                    row.icon.style.display = ''
                  }
                } else {
                  row.icon.style.display = 'none'
                }
              }
            } else if (row.tab === this.active_tab) {
              this.theme.markTabActive(row)
            } else {
              this.theme.markTabInactive(row)
            }
          })
        }

        enable () {
          super.enable()
          if (this.rows) {
            this.rows.forEach(row => {
              if (row.switcher) {
                row.switcher.disabled = true
              }
            })
          }
        }
    }
}

export default makeWbArrayEditor