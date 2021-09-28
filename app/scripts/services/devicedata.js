class Device {
  constructor(id) {
    this.id = id;
    this.name = id;
    this.cellIds = [];
    this._nameTranslations = {};
    this.explicit = false;
  }

  getName(lang) {
    if (this._nameTranslations.hasOwnProperty(lang)) {
      return this._nameTranslations[lang];
    }
    if (this._nameTranslations.hasOwnProperty("en")) {
      return this._nameTranslations["en"];
    }
    return this.name;
  }

  // meta must be a string with JSON
  // {
  //   title: {
  //    en: ...,
  //    ru: ...,
  //    ...
  //  }
  // }
  setMeta(meta) {
    this._nameTranslations = JSON.parse(meta).title || {};
  }
}

function deviceDataService(mqttClient) {
  'ngInject';

  var devices = {}, cells = {};

  var cellTypeMap = {
    "text": {
      valueType: "string",
      units: "",
      readOnly: true,
      displayType: "text"
    },
    "switch": {
      valueType: "boolean",
      units: "",
      readOnly: false,
      displayType: "switch"
    },
    "wo-switch": {
      valueType: "boolean",
      units: "",
      readOnly: false,
      displayType: "switch"
    },
    "alarm": {
      valueType: "boolean",
      units: "",
      readOnly: true,
      displayType: "alarm"
    },
    "pushbutton": {
      valueType: "pushbutton",
      units: "",
      readOnly: false,
      displayType: "button"
    },
    "temperature": {
      valueType: "number",
      units: "°C",
      readOnly: true,
      displayType: "value"
    },
    "rel_humidity": {
      valueType: "number",
      units: "%, RH",
      readOnly: true,
      displayType: "value"
    },
    "atmospheric_pressure": {
      valueType: "number",
      units: "units.millibar",
      readOnly: true,
      displayType: "value"
    },
    "rainfall": {
      valueType: "number",
      units: "units.mm-h",
      readOnly: true,
      displayType: "value"
    },
    "wind_speed": {
      valueType: "number",
      units: "units.m-s",
      readOnly: true,
      displayType: "value"
    },
    "power": {
      valueType: "number",
      units: "units.w",
      readOnly: true,
      displayType: "value"
    },
    "power_consumption": {
      valueType: "number",
      units: "units.kwh",
      readOnly: true,
      displayType: "value"
    },
    "voltage": {
      valueType: "number",
      units: "units.v",
      readOnly: true,
      displayType: "value"
    },
    "water_flow": {
      valueType: "number",
      units: "units.m3-h",
      readOnly: true,
      displayType: "value"
    },
    "water_consumption": {
      valueType: "number",
      units: "units.m3",
      readOnly: true,
      displayType: "value"
    },
    "heat_power": {
      valueType: "number",
      units: "units.gcal-h",
      readOnly: true,
      displayType: "value"
    },
    "heat_energy": {
      valueType: "number",
      units: "units-gcal",
      readOnly: true,
      displayType: "value"
    },
    "resistance": {
      valueType: "number",
      units: "units.ohm",
      readOnly: true,
      displayType: "value"
    },
    "concentration": {
      valueType: "number",
      units: "ppm",
      readOnly: true,
      displayType: "value"
    },
    "pressure": {
      valueType: "number",
      units: "units.bar",
      readOnly: true,
      displayType: "value"
    },
    "range": {
      valueType: "number",
      units: "",
      readOnly: false,
      displayType: "range"
    },
    "value": {
      valueType: "number",
      units: "",
      readOnly: true,
      displayType: "value"
    },
    "rgb": {
      valueType: "rgb",
      units: "",
      readOnly: false,
      displayType: "rgb"
    }
  };

  function splitTopic (topic) {
    return topic.substring(1).split("/");
  }

  function ensureDevice (id) {
    if (!devices.hasOwnProperty(id))
      devices[id] = new Device(id);
    return devices[id];
  }

  function maybeRemoveDevice (id) {
    if (!devices.hasOwnProperty(id))
      return;
    if (!devices[id].explicit && !devices[id].cellIds.length)
      delete devices[id];
  }

  function parseCellTopic (topic) {
    var parts = splitTopic(topic);
    ensureDevice(parts[1]);
    return parts[1] + "/" + parts[3];
  }

  function internCell (id) {
    if (cells.hasOwnProperty(id))
      return cells[id];
    var cell = new Cell(id);
    cells[id] = cell;
    return cell;
  }

  function cellFromTopic (topic) {
    return internCell(parseCellTopic(topic));
  }

  function colorChannel(value) {
    value -= 0;
    return !(value >= 0 && value <= 255) ? 0 : value;
  }

  function parseRgb (value) {
    var m = ("" + value).match(/(\d+);(\d+);(\d+)/);
    if (!m)
      return{ r: 0, g: 0, b: 0 };
    return {
      r: colorChannel(m[1]),
      g: colorChannel(m[2]),
      b: colorChannel(m[3])
    };
  }

  function formatRgb (value) {
    return [value.r, value.g, value.b].join(";");
  }

  function isRgb (value) {
    return angular.isObject(value) && ["r", "g", "b"].every(c => value.hasOwnProperty(c));
  }

  function compareCellIds (idA, idB) {
    if (!cells.hasOwnProperty(idA) || !cells.hasOwnProperty(idB))
      return 0;

    var cellA = cells[idA], cellB = cells[idB], r;
    if (cellA.order !== null)
      return cellB.order === null ? -1 : cellA.order - cellB.order;
    return cellB.order === null ? cellA._seq - cellB._seq : 1;
  }

  var nextCellSeq = 1;

  class Cell {
    constructor (id) {
      this.id = id;
      var parts = this.id.split("/");
      if (parts.length != 2)
        throw new Error("invalid cell id: " + this.id);
      this.deviceId = parts[0];
      this.controlId = parts[1];
      this.name = this.controlId;
      this.type = "incomplete";
      this._value = null;
      this._explicitUnits = "";

      this._explicitReadOnly = null;
      this.error = false;
      this.min = null;
      this.max = null;
      this.step = null;
      this.order = null;
      this._seq = nextCellSeq++;
      this._nameTranslations = {};
    }

    get value () {
      return this._value;
    }

    set value (newValue) {
      this.sendValue(newValue);
    }

    get valueType () {
      return this._typeEntry().valueType;
    }

    get displayType () {
      return this._typeEntry().displayType;
    }

    _addToDevice () {
      var devCellIds = ensureDevice(this.deviceId).cellIds;
      if (devCellIds.indexOf(this.id) < 0) {
        devCellIds.push(this.id);
        devCellIds.sort(compareCellIds);
      }
    }

    _removeFromDevice () {
      if (!devices.hasOwnProperty(this.deviceId))
        return;
      devices[this.deviceId].cellIds = devices[this.deviceId].cellIds.filter(id => id != this.id);
    }

    _setCellValue (value) {
      switch (this.valueType) {
      case "number":
        this._value = value - 0;
        break;
      case "boolean":
        this._value = typeof value == "bool" ? value : value == "1";
        break;
      case "pushbutton":
        // unsettable
        break;
      case "rgb":
        this._value = isRgb(value) ? value : parseRgb(value);
        break;
      case "string":
      default:
        this._value = "" + value;
        break;
      }
    }

    stringValue () {
      switch (this.valueType) {
      case "boolean":
        return this._value ? "1" : "0";
      case "pushbutton":
        return null;
      case "rgb":
        return isRgb(this._value) ? formatRgb(this._value) : "";
      case "number":
      case "string":
      default:
        return "" + this._value;
      }
    }

    _sendValueTopic () {
      return ["", "devices", this.deviceId, "controls", this.controlId, "on"].join("/");
    }

    _isButton () {
      return this.type == "pushbutton";
    }

    _isString () {
      return this.isComplete() && this.valueType == "string";
    }

    _typeEntry () {
      return cellTypeMap.hasOwnProperty(this.type) ? cellTypeMap[this.type] : cellTypeMap["text"];
    }

    receiveValue (newValue) {
      if (!newValue) /// ozk замена null на  '-' тут и в 342 строке
        this._value = this._isString() ? "" : '-' /*null*/; // value removed, non-pushbutton/text cell becomes incomplete
      else
        this._setCellValue(newValue);
      this._updateCompleteness();
    }

    sendValue (newValue) {
      if (!this.isComplete() || this.readOnly)
        return;
      if (newValue === "" && !this._isString())
        newValue = this._value;
      this._setCellValue(newValue);
      mqttClient.send(
        this._sendValueTopic(),
        this._isButton() ? "1" : this.stringValue(), false);
    }

    isComplete () {
      return this.type != "incomplete" && (this._isButton() || this._value !== '-' /*null*/);/// ozk замена null на  '-'
    }

    _updateCompleteness () {
      if (this.isComplete()) {
        this._addToDevice();
        return;
      }
      this._removeFromDevice();
      maybeRemoveDevice(this.deviceId);
      if (this.type == "incomplete" && this._value === null)
        delete cells[this.id];
    }

    setType (type) {
      if(type) {
        const isUnknownType = !cellTypeMap.hasOwnProperty(type)
        
        if(isUnknownType) {
          const cellValue = String(this.value).trim().replace(',', '.');
          const parsedValue = parseFloat(cellValue) || parseInt(cellValue);
          const isValueNumber = isFinite(parsedValue); // (not NaN, Infinity, -Infinity)
          const notContainOtherCharacters = cellValue.length === String(parsedValue).length;

          if(isValueNumber && notContainOtherCharacters) {
            type = "value";
          }
        }

        this.type = type;
      }
      else {
        this.type = "incomplete";
      }

      if (this._value !== null)
        this._setCellValue(this._value);
      else if (this._isString())
        this._setCellValue("");
      this._updateCompleteness();
    }

    setName (name) {
      this.name = name;
    }

    setUnits (units) {
      this._explicitUnits = units;
    }

    get units () {
      return this._explicitUnits || this._typeEntry().units || "";
    }

    get readOnly () {
      if (this._explicitReadOnly === null)
        return this._typeEntry().readOnly;
      else
        return this._explicitReadOnly;
    }

    setExplicitReadOnly (readOnly) {
      if (readOnly === null || readOnly === undefined)
        this._explicitReadOnly = null;
      else
        this._explicitReadOnly = !!readOnly;
    }

    setError (error) {
      this.error = error;
    }

    setMin (min) {
      this.min = (min == "" || min === undefined) ? null: min - 0;
    }

    setMax (max) {
      this.max = (max == "" || max === undefined) ? null : max - 0;
    }

    setStep (step) {
      this.step = (step == "" || step === undefined) ? null: step - 0;
    }

    setOrder (order) {
      this.order = order - 0;
      if (!this.isComplete())
        return;
      ensureDevice(this.deviceId).cellIds.sort(compareCellIds);
    }

    // meta must be a string with JSON
    // {
    //   title: {
    //    en: ...,
    //    ru: ...,
    //    ...
    //  },
    //  readonly: ...,
    //  type: ...,
    //  min: ...,
    //  max: ...,
    //  precision: ...,
    //  units: ...
    // }
    setMeta(meta) {
      const m = JSON.parse(meta);
      this._nameTranslations = m.title || {};
      this.setExplicitReadOnly(m.readonly);
      this.setType(m.type);
      this.setMin(m.min);
      this.setMax(m.min);
      this.setStep(m.precision);
      this.setUnits(m.units)
    }

    getName(lang) {
      if (this._nameTranslations.hasOwnProperty(lang)) {
        return this._nameTranslations[lang];
      }
      if (this._nameTranslations.hasOwnProperty("en")) {
        return this._nameTranslations["en"];
      }
      return this.name;
    }
  }

  // list of all device topics: { deviceId: [topic1, topic2, ... ] }
  var allDevicesTopics = {};

  // method to comparing real topic ('/devices/deviceId/controls/controlId/meta/name')
  // and topicExpression - topic with characters '+' or '#' ('/devices/+/controls/#')
  const isTopicsAreEqual = (realTopic, topicExp) => {
    const reg = new RegExp(topicExp.replace(/[+]/g, '[^\/]+').replace('#', '.+') + '$');
    const result = realTopic.match(reg);

    return result ? true : false;
  }

  // add subscription to all the topics of devices
  mqttClient.addStickySubscription("/devices/#", msg => {
    const { topic, payload } = msg;

    const deviceId = splitTopic(topic)[1];

    if(!allDevicesTopics[deviceId]) {
      allDevicesTopics[deviceId] = [];
    }

    // save all received devices topics in allDevicesTopics object
    if(!allDevicesTopics[deviceId].includes(topic)) {
      allDevicesTopics[deviceId].push(topic);
    }

    const deviceTopicBase = '/devices/+';
    const cellTopicBase = deviceTopicBase + '/controls/+';

    // define handler functions for each specific topic
    const subscriptionHandlers = [
      {
        handledTopic: deviceTopicBase + '/meta',
        handler() {
          if (payload === "") {
            if (devices.hasOwnProperty(deviceId)) {
              devices[deviceId].explicit = false;
              maybeRemoveDevice(deviceId);
            }
          } else {
            var dev = ensureDevice(deviceId);
            dev.setMeta(payload);
            dev.explicit = true;
          }
        }
      },{
        handledTopic: deviceTopicBase + '/meta/name',
        handler() {
          if (payload === "") {
            if (devices.hasOwnProperty(deviceId)) {
              devices[deviceId].name = deviceId;
              devices[deviceId].explicit = false;
              maybeRemoveDevice(deviceId);
            }
          } else {
            var dev = ensureDevice(deviceId);
            dev.name = payload;
            dev.explicit = true;
          }
        }
      },{
        handledTopic: cellTopicBase,
        handler(payload) { cellFromTopic(topic).receiveValue(payload) }
      },{
        handledTopic: cellTopicBase + '/meta',
        handler(payload) { cellFromTopic(topic).setMeta(payload) }
      },{
        handledTopic: cellTopicBase + '/meta/type',
        handler(payload) { cellFromTopic(topic).setType(payload) }
      },{
        handledTopic: cellTopicBase + '/meta/name',
        handler(payload) { cellFromTopic(topic).setName(payload) }
      },{
        handledTopic: cellTopicBase + '/meta/units',
        handler(payload) { cellFromTopic(topic).setUnits(payload) }
      },{
        handledTopic: cellTopicBase + '/meta/readonly',
        handler(payload) { 
          if (payload === '') {
            cellFromTopic(topic).setExplicitReadOnly(null);
          } else if (payload == '1') {
            cellFromTopic(topic).setExplicitReadOnly(true);
          } else if (payload == '0') {
            cellFromTopic(topic).setExplicitReadOnly(false);
          } else {
            console.warn(topic + " payload is neither '0', '1' nor empty");
          }
        }
      },{
        handledTopic: cellTopicBase + '/meta/writable',
        handler(payload) {
          console.warn(topic + ": meta/writable is not supported anymore. Use meta/readonly=0");
        }
      },{
        handledTopic: cellTopicBase + '/meta/error',
        handler(payload) { cellFromTopic(topic).setError(payload) }
      },{
        handledTopic: cellTopicBase + '/meta/min',
        handler(payload) { cellFromTopic(topic).setMin(payload) }
      },{
        handledTopic: cellTopicBase + '/meta/max',
        handler(payload) { cellFromTopic(topic).setMax(payload) }
      },{
        handledTopic: cellTopicBase + '/meta/precision',
        handler(payload) { cellFromTopic(topic).setStep(payload) }
      },{
        handledTopic: cellTopicBase + '/meta/order',
        handler(payload) { cellFromTopic(topic).setOrder(payload) }
      }
    ]

    subscriptionHandlers.forEach(subscriptionHandler => {
      const { handledTopic, handler } = subscriptionHandler;
        
      if(isTopicsAreEqual(topic, handledTopic)) {
        handler(payload);
      }
    })
  });

  function filterCellIds (func) {
    var result = [];
    Object.keys(devices).sort().forEach(devId => {
      var devCellIds = devices[devId].cellIds;
      if (func)
        devCellIds = devCellIds.filter(id => func(cells[id]));
      result = result.concat(devCellIds);
    });
    return result;
  }

  var fakeCell = new Cell("nosuchdev/nosuchcell");

  class CellProxy {
    constructor (id, extra = {}) {
      this.id = id;
      this.extra = extra;
    }

    gotCell () {
      return cells.hasOwnProperty(this.id);
    }

    get cell () {
      return this.gotCell () ? cells[this.id] : fakeCell;
    }

    isComplete () {
      return this.gotCell() && this.cell.isComplete();
    }

    sendValue (newValue) {
      if (this.gotCell())
        this.cell.sendValue(newValue);
    }

    get value () { return this.cell.value; }
    set value (newValue) {
      // undefined comes from control values that didn't pass validation
      if (newValue !== undefined)
        this.cell.value = newValue;
    }

    get type () { return this.cell.type; }
    get units () { return this.cell.units; }
    get readOnly () { return this.cell.readOnly; }
    get error () { return this.cell.error; }
    get min () { return this.cell.min; }
    get max () { return this.cell.max; }
    get step () { return this.cell.step; }
    get valueType () { return this.cell.valueType; }
    get displayType () { return this.cell.displayType; }
    get order () { return this.cell.order; }
    get deviceId () { return this.id.split("/")[0]; }
    get controlId () { return this.id.split("/")[1]; }

    getName (lang) { return this.cell.getName(lang); }
  }

  return {
    devices: devices,
    cells: cells,

    deleteDevice(deviceId) {
      const allDeviceTopicBases = allDevicesTopics[deviceId];

      // select topics that relate directly to the device sorted by length.
      // So, first, long device topics (meta) will be deleted, 
      // and last - the topic of the device itself
      const deviceTopics = allDeviceTopicBases
        .filter(topic => !topic.includes('controls'))
        .sort((a, b) => b.length - a.length)
      const cellsTopics = allDeviceTopicBases
        .filter(topic => !deviceTopics.includes(topic))
      // move the topics of the device to the end, so that the topics 
      // of the cells are removed first, and then the device itself  
      const allTopics = cellsTopics.concat(deviceTopics)

      allTopics.forEach(topic => {
        const payload = '';
        const retained = true;
        const qos = 2;
        mqttClient.send(topic, payload, retained, qos);
      });
    },

    getCellIds () {
      return filterCellIds();
    },

    getCellIdsByType (type) {
      return filterCellIds(cell => cell.type == type);
    },

    getCellIdsByDisplayType (displayType) {
      return filterCellIds(cell => cell.displayType == displayType);
    },

    cell (id) {
      if (!cells.hasOwnProperty(id))
        throw new Error("cell not found: " + id);
      return cells[id];
    },

    proxy (id, extra = {}) {
      return new CellProxy(id, extra);
    },

    cellTypeNames () {
      return Object.keys(cellTypeMap).sort();
    },

    cellTypesUsed () {
      var types = {};
      filterCellIds().forEach(cellId => {
        types[cells[cellId].type] = true;
      });
      return Object.keys(types).sort();
    }
  };
}

export default deviceDataService;
