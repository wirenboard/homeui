'use strict';

import angular from "angular";
import { JSONEditor } from "../../../3rdparty/jsoneditor";

class Editor {
    constructor(editor, group, isChannel) {
        this.editor = editor
        this.isEnabled = true
        this.isChannel = isChannel
        this.group = group
    }

    enable() {
        this.isEnabled = true
        if (!this.editor.schema.options || !this.editor.schema.options.hidden) {
            this.editor.container.style.display = ''
        }
        if (this.group) {
            if (this.isChannel) {
                this.group.onChannelEnabled()
            } else {
                this.group.onParamEnabled()
            }
        }
    }

    disable() {
        this.isEnabled = false
        this.editor.container.style.display = 'none'
        if (this.group) {
            if (this.isChannel) {
                this.group.onChannelDisabled()
            } else {
                this.group.onParamDisabled()
            }
        }
    }

    updateState(paramNames, paramValues) {
        if (!this.editor.schema.group) {
            return false
        }
        var enable = this.shouldEnable(paramNames, paramValues)
        if (enable == this.isEnabled) {
            return false
        }
        if (enable) {
            this.enable();
        } else {
            this.disable()
        }
        return true
    }

    shouldEnable(paramNames, paramValues) {
        if (!this.editor.schema.condition) {
            return true
        }
        try {
            return new Function(paramNames, 'return ' + this.editor.schema.condition + ';').apply(null, paramValues)
        } catch (e) {
            return false
        }
    }
}

class Group {
    constructor(schema) {
        this.schema = schema,
        this.parentGroup = undefined,
        this.subgroups = {
            groups: [],
            enabledCount: 0
        },
        this.isEnabled = true,
        this.isTab = false,
        this.panel = undefined,
        this.header = undefined,
        this.channels = {
            table: undefined,
            editors: [],
            enabledCount: 0
        },
        this.params = {
            editors: [],
            enabledCount: 0
        }
    }

    updateState() {
        var oldState = this.isEnabled
        this.isEnabled = (this.params.enabledCount != 0) ||
                         (this.channels.enabledCount != 0) ||
                         (this.subgroups.enabledCount != 0)
        if (this.isEnabled == oldState || !this.parentGroup) {
            return
        }
        if (this.isEnabled) {
            this.parentGroup.onSubgroupEnabled()
            if (!this.isTab) {
                this.panel.style.display = ''
                this.header.style.display = ''
            }
        } else {
            this.parentGroup.onSubgroupDisabled()
            if (!this.isTab) {
                this.panel.style.display = 'none'
                this.header.style.display = 'none'
            }
        }
    }

    addParam(editor) {
        this.params.editors.push(editor)
        ++this.params.enabledCount
    }

    addChannel(editor) {
        this.channels.editors.push(editor)
        ++this.channels.enabledCount
    }

    addSubgroup(group) {
        this.subgroups.groups.push(group)
        ++this.subgroups.enabledCount
    }

    onParamDisabled() {
        --this.params.enabledCount
        this.updateState()
    }

    onParamEnabled() {
        ++this.params.enabledCount
        this.updateState()
    }

    onChannelDisabled() {
        --this.channels.enabledCount
        if (this.channels.enabledCount == 0 && this.channels.table) {
            this.channels.table.style.display = 'none'
        }
        this.updateState()
    }

    onChannelEnabled() {
        ++this.channels.enabledCount
        if (this.channels.enabledCount != 0 && this.channels.table) {
            this.channels.table.style.display = ''
        }
        this.updateState()
    }

    onSubgroupDisabled() {
        --this.subgroups.enabledCount
        this.updateState()
    }

    onSubgroupEnabled() {
        ++this.subgroups.enabledCount
        this.updateState()
    }
}

class Tab
{
    constructor(tabElement, contentElement, group) {
        this.hasEditors = false
        this.tab = tabElement
        this.container = contentElement
        this.group = group
    }
}

