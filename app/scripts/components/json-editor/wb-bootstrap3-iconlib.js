'use strict';

import { JSONEditor } from "../../../3rdparty/jsoneditor";

const glyphiconIconPrefix = 'glyphicon glyphicon-'
const glyphiconMapping = {
  collapse: 'chevron-down',
  expand: 'chevron-right',
  delete: 'trash',
  edit: 'pencil',
  add: 'plus',
  subtract: 'minus',
  cancel: 'floppy-remove',
  save: 'floppy-saved',
  moveup: 'arrow-up',
  moveright: 'arrow-right',
  movedown: 'arrow-down',
  moveleft: 'arrow-left',
  copy: 'copy',
  clear: 'remove-circle',
  time: 'time',
  calendar: 'calendar',
  edit_properties: 'list'
}

const fontawesomeMapping = {
  wifi: 'fas fa-wifi',
  ethernet: 'fas fa-network-wired',
  modem: 'fas fa-signal',
  loopback: 'fas fa-sync-alt',
  'old-settings': 'fas fa-bars',
  warning: 'fas fa-exclamation-triangle'
}

function makeWbBootstrap3Iconlib () {
  return class extends JSONEditor.AbstractIconLib {
    getIconClass (key) {
      if (!key) {
        return null
      }
      if (fontawesomeMapping[key]) {
        return fontawesomeMapping[key]
      }
      return glyphiconMapping[key] ? glyphiconIconPrefix + glyphiconMapping[key] : null
    }
  }
}

export default makeWbBootstrap3Iconlib