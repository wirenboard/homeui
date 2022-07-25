'use strict';

import { JSONEditor } from "../../../3rdparty/jsoneditor";

function makeWbBootstrap3Theme () {
  return class extends JSONEditor.defaults.themes.bootstrap3 {
    getErrorMessage (text) {
      const el = document.createElement('p')
      el.style = el.style || {}
      el.style.color = '#b94a48'
      el.appendChild(document.createTextNode(text))
      return el
    }
  }
}

export default makeWbBootstrap3Theme