function makeGroupsEditor () {
    JSONEditor.defaults.languages.en.channel = 'Channel'
    return class extends JSONEditor.AbstractEditor {
        constructor (options, defaults) {
            super(options, defaults)
            this.MAX_GRID_COLUMNS = 12
        }

        getDefault () {
            return this.schema.default || {}
          }

        register () {
            super.register()
            if (this.editors) {
                Object.entries(this.editors).forEach(([key, ed]) => ed.editor.register())
            }
        }

        unregister () {
            super.unregister()
            if (this.editors) {
                Object.entries(this.editors).forEach(([key, ed]) => ed.editor.unregister())
            }
        }

        preBuildGroups() {
            this.schema.options.wb.groups.forEach(groupSchema => {
                var group = this.groups.get(groupSchema.id)
                if (group) {
                    group.schema = groupSchema
                } else {
                    group = new Group(groupSchema)
                    this.groups.set(groupSchema.id, group)
                }
                if (groupSchema.group) {
                    var parentGroup = this.groups.get(groupSchema.group)
                    if (!parentGroup) {
                        parentGroup = new Group()
                        this.groups.set(groupSchema.group, parentGroup)
                    }
                    parentGroup.addSubgroup(group)
                    group.parentGroup = parentGroup
                } else {
                    group.isTab = true
                }
            })
        }

        preBuild() {
            this.tabs = []
            this.editors = {}
            this.groups = new Map()
            if (this.schema.options && this.schema.options.wb && this.schema.options.wb.groups) {
                this.preBuildGroups()
            }
        }

        createTabs() {
            this.groups.forEach(group => {
                if (group.isTab) {
                    if (!this.tabs_holder) {
                        const grid_row = this.theme.getGridRow()
                        this.tabs_holder = this.theme.getTabHolder(this.getValidId(this.path))
                        grid_row.appendChild(this.tabs_holder)
                        this.theme.setGridColumnSize(this.tabs_holder, this.MAX_GRID_COLUMNS)
                        this.row_holder = this.theme.getTabContentHolder(this.tabs_holder)
                        this.editor_holder.appendChild(grid_row)
                    }
                    this.addTab(group)
                }
            })
            if (this.tabs.length) {
                this.activeTab = this.tabs[0].tab
            }
            this.refreshTabs()
        }

        build () {
            this.error_holder = document.createElement('div')
            this.container.appendChild(this.error_holder)
            this.editor_holder = document.createElement('div')
            this.container.appendChild(this.editor_holder)
            
            this.controls = this.theme.getButtonHolder()
            this.controls.classList.add('je-object__controls')
            /* Object Properties Button */
            this.addproperty_button = this.getButton('properties', 'edit_properties', 'button_object_properties')
            this.addproperty_button.classList.add('json-editor-btntype-properties')
            this.addproperty_button.addEventListener('click', (e) => {
                e.preventDefault()
                e.stopPropagation()
                this.toggleAddProperty()
            })
            this.controls.appendChild(this.addproperty_button)
            /* Manage Properties modal */
            this.addproperty_holder = this.theme.getModal()
            this.addproperty_list = document.createElement('div')
            this.addproperty_list.classList.add('property-selector')
            this.addproperty_holder.appendChild(this.addproperty_list)

            this.controls.insertBefore(this.addproperty_holder, this.controls.childNodes[1])

            this.createTopLevelEditors(this.editor_holder)
            this.createChannels(this.editor_holder)
            this.createTabs()
            this.updateEditorsState()
            this.refreshAddProperties()
        }

        refreshAddProperties () {
            if (this.addproperty_checkboxes) {
                this.addproperty_list.innerHTML = ''
            }
            this.addproperty_checkboxes = {}

            Object.entries(this.editors).forEach(([key, ed]) => {
                if (!ed.editor.schema.options || (!ed.editor.schema.options.hidden && !ed.isChannel)) {
                    this.addPropertyCheckbox(key)
                }
            })
        }

        insertPropertyControlUsingPropertyOrder(property, control, container) {
            var propertyOrder
            if (this.schema.properties[property]) {
                propertyOrder = this.schema.properties[property].propertyOrder
            }
            if (typeof propertyOrder !== 'number') {
                propertyOrder = 1000
            }
            control.propertyOrder = propertyOrder
        
            for (var i = 0; i < container.childNodes.length; i++) {
                const child = container.childNodes[i]
                if (control.propertyOrder < child.propertyOrder) {
                    this.addproperty_list.insertBefore(control, child)
                    control = null
                    break
                }
            }
            if (control) {
                this.addproperty_list.appendChild(control)
            }
        }

        showAddProperty () {
            if (!this.addproperty_holder) return
        
            /* Position the form directly beneath the button */
            this.addproperty_holder.style.left = `${this.addproperty_button.offsetLeft}px`
            this.addproperty_holder.style.top = `${this.addproperty_button.offsetTop + this.addproperty_button.offsetHeight}px`
        
            /* Disable the rest of the form while editing JSON */
            this.disable()
        
            this.adding_property = true
            this.addproperty_button.disabled = false
            this.addproperty_holder.style.display = ''
            this.refreshAddProperties()
        }
        
        hideAddProperty () {
            if (!this.addproperty_holder) return
            if (!this.adding_property) return
        
            this.addproperty_holder.style.display = 'none'
            this.enable()
        
            this.adding_property = false
        }

        toggleAddProperty () {
            if (this.adding_property) this.hideAddProperty()
            else this.showAddProperty()
        }

        addPropertyCheckbox(key) {
            var labelText

            const checkbox = this.theme.getCheckbox()
            checkbox.style.width = 'auto'
        
            if (this.schema.properties[key] && this.schema.properties[key].title) {
                labelText = this.translateProperty(this.schema.properties[key].title)
            } else {
                labelText = key
            }

            const label = this.theme.getCheckboxLabel(labelText)
        
            const control = this.theme.getFormControl(label, checkbox)
            control.style.paddingBottom = control.style.marginBottom = control.style.paddingTop = control.style.marginTop = 0
            control.style.height = 'auto'
            this.insertPropertyControlUsingPropertyOrder(key, control, this.addproperty_list)
            checkbox.checked = this.editors[key].isEnabled
            checkbox.addEventListener('change', () => {
                if (checkbox.checked) {
                    this.editors[key].enable()
                } else {
                    this.editors[key].disable()
                }
                this.onChange(true)
            })
            this.addproperty_checkboxes[key] = checkbox
            return checkbox
        }

        setValue(value) {
            this.value = angular.extend({}, value)
            Object.entries(value).forEach(([key, val]) => {
                var ed = this.editors[key]
                if (ed && ed.editor) {
                    ed.editor.setValue(val)
                    ed.enable()
                }
            })
            this.updateEditorsState()
            this.onChange()
        }

        addTab (group) {
            var tabText = document.createElement('span')
            tabText.textContent = this.translateProperty(group.schema.title)
            var tab = new Tab(this.theme.getTab(tabText, this.getValidId(this.path + '.' + group.schema.id)),
                              this.theme.getTabContent(),
                              group)
            this.tabs.push(tab)
            this.row_holder.appendChild(tab.container)
            this.theme.addTab(this.tabs_holder, tab.tab)
            tab.tab.addEventListener('click', (e) => {
                this.activeTab = tab.tab
                this.refreshTabs()
                e.preventDefault()
                e.stopPropagation()
            })
        }

        storeEditor(key, editor, group, isChannel) {
            var ed = new Editor(editor, group, isChannel)
            this.editors[key] = ed
            return ed
        }

        channelIsInGroup(schema, group) {
            if (group) {
                return schema.group == group.schema.id && schema.channel
            }
            return !schema.group && schema.channel
        }

        createChannels(container, group) {
            const schemas = Object.entries(this.schema.properties)
                                  .filter(([key, schema]) => this.channelIsInGroup(schema, group))
            if (schemas.length) {
                var table = this.theme.getTable()
                container.appendChild(table)
                var thead = this.theme.getTableHead()
                table.appendChild(thead)
                var header_row = this.theme.getTableRow()
                thead.appendChild(header_row)
                var row_holder = this.theme.getTableBody()
                table.appendChild(row_holder)
                if (group) {
                    group.channels.table = table
                }

                schemas.forEach(([key, schema]) => {
                    const editorClass = this.jsoneditor.getEditorClass(schema, this.jsoneditor)
                    var row = row_holder.appendChild(this.theme.getTableRow())
                    const ret = this.jsoneditor.createEditor(editorClass, {
                      jsoneditor: this.jsoneditor,
                      schema: schema,
                      container: row,
                      path: `${this.path}.${key}`,
                      parent: this,
                      compact: true,
                      table_row: true
                    })
                    ret.preBuild()
                    var cell = this.theme.getTableCell()
                    cell.style.verticalAlign = 'middle'
                    cell.textContent = ret.getTitle()
                    row.appendChild(cell)
                    ret.build()
                    ret.postBuild()
                    var editor = this.storeEditor(key, ret, group, true)
                    if (group) {
                        group.addChannel(editor)
                    }
                    if (!header_row.hasChildNodes()) {
                        header_row.appendChild(this.theme.getTableHeaderCell(this.translate('channel')))
                        const ce = ret.getChildEditors()
                        const order = ret.property_order || Object.keys(ce)
                        for (let i = 0; i < order.length; i++) {
                            header_row.appendChild(this.theme.getTableHeaderCell(ce[order[i]].getTitle()))
                        }
                    }
                })
            }
        }

        createTopLevelEditors(container) {
            const schemas = Object.entries(this.schema.properties)
                                  .filter(([key, schema]) => (!schema.group && !schema.channel))
            schemas.sort(function(a, b) { return a[1].propertyOrder > b[1].propertyOrder})
            schemas.forEach(([key, schema]) => {
                var editorHolder = document.createElement('div')
                container.appendChild(editorHolder)
                const editorClass = this.jsoneditor.getEditorClass(schema)
                const ret = this.jsoneditor.createEditor(editorClass, {
                    jsoneditor: this.jsoneditor,
                    schema,
                    container: editorHolder,
                    path: `${this.path}.${key}`,
                    parent: this,
                    required: true
                })
                ret.preBuild()
                ret.build()
                ret.postBuild()
                ret.setOptInCheckbox(ret.header)
                var editor = this.storeEditor(key, ret, undefined, false)
                if (schema.options && schema.options.hidden) {
                    ret.container.style.display = 'none'
                }
                if (!this.schema.required || !this.schema.required.includes(key)) {
                    editor.disable()
                }
            })
        }

        createEditors(container, group) {
            const schemas = Object.entries(this.schema.properties)
                                  .filter(([key, schema]) => schema.group == group.schema.id && !schema.channel)
            schemas.sort(function(a, b) { return a[1].propertyOrder > b[1].propertyOrder})
            var createRow = true
            var rowHolder
            schemas.forEach(([key, schema]) => {
                var editorHolder = document.createElement('div')
                if (createRow) {
                    rowHolder = this.theme.getGridRow()
                    container.appendChild(rowHolder)
                }
                createRow = !createRow
                this.theme.setGridColumnSize(editorHolder, this.MAX_GRID_COLUMNS/2)
                rowHolder.appendChild(editorHolder)
                const editorClass = this.jsoneditor.getEditorClass(schema)
                const ret = this.jsoneditor.createEditor(editorClass, {
                    jsoneditor: this.jsoneditor,
                    schema,
                    container: editorHolder,
                    path: `${this.path}.${key}`,
                    parent: this,
                    required: true
                })
                ret.preBuild()
                ret.build()
                ret.postBuild()
                ret.setOptInCheckbox(ret.header)
                group.addParam(this.storeEditor(key, ret, group, false))
            })
            this.updateEditorsState()
        }

        createGroups(container, group) {
            if (!group) {
                return
            }
            this.createEditors(container, group)
            this.createChannels(container, group)
            group.subgroups.groups.forEach(subgroup => {
                subgroup.header = document.createElement('label')
                subgroup.header.textContent = subgroup.schema.title
                container.appendChild(subgroup.header)
                subgroup.panel = this.theme.getIndentedPanel()
                container.appendChild(subgroup.panel)
                this.createGroups(subgroup.panel, subgroup)
            })
        }

        updateEditorsState() {
            var hasChanges = true
            for (var cycles = 0; hasChanges && cycles < 10; ++cycles) {
                var paramValues = []
                var paramNames = []
                Object.entries(this.editors)
                      .filter(([key, ed]) => ed.isEnabled && !ed.isChannel && ed.editor.isActive())
                      .forEach(([key, ed]) => {
                          paramNames.push(key)
                          paramValues.push(ed.editor.getValue())
                      })
                paramNames = paramNames.join(',')
                hasChanges = Object.entries(this.editors).reduce((hasChanges, [key, editor]) => {
                    return hasChanges || editor.updateState(paramNames, paramValues)
                }, false)
            }
        }

        change () {
            this.updateEditorsState()
            this.value = {}
            Object.entries(this.editors)
                  .filter(([key, ed]) => ed.isEnabled && ed.editor.isActive())
                  .forEach(([key, ed]) => this.value[key] = ed.editor.getValue())
            super.change()
        }

        refreshTabs() {
            this.tabs.forEach(tab => {
                if (!tab.tab) return
                if (tab.tab === this.activeTab) {
                    if (!tab.hasEditors) {
                        this.createGroups(tab.container, tab.group)
                        tab.hasEditors = true
                    }
                    this.theme.markTabActive(tab)
                } else {
                  this.theme.markTabInactive(tab)
                }
            })
        }

        destroy() {
            if (this.editor_holder) this.editor_holder.innerHTML = ''
            if (this.error_holder && this.error_holder.parentNode) this.error_holder.parentNode.removeChild(this.error_holder)
            this.editors = null
            if (this.editor_holder && this.editor_holder.parentNode) this.editor_holder.parentNode.removeChild(this.editor_holder)
            this.editor_holder = null
            super.destroy()
        }

        getValue () {
            Object.entries(this.editors).forEach(([key, ed]) => {
                if (ed.isEnabled) {
                    this.value[key] = ed.editor.getValue()
                } else {
                    delete this.value[key]
                }
            })
            return this.value
        }

        showValidationErrors (errors) {
            /* Get all the errors that pertain to this editor */
            const myErrors = []
            const otherErrors = []
            errors.forEach(error => {
                if (error.path === this.path) {
                    myErrors.push(error)
                } else {
                    otherErrors.push(error)
                }
            })
        
            /* Show errors for this editor */
            if (this.error_holder) {
                if (myErrors.length) {
                    this.error_holder.innerHTML = ''
                    this.error_holder.style.display = ''
                    myErrors.forEach(error => {
                        if (error.errorcount && error.errorcount > 1) error.message += ` (${error.errorcount} errors)`
                        this.error_holder.appendChild(this.theme.getErrorMessage(error.message))
                    })
                    /* Hide error area */
                } else {
                    this.error_holder.style.display = 'none'
                }
            }

            /* Show errors for child editors */
            Object.values(this.editors).forEach(ed => {
                ed.editor.showValidationErrors(otherErrors)
            })
        }
    }
}

export default makeGroupsEditor
